import { Injectable, Inject } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { Traced } from '@myapp/observability/trace.decorator';
import { trace, context } from '@opentelemetry/api';

@Injectable()
export class OrderService {
  private readonly inventoryServiceUrl =
    process.env.INVENTORY_SERVICE_URL || 'http://localhost:3002';
  private readonly billingServiceUrl =
    process.env.BILLING_SERVICE_URL || 'http://localhost:3001';

  constructor(
    private readonly httpService: HttpService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  @Traced('OrderService.createOrder')
  async createOrder(orderData: any) {
    const span = trace.getSpan(context.active());
    const orderId = this.generateOrderId();
    
    span?.setAttributes({
      'order.id': orderId,
      'order.items_count': orderData.items?.length || 0,
    });

    this.logger.info('Starting order creation process', {
      orderId,
      itemsCount: orderData.items?.length,
    });

    try {
      // Check inventory
      const inventoryCheck = await this.checkInventory(orderData.items);
      
      if (!inventoryCheck.available) {
        this.logger.warn('Inventory not available', { orderId, inventoryCheck });
        throw new Error('Items not available in inventory');
      }

      // Process billing
      const billingResult = await this.processBilling({
        orderId,
        amount: orderData.totalAmount,
        customerId: orderData.customerId,
      });

      this.logger.info('Order created successfully', {
        orderId,
        billingTransactionId: billingResult.transactionId,
      });

      return {
        orderId,
        status: 'confirmed',
        billingTransactionId: billingResult.transactionId,
      };
    } catch (error) {
      this.logger.error('Order creation failed', {
        orderId,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  @Traced('OrderService.checkInventory')
  private async checkInventory(items: any[]) {
    const headers = this.propagateTraceContext();
    
    this.logger.debug('Checking inventory', { itemsCount: items.length });

    const response = await firstValueFrom(
      this.httpService.post(
        `${this.inventoryServiceUrl}/inventory/check`,
        { items },
        { headers },
      ),
    );

    return response.data;
  }

  @Traced('OrderService.processBilling')
  private async processBilling(billingData: any) {
    const headers = this.propagateTraceContext();
    
    this.logger.debug('Processing billing', { amount: billingData.amount });

    const response = await firstValueFrom(
      this.httpService.post(
        `${this.billingServiceUrl}/billing/charge`,
        billingData,
        { headers },
      ),
    );

    return response.data;
  }

  @Traced('OrderService.getOrder')
  async getOrder(orderId: string) {
    this.logger.info('Retrieving order', { orderId });
    
    // Simulate database call
    return {
      orderId,
      status: 'confirmed',
      createdAt: new Date(),
    };
  }

  private propagateTraceContext(): Record<string, string> {
    const span = trace.getSpan(context.active());
    const headers: Record<string, string> = {};

    if (span) {
      const spanContext = span.spanContext();
      headers['traceparent'] = `00-${spanContext.traceId}-${spanContext.spanId}-${spanContext.traceFlags.toString(16).padStart(2, '0')}`;
    }

    return headers;
  }

  private generateOrderId(): string {
    return `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

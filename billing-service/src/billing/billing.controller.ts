import { Controller, Post, Body, Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { Traced } from '@myapp/observability/trace.decorator';

@Controller('billing')
export class BillingController {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  @Post('charge')
  @Traced('BillingController.charge')
  async charge(@Body() chargeData: any) {
    this.logger.info('Processing charge', {
      orderId: chargeData.orderId,
      amount: chargeData.amount,
    });

    // Simulate payment processing
    await this.simulatePaymentGateway(chargeData);

    const transactionId = `TXN-${Date.now()}`;

    this.logger.info('Charge successful', {
      orderId: chargeData.orderId,
      transactionId,
    });

    return {
      success: true,
      transactionId,
      amount: chargeData.amount,
    };
  }

  @Traced('BillingController.simulatePaymentGateway')
  private async simulatePaymentGateway(chargeData: any): Promise<void> {
    // Simulate delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Simulate random failures (10% chance)
    if (Math.random() < 0.1) {  
      this.logger.error('Payment gateway error', {
        orderId: chargeData.orderId,
        error: 'Gateway timeout',
      });
      throw new Error('Payment gateway timeout');
    }
  }
}
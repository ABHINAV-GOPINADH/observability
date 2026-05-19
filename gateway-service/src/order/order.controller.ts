import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { OrderService } from './order.service';
import { Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

@Controller('orders')
export class OrderController {
  constructor(
    private readonly orderService: OrderService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  @Post()
  async createOrder(@Body() orderData: any) {
    this.logger.info('Creating new order', { orderData });
    return await this.orderService.createOrder(orderData);
  }

  @Get(':id')
  async getOrder(@Param('id') id: string) {
    this.logger.info('Fetching order', { orderId: id });
    return await this.orderService.getOrder(id);
  }
}
import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { HttpModule } from '@nestjs/axios';
import { WinstonModule } from 'nest-winston';
import { createLoggerConfig } from '@myapp/observability/logger.config';
import { TraceInterceptor } from '@myapp/observability/trace.interceptor';
import { OrderController } from './order/order.controller';
import { OrderService } from './order/order.service';

@Module({
  imports: [
    WinstonModule.forRoot(createLoggerConfig('gateway-service')),
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 5,
    }),
  ],
  controllers: [OrderController],
  providers: [
    OrderService,
    {
      provide: APP_INTERCEPTOR,
      useClass: TraceInterceptor,
    },
  ],
})
export class AppModule {}
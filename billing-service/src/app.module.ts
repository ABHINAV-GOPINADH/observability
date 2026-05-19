import { Module } from '@nestjs/common';
import { BillingController } from './billing/billing.controller';
import { WinstonModule } from 'nest-winston';
import { createLoggerConfig } from '@myapp/observability/logger.config';

@Module({
  imports: [
    WinstonModule.forRoot(createLoggerConfig('billing-service')),
  ],
  controllers: [BillingController],
  providers: [],
})
export class AppModule {}
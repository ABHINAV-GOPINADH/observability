import { Module } from '@nestjs/common';
import { InventoryController } from './inventory/inventory.controller';
import { WinstonModule } from 'nest-winston';
import { createLoggerConfig } from '@myapp/observability/logger.config';

@Module({
  imports: [
    WinstonModule.forRoot(createLoggerConfig('inventory-service')),
  ],
  controllers: [InventoryController],
  providers: [],
})
export class AppModule {}
import { Controller, Post, Body, Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { Traced } from '@myapp/observability/trace.decorator';

@Controller('inventory')
export class InventoryController {
  private inventory = {
    'ITEM-001': 100,
    'ITEM-002': 30,
    'ITEM-003': 0, // Out of stock
  };

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  @Post('check')
  @Traced('InventoryController.check')
  async checkInventory(@Body() checkData: { items: any[] }) {
    this.logger.info('Checking inventory', {
      itemsCount: checkData.items.length,
    });

    const unavailableItems = [];

    for (const item of checkData.items) {
      const stock = this.inventory[item.productId] || 0;
      
      this.logger.debug('Stock check', {
        productId: item.productId,
        requestedQty: item.quantity,
        availableStock: stock,
      });

      if (stock < item.quantity) {
        unavailableItems.push(item.productId);
      }
    }

    const available = unavailableItems.length === 0;

    this.logger.info('Inventory check complete', {
      available,
      unavailableItems,
    });

    return {
      available,
      unavailableItems,
    };
  }
}
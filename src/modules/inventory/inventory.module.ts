import { Module } from '@nestjs/common';
import { InventoryService } from './application/inventory.service';
import { InventoryController } from './presentation/inventory.controller';

@Module({
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}

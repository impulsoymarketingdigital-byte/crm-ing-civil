import { Module } from '@nestjs/common';
import { InventoryService } from './application/inventory.service';
import { InventoryController } from './presentation/inventory.controller';
import { InventoryRepository } from './infrastructure/inventory.repository';

@Module({
  controllers: [InventoryController],
  providers: [InventoryService, InventoryRepository],
  exports: [InventoryService],
})
export class InventoryModule {}

import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InventoryRepository } from '../infrastructure/inventory.repository';
import { CreateInventoryItemDto } from '../domain/dto/create-inventory-item.dto';
import { InventoryItemType } from '@prisma/client';

@Injectable()
export class InventoryService {
  constructor(private readonly repo: InventoryRepository) {}

  findAll(tenantId: string, type?: InventoryItemType) { return this.repo.findByTenant(tenantId, type); }

  async findOne(id: string, tenantId: string) {
    const item = await this.repo.findById(id, tenantId);
    if (!item) throw new NotFoundException('Inventory item not found');
    return item;
  }

  async create(dto: CreateInventoryItemDto) {
    const exists = await this.repo.findBySku(dto.sku, dto.tenantId);
    if (exists) throw new ConflictException(`SKU "${dto.sku}" already exists`);
    return this.repo.create(dto);
  }

  async adjustStock(id: string, tenantId: string, delta: number) {
    await this.findOne(id, tenantId);
    return this.repo.adjustStock(id, delta);
  }
}

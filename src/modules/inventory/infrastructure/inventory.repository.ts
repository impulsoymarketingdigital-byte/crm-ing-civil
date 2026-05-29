import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { InventoryItemType } from '@prisma/client';

@Injectable()
export class InventoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByTenant(tenantId: string, type?: InventoryItemType) {
    return this.prisma.inventoryItem.findMany({
      where: { tenantId, isActive: true, ...(type && { type }) },
      orderBy: { sku: 'asc' },
    });
  }

  findById(id: string, tenantId: string) {
    return this.prisma.inventoryItem.findFirst({ where: { id, tenantId } });
  }

  findBySku(sku: string, tenantId: string) {
    return this.prisma.inventoryItem.findFirst({ where: { sku, tenantId } });
  }

  create(data: object) { return this.prisma.inventoryItem.create({ data: data as any }); }

  update(id: string, data: Partial<{ name: string; costPrice: number; sellingPrice: number; quantityOnHand: number; isActive: boolean }>) {
    return this.prisma.inventoryItem.update({ where: { id }, data });
  }

  adjustStock(id: string, delta: number) {
    return this.prisma.inventoryItem.update({
      where: { id },
      data: { quantityOnHand: { increment: delta } },
    });
  }
}

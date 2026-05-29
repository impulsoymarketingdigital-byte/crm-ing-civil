import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InventoryItemType, Prisma } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { CreateInventoryItemDto } from '../domain/dto/create-inventory-item.dto';
import { UpdateInventoryItemDto } from '../domain/dto/update-inventory-item.dto';
import { StockEntryDto } from '../domain/dto/stock-entry.dto';
import { StockExitDto } from '../domain/dto/stock-exit.dto';
import type { StockValuationReport, StockValuationLine } from '../domain/interfaces/stock-valuation.interface';

// SERVICE items have no physical stock
const PHYSICAL_TYPES = new Set<InventoryItemType>([
  InventoryItemType.PRODUCT,
  InventoryItemType.RAW_MATERIAL,
  InventoryItemType.FINISHED_GOOD,
]);

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  // ══════════════════════════════════════════════════════════════════════════
  // Products CRUD
  // ══════════════════════════════════════════════════════════════════════════

  findAll(tenantId: string, type?: InventoryItemType) {
    return this.prisma.inventoryItem.findMany({
      where: { tenantId, isActive: true, ...(type && { type }) },
      orderBy: { sku: 'asc' },
    });
  }

  async findOne(id: string, tenantId: string) {
    const item = await this.prisma.inventoryItem.findFirst({
      where: { id, tenantId },
    });
    if (!item) throw new NotFoundException('Inventory item not found');
    return item;
  }

  async create(tenantId: string, dto: CreateInventoryItemDto) {
    const exists = await this.prisma.inventoryItem.findFirst({
      where: { sku: dto.sku, tenantId },
    });
    if (exists) throw new ConflictException(`SKU "${dto.sku}" already exists in this tenant`);

    return this.prisma.inventoryItem.create({
      data: {
        tenantId,
        sku: dto.sku,
        name: dto.name,
        description: dto.description,
        type: dto.type,
        unitOfMeasure: dto.unitOfMeasure ?? 'UNIT',
        costPrice: dto.costPrice ?? 0,
        sellingPrice: dto.sellingPrice ?? 0,
        reorderPoint: dto.reorderPoint ?? 0,
      },
    });
  }

  async update(id: string, tenantId: string, dto: UpdateInventoryItemDto) {
    await this.findOne(id, tenantId);
    return this.prisma.inventoryItem.update({
      where: { id },
      data: {
        ...(dto.name          !== undefined && { name: dto.name }),
        ...(dto.description   !== undefined && { description: dto.description }),
        ...(dto.unitOfMeasure !== undefined && { unitOfMeasure: dto.unitOfMeasure }),
        ...(dto.sellingPrice  !== undefined && { sellingPrice: dto.sellingPrice }),
        ...(dto.reorderPoint  !== undefined && { reorderPoint: dto.reorderPoint }),
        ...(dto.isActive      !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  async deactivate(id: string, tenantId: string) {
    await this.findOne(id, tenantId);
    return this.prisma.inventoryItem.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Stock Transactions
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Record a stock entry (goods received).
   *
   * Business rules:
   * 1. Only physical items (PRODUCT, RAW_MATERIAL, FINISHED_GOOD) accept stock.
   * 2. Recalculates the Weighted Average Cost (WAC):
   *      newWAC = (currentQty x currentWAC + entryQty x entryCost) / (currentQty + entryQty)
   * 3. When the item has zero stock, WAC equals the entry cost directly.
   * 4. The item update and the transaction record are written in a single
   *    database transaction to guarantee consistency.
   */
  async recordStockEntry(itemId: string, tenantId: string, dto: StockEntryDto) {
    const item = await this.findOne(itemId, tenantId);
    this.assertPhysicalItem(item.type as InventoryItemType, 'ENTRY');

    const entryQty  = InventoryService.toD(dto.quantity);
    const entryCost = InventoryService.toD(dto.unitCost);

    const newWAC = InventoryService.calculateWAC(
      item.quantityOnHand,
      item.costPrice,
      entryQty,
      entryCost,
    );
    const newQty    = item.quantityOnHand.add(entryQty);
    const totalCost = entryQty.mul(entryCost);

    return this.prisma.$transaction(async (tx) => {
      const updatedItem = await tx.inventoryItem.update({
        where: { id: itemId },
        data: {
          quantityOnHand: newQty,
          costPrice: newWAC,      // costPrice field stores the running WAC
          updatedAt: new Date(),
        },
      });

      const transaction = await tx.stockTransaction.create({
        data: {
          tenantId,
          inventoryItemId: itemId,
          type:            'ENTRY',
          quantity:        entryQty,
          unitCost:        entryCost,
          totalCost,
          quantityBefore:  item.quantityOnHand,
          wacBefore:       item.costPrice,
          quantityAfter:   newQty,
          wacAfter:        newWAC,
          reference:       dto.reference,
          notes:           dto.notes,
          createdBy:       dto.createdBy,
        },
        include: { inventoryItem: { select: { sku: true, name: true } } },
      });

      return { item: updatedItem, transaction };
    });
  }

  /**
   * Record a stock exit (goods dispatched / sold).
   *
   * Business rules:
   * 1. Only physical items accept stock movements.
   * 2. Available stock MUST cover the requested quantity — no negative inventory.
   * 3. WAC does NOT change on exits (WAC principle: only receipts affect cost).
   * 4. The exit is valued at the current WAC for COGS reporting.
   */
  async recordStockExit(itemId: string, tenantId: string, dto: StockExitDto) {
    const item = await this.findOne(itemId, tenantId);
    this.assertPhysicalItem(item.type as InventoryItemType, 'EXIT');

    const exitQty = InventoryService.toD(dto.quantity);

    // ── Sufficient stock guard ────────────────────────────────────────────
    if (item.quantityOnHand.lessThan(exitQty)) {
      throw new UnprocessableEntityException(
        `Insufficient stock for "${item.sku}": ` +
          `available = ${item.quantityOnHand.toFixed(4)}, ` +
          `requested = ${exitQty.toFixed(4)}`,
      );
    }

    const newQty    = item.quantityOnHand.minus(exitQty);
    const totalCost = exitQty.mul(item.costPrice);  // valued at current WAC

    return this.prisma.$transaction(async (tx) => {
      const updatedItem = await tx.inventoryItem.update({
        where: { id: itemId },
        data: {
          quantityOnHand: newQty,
          // costPrice (WAC) is intentionally NOT updated on exits
          updatedAt: new Date(),
        },
      });

      const transaction = await tx.stockTransaction.create({
        data: {
          tenantId,
          inventoryItemId: itemId,
          type:            'EXIT',
          quantity:        exitQty,
          unitCost:        item.costPrice,  // exit valued at current WAC
          totalCost,
          quantityBefore:  item.quantityOnHand,
          wacBefore:       item.costPrice,
          quantityAfter:   newQty,
          wacAfter:        item.costPrice,  // WAC unchanged
          reference:       dto.reference,
          notes:           dto.notes,
          createdBy:       dto.createdBy,
        },
        include: { inventoryItem: { select: { sku: true, name: true } } },
      });

      return { item: updatedItem, transaction };
    });
  }

  /** Full transaction history for a single item (most recent first). */
  getTransactions(itemId: string, tenantId: string) {
    return this.prisma.stockTransaction.findMany({
      where: { inventoryItemId: itemId, tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Stock Valuation Report
  // ══════════════════════════════════════════════════════════════════════════

  /** Current stock value snapshot for every active physical item in the tenant. */
  async getStockValuation(tenantId: string): Promise<StockValuationReport> {
    const items = await this.prisma.inventoryItem.findMany({
      where: { tenantId, isActive: true, type: { not: InventoryItemType.SERVICE } },
      orderBy: { sku: 'asc' },
    });

    let totalValue  = new Prisma.Decimal(0);
    let belowReorder = 0;

    const lines: StockValuationLine[] = items.map((item) => {
      const value = item.quantityOnHand.mul(item.costPrice);
      totalValue   = totalValue.add(value);
      const below  = item.quantityOnHand.lessThanOrEqualTo(item.reorderPoint);
      if (below) belowReorder++;

      return {
        inventoryItemId:     item.id,
        sku:                 item.sku,
        name:                item.name,
        type:                item.type,
        unitOfMeasure:       item.unitOfMeasure,
        quantityOnHand:      item.quantityOnHand.toFixed(4),
        weightedAverageCost: item.costPrice.toFixed(4),
        totalValue:          value.toFixed(4),
        reorderPoint:        item.reorderPoint.toFixed(4),
        belowReorder:        below,
      };
    });

    return {
      tenantId,
      generatedAt: new Date().toISOString(),
      lines,
      totals: {
        totalItems:          items.length,
        itemsBelowReorder:   belowReorder,
        totalInventoryValue: totalValue.toFixed(4),
      },
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Domain helpers (static = testable without DI)
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Weighted Average Cost formula.
   *
   *   newWAC = (currentQty x currentWAC + entryQty x entryCost)
   *            ---------------------------------------------------
   *                       (currentQty + entryQty)
   *
   * Edge case — zero current stock (first receipt):
   *   newWAC = entryCost  (no existing inventory to blend with)
   *
   * Rounded to 4 decimal places to match the DB column precision.
   */
  static calculateWAC(
    currentQty: Prisma.Decimal,
    currentWAC: Prisma.Decimal,
    entryQty:   Prisma.Decimal,
    entryCost:  Prisma.Decimal,
  ): Prisma.Decimal {
    if (currentQty.isZero()) {
      return entryCost.toDecimalPlaces(4);
    }
    const existingValue = currentQty.mul(currentWAC);
    const newValue      = entryQty.mul(entryCost);
    const totalQty      = currentQty.add(entryQty);
    return existingValue.add(newValue).div(totalQty).toDecimalPlaces(4);
  }

  /** Convert JS float to Prisma.Decimal via string to avoid IEEE-754 representation errors. */
  static toD(n: number | string): Prisma.Decimal {
    return new Prisma.Decimal(n.toString());
  }

  private assertPhysicalItem(type: InventoryItemType, op: string): void {
    if (!PHYSICAL_TYPES.has(type)) {
      throw new BadRequestException(
        `Stock ${op} is not allowed for SERVICE items — they carry no physical inventory`,
      );
    }
  }
}

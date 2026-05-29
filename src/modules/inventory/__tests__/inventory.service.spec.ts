import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { InventoryService } from '../application/inventory.service';

// ── Helpers ───────────────────────────────────────────────────────────────────
const D = (n: number | string) => new Prisma.Decimal(n.toString());
const TENANT_A = 'tenant-aa-0000-0000-0000-000000000001';
const TENANT_B = 'tenant-bb-0000-0000-0000-000000000002';
const ITEM_ID  = 'item-0000-0000-0000-000000000001';

function makeItem(overrides: Partial<{
  id: string; tenantId: string; type: string;
  quantityOnHand: Prisma.Decimal; costPrice: Prisma.Decimal;
}> = {}) {
  return {
    id:             overrides.id            ?? ITEM_ID,
    tenantId:       overrides.tenantId      ?? TENANT_A,
    sku:            'SKU-001',
    name:           'Test Widget',
    description:    null,
    type:           overrides.type          ?? 'PRODUCT',
    unitOfMeasure:  'UNIT',
    costPrice:      overrides.costPrice     ?? D(0),
    sellingPrice:   D(0),
    quantityOnHand: overrides.quantityOnHand ?? D(0),
    reorderPoint:   D(10),
    isActive:       true,
    createdAt:      new Date(),
    updatedAt:      new Date(),
  };
}

// ── Prisma mock ───────────────────────────────────────────────────────────────
function makePrismaMock() {
  const mock = {
    inventoryItem: {
      findFirst: jest.fn(),
      findMany:  jest.fn(),
      create:    jest.fn(),
      update:    jest.fn(),
    },
    stockTransaction: {
      findMany: jest.fn(),
      create:   jest.fn(),
    },
    $transaction: jest.fn(),
  };

  // By default $transaction executes the callback with the mock itself as `tx`
  mock.$transaction.mockImplementation(async (cb: (tx: typeof mock) => any) => cb(mock));
  return mock;
}

// ══════════════════════════════════════════════════════════════════════════════
describe('InventoryService', () => {
  let service: InventoryService;
  let mockPrisma: ReturnType<typeof makePrismaMock>;

  beforeEach(() => {
    mockPrisma = makePrismaMock();
    service = new InventoryService(mockPrisma as any);
    jest.clearAllMocks();
    // Re-wire $transaction after clearAllMocks
    mockPrisma.$transaction.mockImplementation(
      async (cb: (tx: typeof mockPrisma) => any) => cb(mockPrisma),
    );
  });

  // ══════════════════════════════════════════════════════════════════════════
  // calculateWAC  (static pure function — no DB involved)
  // ══════════════════════════════════════════════════════════════════════════
  describe('calculateWAC (static)', () => {

    it('returns entryCost when current quantity is zero (first receipt)', () => {
      const wac = InventoryService.calculateWAC(D(0), D(0), D(100), D('10.00'));
      expect(wac.equals(D('10.0000'))).toBe(true);
    });

    it('blends costs correctly on the second receipt', () => {
      // Current: 100 units @ $10  → value = $1,000
      // Entry:    50 units @ $12  → value =   $600
      // New WAC: $1,600 / 150 = $10.6667
      const wac = InventoryService.calculateWAC(D(100), D('10.00'), D(50), D('12.00'));
      expect(wac.toFixed(4)).toBe('10.6667');
    });

    it('brings WAC back toward a lower cost when buying cheaper', () => {
      // Current: 100 @ $15  → $1,500
      // Entry:   200 @ $9   → $1,800
      // New WAC: $3,300 / 300 = $11.00
      const wac = InventoryService.calculateWAC(D(100), D('15.00'), D(200), D('9.00'));
      expect(wac.toFixed(4)).toBe('11.0000');
    });

    it('WAC is unchanged when entry cost equals current WAC', () => {
      const wac = InventoryService.calculateWAC(D(100), D('10.00'), D(50), D('10.00'));
      expect(wac.toFixed(4)).toBe('10.0000');
    });

    it('handles decimal quantities precisely (no floating-point error)', () => {
      // 33.33 + 33.33 + 33.34 = 100 — classic float trap
      let wac = InventoryService.calculateWAC(D(0),     D(0),      D('33.33'), D('5.00'));
      wac     = InventoryService.calculateWAC(D('33.33'), wac,     D('33.33'), D('5.00'));
      wac     = InventoryService.calculateWAC(D('66.66'), wac,     D('33.34'), D('5.00'));
      expect(wac.toFixed(4)).toBe('5.0000');
    });

    it('handles a large-value entry without precision loss', () => {
      // 1,000 units @ $999.9999 each
      const wac = InventoryService.calculateWAC(D(0), D(0), D(1000), D('999.9999'));
      expect(wac.equals(D('999.9999'))).toBe(true);
    });

    it('toD converts JS floats correctly (0.1 stays 0.1)', () => {
      const d = InventoryService.toD(0.1);
      expect(d.equals(D('0.1'))).toBe(true);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // recordStockEntry
  // ══════════════════════════════════════════════════════════════════════════
  describe('recordStockEntry', () => {
    const entryDto = { quantity: 100, unitCost: 10, reference: 'PO-001' };

    it('creates a stock entry and updates quantity + WAC in one transaction', async () => {
      const item    = makeItem({ quantityOnHand: D(0), costPrice: D(0) });
      const updated = makeItem({ quantityOnHand: D(100), costPrice: D('10.0000') });
      mockPrisma.inventoryItem.findFirst.mockResolvedValue(item);
      mockPrisma.inventoryItem.update.mockResolvedValue(updated);
      mockPrisma.stockTransaction.create.mockResolvedValue({ id: 'tx-1', type: 'ENTRY' });

      const result = await service.recordStockEntry(ITEM_ID, TENANT_A, entryDto);

      expect(result.item.quantityOnHand.equals(D(100))).toBe(true);
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(mockPrisma.inventoryItem.update).toHaveBeenCalledTimes(1);
      expect(mockPrisma.stockTransaction.create).toHaveBeenCalledTimes(1);
    });

    it('sets WAC = entryCost on first receipt (currentQty = 0)', async () => {
      const item = makeItem({ quantityOnHand: D(0), costPrice: D(0) });
      mockPrisma.inventoryItem.findFirst.mockResolvedValue(item);
      mockPrisma.inventoryItem.update.mockResolvedValue(makeItem());
      mockPrisma.stockTransaction.create.mockResolvedValue({});

      await service.recordStockEntry(ITEM_ID, TENANT_A, { quantity: 50, unitCost: 15 });

      const updateCall = mockPrisma.inventoryItem.update.mock.calls[0][0];
      expect(updateCall.data.costPrice.toFixed(4)).toBe('15.0000');
    });

    it('correctly blends WAC on second receipt', async () => {
      // Existing: 100 units @ $10.00 = $1,000
      // Entry:     50 units @ $12.00 = $600
      // Expected WAC: $1,600 / 150 = $10.6667
      const item = makeItem({ quantityOnHand: D(100), costPrice: D('10.00') });
      mockPrisma.inventoryItem.findFirst.mockResolvedValue(item);
      mockPrisma.inventoryItem.update.mockResolvedValue(makeItem());
      mockPrisma.stockTransaction.create.mockResolvedValue({});

      await service.recordStockEntry(ITEM_ID, TENANT_A, { quantity: 50, unitCost: 12 });

      const updateCall = mockPrisma.inventoryItem.update.mock.calls[0][0];
      expect(updateCall.data.costPrice.toFixed(4)).toBe('10.6667');
      expect(updateCall.data.quantityOnHand.toFixed(4)).toBe('150.0000');
    });

    it('records correct audit snapshot (quantityBefore / wacBefore / quantityAfter / wacAfter)', async () => {
      const item = makeItem({ quantityOnHand: D(100), costPrice: D('10.00') });
      mockPrisma.inventoryItem.findFirst.mockResolvedValue(item);
      mockPrisma.inventoryItem.update.mockResolvedValue(makeItem());
      mockPrisma.stockTransaction.create.mockResolvedValue({});

      await service.recordStockEntry(ITEM_ID, TENANT_A, { quantity: 50, unitCost: 12 });

      const txData = mockPrisma.stockTransaction.create.mock.calls[0][0].data;
      expect(txData.quantityBefore.equals(D(100))).toBe(true);
      expect(txData.wacBefore.equals(D('10.00'))).toBe(true);
      expect(txData.quantityAfter.equals(D(150))).toBe(true);
      expect(txData.wacAfter.toFixed(4)).toBe('10.6667');
    });

    it('throws NotFoundException when item does not exist in tenant', async () => {
      mockPrisma.inventoryItem.findFirst.mockResolvedValue(null);

      await expect(
        service.recordStockEntry('ghost-id', TENANT_A, entryDto),
      ).rejects.toThrow(NotFoundException);

      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('throws BadRequestException for SERVICE items', async () => {
      const serviceItem = makeItem({ type: 'SERVICE' });
      mockPrisma.inventoryItem.findFirst.mockResolvedValue(serviceItem);

      await expect(
        service.recordStockEntry(ITEM_ID, TENANT_A, entryDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('scopes item lookup to the authenticated tenantId', async () => {
      mockPrisma.inventoryItem.findFirst.mockResolvedValue(null);
      await service.recordStockEntry(ITEM_ID, TENANT_A, entryDto).catch(() => {});

      const query = mockPrisma.inventoryItem.findFirst.mock.calls[0][0];
      expect(query.where.tenantId).toBe(TENANT_A);
      expect(query.where.tenantId).not.toBe(TENANT_B);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // recordStockExit
  // ══════════════════════════════════════════════════════════════════════════
  describe('recordStockExit', () => {

    it('dispatches stock and records the transaction at current WAC', async () => {
      const item = makeItem({ quantityOnHand: D(100), costPrice: D('10.6667') });
      mockPrisma.inventoryItem.findFirst.mockResolvedValue(item);
      mockPrisma.inventoryItem.update.mockResolvedValue(
        makeItem({ quantityOnHand: D(70), costPrice: D('10.6667') }),
      );
      mockPrisma.stockTransaction.create.mockResolvedValue({ id: 'tx-exit', type: 'EXIT' });

      const result = await service.recordStockExit(ITEM_ID, TENANT_A, {
        quantity: 30,
        reference: 'SO-001',
      });

      expect(result.item.quantityOnHand.equals(D(70))).toBe(true);
      const txData = mockPrisma.stockTransaction.create.mock.calls[0][0].data;
      expect(txData.type).toBe('EXIT');
      expect(txData.unitCost.equals(D('10.6667'))).toBe(true);    // valued at WAC
      expect(txData.wacAfter.equals(D('10.6667'))).toBe(true);    // WAC unchanged
    });

    it('WAC is NOT modified on exit (costPrice unchanged in update call)', async () => {
      const item = makeItem({ quantityOnHand: D(100), costPrice: D('12.5000') });
      mockPrisma.inventoryItem.findFirst.mockResolvedValue(item);
      mockPrisma.inventoryItem.update.mockResolvedValue(makeItem());
      mockPrisma.stockTransaction.create.mockResolvedValue({});

      await service.recordStockExit(ITEM_ID, TENANT_A, { quantity: 40 });

      const updateCall = mockPrisma.inventoryItem.update.mock.calls[0][0];
      expect(updateCall.data.costPrice).toBeUndefined();   // costPrice NOT touched
      expect(updateCall.data.quantityOnHand.toFixed(4)).toBe('60.0000');
    });

    it('allows exiting the exact available quantity (stock goes to zero)', async () => {
      const item = makeItem({ quantityOnHand: D(100), costPrice: D('10.00') });
      mockPrisma.inventoryItem.findFirst.mockResolvedValue(item);
      mockPrisma.inventoryItem.update.mockResolvedValue(makeItem({ quantityOnHand: D(0) }));
      mockPrisma.stockTransaction.create.mockResolvedValue({});

      await expect(
        service.recordStockExit(ITEM_ID, TENANT_A, { quantity: 100 }),
      ).resolves.toBeDefined();
    });

    it('throws UnprocessableEntityException when requested qty > available qty', async () => {
      const item = makeItem({ quantityOnHand: D(50), costPrice: D('10.00') });
      mockPrisma.inventoryItem.findFirst.mockResolvedValue(item);

      await expect(
        service.recordStockExit(ITEM_ID, TENANT_A, { quantity: 50.0001 }),
      ).rejects.toThrow(UnprocessableEntityException);

      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('error message contains both available and requested quantities', async () => {
      const item = makeItem({ quantityOnHand: D(30), costPrice: D('10.00') });
      mockPrisma.inventoryItem.findFirst.mockResolvedValue(item);

      try {
        await service.recordStockExit(ITEM_ID, TENANT_A, { quantity: 100 });
        fail('Expected UnprocessableEntityException');
      } catch (e: any) {
        expect(e).toBeInstanceOf(UnprocessableEntityException);
        expect(e.message).toContain('30.0000');   // available
        expect(e.message).toContain('100.0000');  // requested
      }
    });

    it('throws BadRequestException for SERVICE items', async () => {
      mockPrisma.inventoryItem.findFirst.mockResolvedValue(makeItem({ type: 'SERVICE' }));

      await expect(
        service.recordStockExit(ITEM_ID, TENANT_A, { quantity: 1 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('COGS totalCost is quantity × WAC', async () => {
      // 30 units exited at WAC $10.6667 → COGS = $320.001
      const item = makeItem({ quantityOnHand: D(100), costPrice: D('10.6667') });
      mockPrisma.inventoryItem.findFirst.mockResolvedValue(item);
      mockPrisma.inventoryItem.update.mockResolvedValue(makeItem());
      mockPrisma.stockTransaction.create.mockResolvedValue({});

      await service.recordStockExit(ITEM_ID, TENANT_A, { quantity: 30 });

      const txData = mockPrisma.stockTransaction.create.mock.calls[0][0].data;
      const expectedCOGS = D('10.6667').mul(D(30));
      expect(txData.totalCost.equals(expectedCOGS)).toBe(true);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Multi-step WAC scenario (entry → exit → entry)
  // ══════════════════════════════════════════════════════════════════════════
  describe('Multi-step WAC simulation', () => {
    it('WAC chain: first entry → exit → second entry recalculates correctly', () => {
      // Step 1 — first entry: 100 units @ $10.00
      let wac = InventoryService.calculateWAC(D(0), D(0), D(100), D('10.00'));
      let qty = D(100);
      expect(wac.toFixed(4)).toBe('10.0000');

      // Step 2 — exit: 40 units (WAC unchanged)
      qty = qty.minus(D(40));
      // wac stays 10.0000
      expect(wac.toFixed(4)).toBe('10.0000');

      // Step 3 — second entry: 80 units @ $12.00
      // Existing value: 60 × 10.00 = 600
      // New value:      80 × 12.00 = 960
      // New WAC: 1560 / 140 = 11.1429
      wac = InventoryService.calculateWAC(qty, wac, D(80), D('12.00'));
      qty = qty.add(D(80));
      expect(wac.toFixed(4)).toBe('11.1429');
      expect(qty.toFixed(0)).toBe('140');
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // create
  // ══════════════════════════════════════════════════════════════════════════
  describe('create', () => {
    const dto = {
      sku: 'SKU-NEW',
      name: 'New Product',
      type: 'PRODUCT' as any,
    };

    it('creates an item and scopes it to the JWT tenantId', async () => {
      mockPrisma.inventoryItem.findFirst.mockResolvedValue(null);
      mockPrisma.inventoryItem.create.mockResolvedValue(makeItem());

      await service.create(TENANT_A, dto);

      const createArgs = mockPrisma.inventoryItem.create.mock.calls[0][0];
      expect(createArgs.data.tenantId).toBe(TENANT_A);
    });

    it('throws ConflictException when SKU already exists in the same tenant', async () => {
      mockPrisma.inventoryItem.findFirst.mockResolvedValue(makeItem());

      await expect(service.create(TENANT_A, dto)).rejects.toThrow(ConflictException);
      expect(mockPrisma.inventoryItem.create).not.toHaveBeenCalled();
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // getStockValuation
  // ══════════════════════════════════════════════════════════════════════════
  describe('getStockValuation', () => {
    it('returns total inventory value (qty × WAC) per item', async () => {
      mockPrisma.inventoryItem.findMany.mockResolvedValue([
        makeItem({ quantityOnHand: D(100), costPrice: D('10.00') }),
        makeItem({ id: 'item-2', quantityOnHand: D(50), costPrice: D('20.00') }),
      ]);

      const report = await service.getStockValuation(TENANT_A);

      expect(report.lines[0].totalValue).toBe('1000.0000');
      expect(report.lines[1].totalValue).toBe('1000.0000');
      expect(report.totals.totalInventoryValue).toBe('2000.0000');
      expect(report.tenantId).toBe(TENANT_A);
    });

    it('flags items at or below reorder point', async () => {
      const item = makeItem({ quantityOnHand: D(5), costPrice: D('10.00') });
      item.reorderPoint = D(10); // qty(5) <= reorder(10) → belowReorder
      mockPrisma.inventoryItem.findMany.mockResolvedValue([item]);

      const report = await service.getStockValuation(TENANT_A);

      expect(report.lines[0].belowReorder).toBe(true);
      expect(report.totals.itemsBelowReorder).toBe(1);
    });

    it('excludes SERVICE items from the valuation report', async () => {
      mockPrisma.inventoryItem.findMany.mockResolvedValue([]);

      await service.getStockValuation(TENANT_A);

      const query = mockPrisma.inventoryItem.findMany.mock.calls[0][0];
      expect(query.where.type).toEqual({ not: 'SERVICE' });
    });

    it('always scopes the query to the correct tenantId', async () => {
      mockPrisma.inventoryItem.findMany.mockResolvedValue([]);

      await service.getStockValuation(TENANT_A);

      const query = mockPrisma.inventoryItem.findMany.mock.calls[0][0];
      expect(query.where.tenantId).toBe(TENANT_A);
      expect(query.where.tenantId).not.toBe(TENANT_B);
    });
  });
});

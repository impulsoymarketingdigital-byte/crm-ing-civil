import { ConflictException, NotFoundException } from '@nestjs/common';
import { ApuService } from '../application/apu.service';

const TENANT_A   = 'tenant-aa-0000-0000-0000-000000000001';
const CHAPTER_ID = 'chap-0000-0000-0000-0000-000000000001';
const ITEM_ID    = 'item-0000-0000-0000-0000-000000000001';
const INPUT_ID   = 'inp-00000-0000-0000-0000-000000000001';

function makePrisma() {
  return {
    apuChapter:  { findFirst: jest.fn(), create: jest.fn() },
    apuItem: {
      findFirst: jest.fn(), findUniqueOrThrow: jest.fn(),
      create: jest.fn(), update: jest.fn(),
    },
    apuInput: { create: jest.fn(), findFirst: jest.fn(), delete: jest.fn() },
  };
}

function makeItem(inputs: any[] = [], laborFactor = 1.6) {
  return {
    id: ITEM_ID, tenantId: TENANT_A, chapterId: CHAPTER_ID,
    code: 'C01-001', name: 'Concreto 3000 PSI', unit: 'M3',
    laborFactor: laborFactor.toString(),
    materialCost: '0', laborCost: '0', equipmentCost: '0', totalUnitCost: '0',
    isActive: true, createdAt: new Date(), updatedAt: new Date(),
    inputs,
  };
}

function makeInput(type: string, qty: number, unitCost: number) {
  return {
    id: `inp-${Math.random()}`, apuItemId: ITEM_ID, type,
    description: `${type} desc`, unit: 'UN',
    quantity: qty.toString(), unitCost: unitCost.toString(),
    total: (qty * unitCost).toString(),
  };
}

// ══════════════════════════════════════════════════════════════════════════════
describe('ApuService', () => {
  let service: ApuService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
    service = new ApuService(prisma as any);
    jest.clearAllMocks();
  });

  // ── createChapter ──────────────────────────────────────────────────────────
  describe('createChapter', () => {
    it('throws ConflictException on duplicate code', async () => {
      prisma.apuChapter.findFirst.mockResolvedValue({ id: CHAPTER_ID });
      await expect(service.createChapter(TENANT_A, { code: 'C01', name: 'Concretos' }))
        .rejects.toThrow(ConflictException);
    });

    it('creates chapter successfully', async () => {
      prisma.apuChapter.findFirst.mockResolvedValue(null);
      prisma.apuChapter.create.mockResolvedValue({ id: CHAPTER_ID, code: 'C01', name: 'Concretos' });
      const result = await service.createChapter(TENANT_A, { code: 'C01', name: 'Concretos' });
      expect(result.id).toBe(CHAPTER_ID);
    });
  });

  // ── createItem ─────────────────────────────────────────────────────────────
  describe('createItem', () => {
    it('throws ConflictException on duplicate APU code', async () => {
      prisma.apuItem.findFirst.mockResolvedValue(makeItem());
      await expect(service.createItem(TENANT_A, { chapterId: CHAPTER_ID, code: 'C01-001', name: 'Concreto', unit: 'M3' }))
        .rejects.toThrow(ConflictException);
    });

    it('throws NotFoundException when chapter does not belong to tenant', async () => {
      prisma.apuItem.findFirst.mockResolvedValue(null);
      prisma.apuChapter.findFirst.mockResolvedValue(null);
      await expect(service.createItem(TENANT_A, { chapterId: CHAPTER_ID, code: 'C01-001', name: 'Concreto' }))
        .rejects.toThrow(NotFoundException);
    });

    it('defaults laborFactor to 1.6', async () => {
      prisma.apuItem.findFirst.mockResolvedValue(null);
      prisma.apuChapter.findFirst.mockResolvedValue({ id: CHAPTER_ID });
      prisma.apuItem.create.mockResolvedValue(makeItem());
      await service.createItem(TENANT_A, { chapterId: CHAPTER_ID, code: 'C01-001', name: 'Concreto' });
      const createArgs = prisma.apuItem.create.mock.calls[0][0];
      expect(Number(createArgs.data.laborFactor)).toBeCloseTo(1.6);
    });
  });

  // ── addInput + _recomputeItem ──────────────────────────────────────────────
  describe('addInput — totalUnitCost recomputation', () => {
    function setupAddInput(inputs: any[]) {
      prisma.apuItem.findFirst.mockResolvedValue(makeItem(inputs));
      prisma.apuInput.create.mockResolvedValue({});
      prisma.apuItem.findUniqueOrThrow.mockResolvedValue(makeItem(inputs));
      prisma.apuItem.update.mockImplementation(({ data }: any) =>
        Promise.resolve({ id: ITEM_ID, ...data }),
      );
    }

    it('totalUnitCost = materialCost + (laborCost × factor) + equipmentCost', async () => {
      const inputs = [
        makeInput('MATERIAL',  10, 5000),  // material = 50,000
        makeInput('LABOR',     8,  15000), // labor = 120,000 → ×1.6 = 192,000
        makeInput('EQUIPMENT', 2,  25000), // equipment = 50,000
      ];
      setupAddInput(inputs);
      // totalUnitCost = 50,000 + 192,000 + 50,000 = 292,000
      const dto = { type: 'MATERIAL' as any, description: 'New', unit: 'KG', quantity: 1, unitCost: 1 };
      await service.addInput(ITEM_ID, TENANT_A, dto);

      const updateArgs = prisma.apuItem.update.mock.calls[0][0];
      expect(Number(updateArgs.data.materialCost)).toBeCloseTo(50_000, 0);
      expect(Number(updateArgs.data.laborCost)).toBeCloseTo(120_000, 0);
      expect(Number(updateArgs.data.equipmentCost)).toBeCloseTo(50_000, 0);
      expect(Number(updateArgs.data.totalUnitCost)).toBeCloseTo(292_000, 0);
    });

    it('with laborFactor = 1.0 → totalUnitCost = sum of all inputs', async () => {
      const item = makeItem([
        makeInput('MATERIAL', 1, 1000),
        makeInput('LABOR',    1, 1000),
        makeInput('EQUIPMENT',1, 1000),
      ], 1.0);
      prisma.apuItem.findFirst.mockResolvedValue(item);
      prisma.apuInput.create.mockResolvedValue({});
      prisma.apuItem.findUniqueOrThrow.mockResolvedValue(item);
      prisma.apuItem.update.mockImplementation(({ data }: any) => Promise.resolve(data));

      const dto = { type: 'MATERIAL' as any, description: 'x', unit: 'UN', quantity: 0, unitCost: 0 };
      await service.addInput(ITEM_ID, TENANT_A, dto);

      const updateArgs = prisma.apuItem.update.mock.calls[0][0];
      expect(Number(updateArgs.data.totalUnitCost)).toBeCloseTo(3000, 0);
    });

    it('stores input total = quantity × unitCost', async () => {
      prisma.apuItem.findFirst.mockResolvedValue(makeItem());
      prisma.apuInput.create.mockResolvedValue({});
      prisma.apuItem.findUniqueOrThrow.mockResolvedValue(makeItem());
      prisma.apuItem.update.mockResolvedValue({});

      const dto = { type: 'MATERIAL' as any, description: 'Arena', unit: 'M3', quantity: 3, unitCost: 40_000 };
      await service.addInput(ITEM_ID, TENANT_A, dto);

      const inputArgs = prisma.apuInput.create.mock.calls[0][0];
      expect(Number(inputArgs.data.total)).toBeCloseTo(120_000);
    });

    it('item not found throws NotFoundException', async () => {
      prisma.apuItem.findFirst.mockResolvedValue(null);
      const dto = { type: 'MATERIAL' as any, description: 'x', unit: 'UN', quantity: 1, unitCost: 1 };
      await expect(service.addInput('bad-id', TENANT_A, dto)).rejects.toThrow(NotFoundException);
    });
  });

  // ── deleteInput ────────────────────────────────────────────────────────────
  describe('deleteInput', () => {
    it('throws NotFoundException when input not found or wrong tenant', async () => {
      prisma.apuInput.findFirst.mockResolvedValue(null);
      await expect(service.deleteInput(INPUT_ID, TENANT_A)).rejects.toThrow(NotFoundException);
    });

    it('deletes input and recomputes item', async () => {
      const item = makeItem([], 1.6);
      prisma.apuInput.findFirst.mockResolvedValue({ id: INPUT_ID, apuItemId: ITEM_ID, apuItem: item });
      prisma.apuInput.delete.mockResolvedValue({});
      prisma.apuItem.findUniqueOrThrow.mockResolvedValue(item);
      prisma.apuItem.update.mockResolvedValue(item);

      await service.deleteInput(INPUT_ID, TENANT_A);
      expect(prisma.apuInput.delete).toHaveBeenCalledWith({ where: { id: INPUT_ID } });
      expect(prisma.apuItem.update).toHaveBeenCalledTimes(1);
    });
  });
});

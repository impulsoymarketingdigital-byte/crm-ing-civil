import { BadRequestException, NotFoundException } from '@nestjs/common';
import { BudgetService } from '../application/budget.service';

const TENANT_A  = 'tenant-aa-0000-0000-0000-000000000001';
const BUDGET_ID = 'budget-00-0000-0000-0000-000000000001';
const PROJ_ID   = 'proj-000-0000-0000-0000-000000000001';
const CHAPTER_ID = 'chap-000-0000-0000-0000-000000000001';
const LINE_ID    = 'line-000-0000-0000-0000-000000000001';

function makeBudget(overrides: any = {}) {
  return {
    id: BUDGET_ID, tenantId: TENANT_A, projectId: PROJ_ID,
    name: 'Presupuesto Obra v1', version: 1,
    status: 'DRAFT',
    adminPct: '0.1', riskPct: '0.05', profitPct: '0.08',
    directCost: '0', adminAmount: '0', riskAmount: '0',
    profitAmount: '0', aiuAmount: '0', totalBudget: '0',
    chapters: [],
    ...overrides,
  };
}

function makePrisma() {
  return {
    officialBudget: {
      findFirst: jest.fn(), findMany: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      create: jest.fn(), update: jest.fn(),
    },
    budgetChapter: { create: jest.fn(), update: jest.fn() },
    budgetLine: {
      create: jest.fn(), findFirst: jest.fn(), delete: jest.fn(),
    },
    apuItem: { findFirst: jest.fn() },
    certificateLine: { findMany: jest.fn() },
  };
}

// ══════════════════════════════════════════════════════════════════════════════
describe('BudgetService', () => {
  let service: BudgetService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
    service = new BudgetService(prisma as any);
    jest.clearAllMocks();
  });

  // ── create ─────────────────────────────────────────────────────────────────
  describe('create', () => {
    it('version = 1 when no previous budget exists for project', async () => {
      prisma.officialBudget.findFirst.mockResolvedValue(null);
      prisma.officialBudget.create.mockImplementation(({ data }: any) =>
        Promise.resolve({ id: BUDGET_ID, ...data }),
      );
      const result = await service.create(TENANT_A, {
        projectId: PROJ_ID, name: 'v1', adminPct: 0.1, riskPct: 0.05, profitPct: 0.08,
      });
      expect(result.version).toBe(1);
    });

    it('version increments from last existing budget', async () => {
      prisma.officialBudget.findFirst.mockResolvedValue(makeBudget({ version: 3 }));
      prisma.officialBudget.create.mockImplementation(({ data }: any) =>
        Promise.resolve({ id: BUDGET_ID, ...data }),
      );
      const result = await service.create(TENANT_A, { projectId: PROJ_ID, name: 'v4' });
      expect(result.version).toBe(4);
    });
  });

  // ── approve ────────────────────────────────────────────────────────────────
  describe('approve', () => {
    it('sets status=APPROVED and approvedAt', async () => {
      prisma.officialBudget.findFirst.mockResolvedValue(makeBudget());
      prisma.officialBudget.update.mockResolvedValue({ ...makeBudget(), status: 'APPROVED', approvedAt: new Date() });
      const result = await service.approve(BUDGET_ID, TENANT_A);
      expect(result.status).toBe('APPROVED');
      const updateArgs = prisma.officialBudget.update.mock.calls[0][0];
      expect(updateArgs.data.approvedAt).toBeInstanceOf(Date);
    });

    it('throws NotFoundException when budget not found', async () => {
      prisma.officialBudget.findFirst.mockResolvedValue(null);
      await expect(service.approve(BUDGET_ID, TENANT_A)).rejects.toThrow(NotFoundException);
    });
  });

  // ── addLine — AIU recomputation ────────────────────────────────────────────
  describe('addLine + AIU recomputation', () => {
    function setupRecompute(lines: Array<{ totalCost: number }>) {
      const chapter = { id: CHAPTER_ID, budgetId: BUDGET_ID, lines: lines.map((l, i) => ({ id: `l${i}`, totalCost: l.totalCost.toString() })) };
      const budget = makeBudget({ chapters: [chapter] });
      prisma.officialBudget.findFirst.mockResolvedValue(budget);
      prisma.apuItem.findFirst.mockResolvedValue(null);
      prisma.budgetLine.create.mockResolvedValue({ id: LINE_ID });
      prisma.officialBudget.findUniqueOrThrow.mockResolvedValue(budget);
      prisma.budgetChapter.update.mockResolvedValue({});
      prisma.officialBudget.update.mockImplementation(({ data }: any) => Promise.resolve(data));
    }

    it('totalCost = quantity × unitCost', async () => {
      setupRecompute([]);
      await service.addLine(BUDGET_ID, TENANT_A, {
        chapterId: CHAPTER_ID, description: 'Concreto', quantity: 10, unitCost: 150_000, order: 0,
      });
      const createArgs = prisma.budgetLine.create.mock.calls[0][0];
      expect(Number(createArgs.data.totalCost)).toBeCloseTo(1_500_000);
    });

    it('directCost = sum of all chapter line totalCosts', async () => {
      setupRecompute([{ totalCost: 1_000_000 }, { totalCost: 500_000 }]);
      await service.addLine(BUDGET_ID, TENANT_A, {
        chapterId: CHAPTER_ID, description: 'Extra', quantity: 1, unitCost: 0, order: 0,
      });
      const updateArgs = prisma.officialBudget.update.mock.calls[0][0];
      expect(Number(updateArgs.data.directCost)).toBeCloseTo(1_500_000, 0);
    });

    it('adminAmount = directCost × adminPct (10%)', async () => {
      setupRecompute([{ totalCost: 1_000_000 }]);
      await service.addLine(BUDGET_ID, TENANT_A, {
        chapterId: CHAPTER_ID, description: 'x', quantity: 1, unitCost: 0, order: 0,
      });
      const updateArgs = prisma.officialBudget.update.mock.calls[0][0];
      expect(Number(updateArgs.data.adminAmount)).toBeCloseTo(100_000, 0);
    });

    it('totalBudget = directCost + aiuAmount', async () => {
      // adminPct=0.1, riskPct=0.05, profitPct=0.08 → aiu = 23% of directCost
      setupRecompute([{ totalCost: 1_000_000 }]);
      await service.addLine(BUDGET_ID, TENANT_A, {
        chapterId: CHAPTER_ID, description: 'x', quantity: 1, unitCost: 0, order: 0,
      });
      const updateArgs = prisma.officialBudget.update.mock.calls[0][0];
      const dc = Number(updateArgs.data.directCost);
      const aiu = Number(updateArgs.data.aiuAmount);
      expect(Number(updateArgs.data.totalBudget)).toBeCloseTo(dc + aiu, 0);
    });

    it('throws BadRequestException when budget is APPROVED', async () => {
      prisma.officialBudget.findFirst.mockResolvedValue(makeBudget({ status: 'APPROVED' }));
      await expect(service.addLine(BUDGET_ID, TENANT_A, {
        chapterId: CHAPTER_ID, description: 'x', quantity: 1, unitCost: 1, order: 0,
      })).rejects.toThrow(BadRequestException);
    });

    it('uses APU totalUnitCost when apuItemId provided and unitCost=0', async () => {
      const budget = makeBudget({ chapters: [] });
      prisma.officialBudget.findFirst.mockResolvedValue(budget);
      prisma.apuItem.findFirst.mockResolvedValue({ id: 'apu-1', tenantId: TENANT_A, totalUnitCost: '250000' });
      prisma.budgetLine.create.mockResolvedValue({ id: LINE_ID });
      prisma.officialBudget.findUniqueOrThrow.mockResolvedValue(makeBudget({ chapters: [] }));
      prisma.officialBudget.update.mockResolvedValue({});

      await service.addLine(BUDGET_ID, TENANT_A, {
        chapterId: CHAPTER_ID, description: 'APU item', quantity: 5, unitCost: 0, apuItemId: 'apu-1', order: 0,
      });
      const createArgs = prisma.budgetLine.create.mock.calls[0][0];
      expect(Number(createArgs.data.unitCost)).toBeCloseTo(250_000);
      expect(Number(createArgs.data.totalCost)).toBeCloseTo(1_250_000);
    });
  });

  // ── deleteLine ─────────────────────────────────────────────────────────────
  describe('deleteLine', () => {
    it('throws NotFoundException when line not found', async () => {
      prisma.budgetLine.findFirst.mockResolvedValue(null);
      await expect(service.deleteLine(LINE_ID, TENANT_A)).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when budget is APPROVED', async () => {
      prisma.budgetLine.findFirst.mockResolvedValue({
        id: LINE_ID, budgetId: BUDGET_ID,
        budget: makeBudget({ status: 'APPROVED', chapters: [] }),
      });
      await expect(service.deleteLine(LINE_ID, TENANT_A)).rejects.toThrow(BadRequestException);
    });
  });
});

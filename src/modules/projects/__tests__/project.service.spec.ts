import { ConflictException, NotFoundException } from '@nestjs/common';
import { ProjectService } from '../application/project.service';
import { AiuService } from '../application/aiu.service';

const TENANT_A = 'tenant-aa-0000-0000-0000-000000000001';
const PROJ_ID  = 'proj-000-0000-0000-0000-000000000001';
const PHASE_ID = 'phase-00-0000-0000-0000-000000000001';

function makePrisma() {
  return {
    project:      { findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn() },
    projectPhase: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    projectBudget:{ findMany: jest.fn(), create: jest.fn() },
    aiuBreakdown: { findFirst: jest.fn(), create: jest.fn() },
  };
}

function makeProject(overrides: any = {}) {
  return {
    id: PROJ_ID, tenantId: TENANT_A, code: 'OBR-001', name: 'Puente viaducto',
    status: 'PLANNING', clientName: 'IDU', location: 'Bogotá',
    contractValue: '100000000', adminPct: '0.10', riskPct: '0.05', profitPct: '0.08',
    adminAmount: '10000000', riskAmount: '5000000', profitAmount: '8000000',
    aiuAmount: '23000000', totalValue: '123000000',
    startDate: null, endDate: null, createdAt: new Date(), updatedAt: new Date(),
    phases: [], budgets: [], aiuBreakdowns: [],
    ...overrides,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
describe('AiuService', () => {
  const svc = new AiuService();

  describe('calculate', () => {
    it('adminAmount = contractValue × adminPct', () => {
      const r = svc.calculate(10_000_000, 0.10, 0.05, 0.08);
      expect(r.adminAmount).toBeCloseTo(1_000_000, 0);
    });

    it('riskAmount = contractValue × riskPct', () => {
      const r = svc.calculate(10_000_000, 0.10, 0.05, 0.08);
      expect(r.riskAmount).toBeCloseTo(500_000, 0);
    });

    it('profitAmount = contractValue × profitPct', () => {
      const r = svc.calculate(10_000_000, 0.10, 0.05, 0.08);
      expect(r.profitAmount).toBeCloseTo(800_000, 0);
    });

    it('aiuAmount = admin + risk + profit', () => {
      const r = svc.calculate(10_000_000, 0.10, 0.05, 0.08);
      expect(r.aiuAmount).toBeCloseTo(2_300_000, 0);
    });

    it('totalValue = contractValue + aiuAmount', () => {
      const r = svc.calculate(10_000_000, 0.10, 0.05, 0.08);
      expect(r.totalValue).toBeCloseTo(12_300_000, 0);
    });

    it('works with zero AIU (lump sum contract)', () => {
      const r = svc.calculate(5_000_000, 0, 0, 0);
      expect(r.aiuAmount).toBe(0);
      expect(r.totalValue).toBe(5_000_000);
    });

    it('returns original contractValue unchanged', () => {
      const r = svc.calculate(7_500_000, 0.10, 0.05, 0.08);
      expect(r.contractValue).toBe(7_500_000);
    });
  });
});

describe('ProjectService', () => {
  let service: ProjectService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
    service = new ProjectService(prisma as any, new AiuService());
    jest.clearAllMocks();
  });

  // ── create ─────────────────────────────────────────────────────────────────
  describe('create', () => {
    const dto = {
      code: 'OBR-001', name: 'Puente', contractValue: 100_000_000,
      adminPct: 0.10, riskPct: 0.05, profitPct: 0.08,
    };

    it('throws ConflictException on duplicate code', async () => {
      prisma.project.findFirst.mockResolvedValue(makeProject());
      await expect(service.create(TENANT_A, dto)).rejects.toThrow(ConflictException);
    });

    it('persists computed AIU amounts', async () => {
      prisma.project.findFirst.mockResolvedValue(null);
      prisma.project.create.mockImplementation(({ data }: any) => Promise.resolve({ id: PROJ_ID, ...data }));
      const result = await service.create(TENANT_A, dto);
      expect(Number(result.adminAmount)).toBeCloseTo(10_000_000, 0);
      expect(Number(result.riskAmount)).toBeCloseTo(5_000_000, 0);
      expect(Number(result.profitAmount)).toBeCloseTo(8_000_000, 0);
      expect(Number(result.totalValue)).toBeCloseTo(123_000_000, 0);
    });
  });

  // ── update recalculates AIU ────────────────────────────────────────────────
  describe('update', () => {
    it('recalculates AIU when contractValue changes', async () => {
      prisma.project.findFirst.mockResolvedValue(makeProject());
      prisma.project.update.mockImplementation(({ data }: any) => Promise.resolve({ id: PROJ_ID, ...data }));
      const result = await service.update(PROJ_ID, TENANT_A, { contractValue: 200_000_000 });
      // adminPct stays 10% → adminAmount = 200M × 0.10 = 20M
      expect(Number(result.adminAmount)).toBeCloseTo(20_000_000, 0);
    });

    it('throws NotFoundException when project not found', async () => {
      prisma.project.findFirst.mockResolvedValue(null);
      await expect(service.update(PROJ_ID, TENANT_A, { name: 'X' })).rejects.toThrow(NotFoundException);
    });
  });

  // ── addPhase ───────────────────────────────────────────────────────────────
  describe('addPhase', () => {
    it('creates a phase linked to the project', async () => {
      prisma.project.findFirst.mockResolvedValue(makeProject());
      prisma.projectPhase.create.mockResolvedValue({ id: PHASE_ID, projectId: PROJ_ID, name: 'Cimentación', order: 1 });
      const result = await service.addPhase(PROJ_ID, TENANT_A, { name: 'Cimentación', order: 1 });
      expect(result.projectId).toBe(PROJ_ID);
      expect(result.name).toBe('Cimentación');
    });
  });

  // ── updatePhaseProgress ────────────────────────────────────────────────────
  describe('updatePhaseProgress', () => {
    it('updates actualPct on the phase', async () => {
      prisma.projectPhase.findFirst.mockResolvedValue({ id: PHASE_ID, projectId: PROJ_ID });
      prisma.projectPhase.update.mockResolvedValue({ id: PHASE_ID, actualPct: 75 });
      const result = await service.updatePhaseProgress(PHASE_ID, TENANT_A, 75);
      expect(Number(result.actualPct)).toBe(75);
    });

    it('throws NotFoundException when phase not found', async () => {
      prisma.projectPhase.findFirst.mockResolvedValue(null);
      await expect(service.updatePhaseProgress(PHASE_ID, TENANT_A, 50)).rejects.toThrow(NotFoundException);
    });
  });

  // ── Tenant isolation ───────────────────────────────────────────────────────
  describe('tenant isolation', () => {
    it('findOne scopes project query to tenantId', async () => {
      prisma.project.findFirst.mockResolvedValue(null);
      await service.findOne(PROJ_ID, TENANT_A).catch(() => {});
      const query = prisma.project.findFirst.mock.calls[0][0];
      expect(query.where.tenantId).toBe(TENANT_A);
    });
  });
});

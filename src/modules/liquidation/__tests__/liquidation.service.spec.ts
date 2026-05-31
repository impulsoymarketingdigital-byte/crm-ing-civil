import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { LiquidationService } from '../application/liquidation.service';

const TENANT_A  = 'tenant-aa-0000-0000-0000-000000000001';
const PROJ_ID   = 'proj-000-0000-0000-0000-000000000001';
const BUDGET_ID = 'budget-00-0000-0000-0000-000000000001';
const LIQ_ID    = 'liq-0000-0000-0000-0000-000000000001';

function makePrisma() {
  return {
    projectLiquidation: {
      findFirst: jest.fn(), create: jest.fn(), update: jest.fn(),
    },
    projectCertificate: { findMany: jest.fn() },
    officialBudget:     { findFirst: jest.fn() },
  };
}

function makeLiq(overrides: any = {}) {
  return {
    id: LIQ_ID, tenantId: TENANT_A, projectId: PROJ_ID, budgetId: BUDGET_ID,
    status: 'DRAFT',
    liquidationDate: new Date(),
    contractValue: '10000000', additionsValue: '0', totalContractValue: '10000000',
    totalExecuted: '8000000', totalRetained: '400000',
    totalDeductions: '200000', netBalance: '7400000',
    notes: null, createdAt: new Date(), updatedAt: new Date(),
    deductions: [],
    ...overrides,
  };
}

function makeCert(gross: number, retention: number) {
  return {
    id: `cert-${Math.random()}`, projectId: PROJ_ID, status: 'APPROVED',
    grossAmount: gross.toString(), retentionAmount: retention.toString(),
    netAmount: (gross - retention).toString(),
    cumulativeAmount: gross.toString(), cumulativePct: '25',
  };
}

const BASE_DTO = {
  projectId: PROJ_ID, budgetId: BUDGET_ID,
  liquidationDate: '2025-12-31',
  contractValue: 10_000_000,
  additionsValue: 0,
  deductions: [
    { type: 'ANTICIPO' as const, description: 'Descuento anticipo', amount: 200_000 },
  ],
};

// ══════════════════════════════════════════════════════════════════════════════
describe('LiquidationService', () => {
  let service: LiquidationService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
    service = new LiquidationService(prisma as any);
    jest.clearAllMocks();
  });

  // ── create ─────────────────────────────────────────────────────────────────
  describe('create', () => {
    function setupCreate(certs: any[] = [], existingLiq: any = null) {
      prisma.projectLiquidation.findFirst.mockResolvedValue(existingLiq);
      prisma.projectCertificate.findMany.mockResolvedValue(certs);
      prisma.projectLiquidation.create.mockImplementation(({ data }: any) =>
        Promise.resolve({ id: LIQ_ID, ...data, deductions: data.deductions?.create ?? [] }),
      );
    }

    it('throws ConflictException when liquidation already exists', async () => {
      setupCreate([], makeLiq());
      await expect(service.create(TENANT_A, BASE_DTO)).rejects.toThrow(ConflictException);
    });

    it('totalExecuted = sum of grossAmount from approved/paid certs', async () => {
      setupCreate([makeCert(3_000_000, 150_000), makeCert(2_000_000, 100_000)]);
      const result = await service.create(TENANT_A, BASE_DTO);
      expect(Number(result.totalExecuted)).toBeCloseTo(5_000_000, 0);
    });

    it('totalRetained = sum of retentionAmount from approved/paid certs', async () => {
      setupCreate([makeCert(3_000_000, 150_000), makeCert(2_000_000, 100_000)]);
      const result = await service.create(TENANT_A, BASE_DTO);
      expect(Number(result.totalRetained)).toBeCloseTo(250_000, 0);
    });

    it('totalDeductions = sum of all deduction amounts in DTO', async () => {
      setupCreate([]);
      const result = await service.create(TENANT_A, {
        ...BASE_DTO,
        deductions: [
          { type: 'ANTICIPO' as const, description: 'Anticipo', amount: 200_000 },
          { type: 'MULTA' as const, description: 'Multa', amount: 50_000 },
        ],
      });
      expect(Number(result.totalDeductions)).toBeCloseTo(250_000, 0);
    });

    it('netBalance = totalExecuted - totalRetained - totalDeductions', async () => {
      setupCreate([makeCert(5_000_000, 250_000)]);
      const result = await service.create(TENANT_A, {
        ...BASE_DTO,
        deductions: [{ type: 'ANTICIPO' as const, description: 'Desc', amount: 200_000 }],
      });
      // totalExecuted=5M, retained=250K, deductions=200K → netBalance=4,550,000
      expect(Number(result.netBalance)).toBeCloseTo(4_550_000, 0);
    });

    it('totalContractValue = contractValue + additionsValue', async () => {
      setupCreate([]);
      const result = await service.create(TENANT_A, {
        ...BASE_DTO, contractValue: 8_000_000, additionsValue: 2_000_000,
      });
      expect(Number(result.totalContractValue)).toBeCloseTo(10_000_000, 0);
    });

    it('additionsValue defaults to 0 when not provided', async () => {
      setupCreate([]);
      const { additionsValue, ...dtoNoAdd } = BASE_DTO;
      const result = await service.create(TENANT_A, dtoNoAdd as any);
      expect(Number(result.additionsValue)).toBe(0);
    });

    it('persists deductions with correct type, description, amount', async () => {
      setupCreate([]);
      await service.create(TENANT_A, BASE_DTO);
      const createArgs = prisma.projectLiquidation.create.mock.calls[0][0];
      const deductionCreate = createArgs.data.deductions.create;
      expect(deductionCreate).toHaveLength(1);
      expect(deductionCreate[0].type).toBe('ANTICIPO');
      expect(Number(deductionCreate[0].amount)).toBe(200_000);
    });

    it('status is DRAFT on creation', async () => {
      setupCreate([]);
      const result = await service.create(TENANT_A, BASE_DTO);
      expect(result.status).toBe('DRAFT');
    });
  });

  // ── finalize ───────────────────────────────────────────────────────────────
  describe('finalize', () => {
    it('changes status to FINAL', async () => {
      prisma.projectLiquidation.findFirst.mockResolvedValue(makeLiq({ status: 'DRAFT' }));
      prisma.projectLiquidation.update.mockResolvedValue(makeLiq({ status: 'FINAL' }));
      const result = await service.finalize(LIQ_ID, TENANT_A);
      expect(result.status).toBe('FINAL');
    });

    it('throws BadRequestException when already FINAL', async () => {
      prisma.projectLiquidation.findFirst.mockResolvedValue(makeLiq({ status: 'FINAL' }));
      await expect(service.finalize(LIQ_ID, TENANT_A)).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when not found', async () => {
      prisma.projectLiquidation.findFirst.mockResolvedValue(null);
      await expect(service.finalize(LIQ_ID, TENANT_A)).rejects.toThrow(NotFoundException);
    });
  });

  // ── Tenant isolation ───────────────────────────────────────────────────────
  describe('tenant isolation', () => {
    it('findOne scopes query to tenantId', async () => {
      prisma.projectLiquidation.findFirst.mockResolvedValue(null);
      await service.findOne(LIQ_ID, TENANT_A).catch(() => {});
      const query = prisma.projectLiquidation.findFirst.mock.calls[0][0];
      expect(query.where.tenantId).toBe(TENANT_A);
    });
  });
});

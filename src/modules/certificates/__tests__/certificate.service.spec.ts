import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CertificateService } from '../application/certificate.service';

const TENANT_A  = 'tenant-aa-0000-0000-0000-000000000001';
const PROJ_ID   = 'proj-000-0000-0000-0000-000000000001';
const BUDGET_ID = 'budget-00-0000-0000-0000-000000000001';
const CERT_ID   = 'cert-000-0000-0000-0000-000000000001';
const LINE_ID   = 'bline-00-0000-0000-0000-000000000001';

function makePrisma() {
  return {
    projectCertificate: {
      findFirst: jest.fn(), findMany:  jest.fn(), create: jest.fn(), update: jest.fn(),
    },
    officialBudget: { findFirst: jest.fn() },
  };
}

function makeCert(overrides: any = {}) {
  return {
    id: CERT_ID, tenantId: TENANT_A, projectId: PROJ_ID, budgetId: BUDGET_ID,
    number: 1, name: 'Acta 1', certDate: new Date(),
    status: 'DRAFT', retentionPct: '0.05',
    grossAmount: '1000000', retentionAmount: '50000', netAmount: '950000',
    cumulativeAmount: '1000000', cumulativePct: '25.0000',
    notes: null, approvedAt: null, paidAt: null,
    createdAt: new Date(), updatedAt: new Date(),
    ...overrides,
  };
}

const BASE_DTO = {
  projectId: PROJ_ID, budgetId: BUDGET_ID,
  certDate: '2025-03-31', retentionPct: 0.05,
  lines: [{
    budgetLineId: LINE_ID,
    description: 'Excavación',
    unit: 'M3',
    totalQuantityBudgeted: 200,
    previousQuantity: 0,
    currentQuantity: 50,
    unitCost: 20_000,
  }],
};

// ══════════════════════════════════════════════════════════════════════════════
describe('CertificateService', () => {
  let service: CertificateService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
    service = new CertificateService(prisma as any);
    jest.clearAllMocks();
  });

  // ── create ─────────────────────────────────────────────────────────────────
  describe('create', () => {
    function setupCreate(prevCerts: any[] = []) {
      prisma.projectCertificate.findFirst.mockResolvedValue(null); // no last cert
      prisma.projectCertificate.findMany
        .mockResolvedValueOnce(prevCerts)    // approved/paid certs for prev cumulative
        .mockResolvedValueOnce([]);          // (any further calls)
      prisma.officialBudget.findFirst.mockResolvedValue({
        id: BUDGET_ID, tenantId: TENANT_A, totalBudget: '4000000',
      });
      prisma.projectCertificate.create.mockImplementation(({ data }: any) =>
        Promise.resolve({ id: CERT_ID, ...data, lines: data.lines?.create ?? [] }),
      );
    }

    it('auto-assigns number=1 for first certificate', async () => {
      setupCreate();
      const result = await service.create(TENANT_A, BASE_DTO);
      expect(result.number).toBe(1);
    });

    it('auto-assigns number = last + 1', async () => {
      prisma.projectCertificate.findFirst.mockResolvedValue({ number: 3 });
      prisma.projectCertificate.findMany.mockResolvedValue([]);
      prisma.officialBudget.findFirst.mockResolvedValue({ id: BUDGET_ID, totalBudget: '4000000' });
      prisma.projectCertificate.create.mockImplementation(({ data }: any) =>
        Promise.resolve({ id: CERT_ID, ...data, lines: [] }),
      );
      const result = await service.create(TENANT_A, BASE_DTO);
      expect(result.number).toBe(4);
    });

    it('grossAmount = sum of (currentQty × unitCost) across lines', async () => {
      setupCreate();
      const result = await service.create(TENANT_A, BASE_DTO);
      // 50 M3 × $20,000 = $1,000,000
      expect(Number(result.grossAmount)).toBeCloseTo(1_000_000, 0);
    });

    it('retentionAmount = grossAmount × retentionPct (5%)', async () => {
      setupCreate();
      const result = await service.create(TENANT_A, BASE_DTO);
      expect(Number(result.retentionAmount)).toBeCloseTo(50_000, 0);
    });

    it('netAmount = grossAmount - retentionAmount', async () => {
      setupCreate();
      const result = await service.create(TENANT_A, BASE_DTO);
      expect(Number(result.netAmount)).toBeCloseTo(950_000, 0);
    });

    it('cumulativeAmount adds previous certified amounts', async () => {
      const prevCert = { ...makeCert(), grossAmount: '500000' };
      setupCreate([prevCert]);
      const result = await service.create(TENANT_A, BASE_DTO);
      // prev=500K + current=1M = 1.5M cumulative
      expect(Number(result.cumulativeAmount)).toBeCloseTo(1_500_000, 0);
    });

    it('cumulativePct = cumulativeAmount / totalBudget × 100', async () => {
      setupCreate(); // totalBudget = 4,000,000, grossAmount = 1,000,000
      const result = await service.create(TENANT_A, BASE_DTO);
      // cumulativeAmount = 1,000,000; totalBudget = 4,000,000 → 25%
      expect(Number(result.cumulativePct)).toBeCloseTo(25, 1);
    });

    it('line.cumulativeQuantity = previousQty + currentQty', async () => {
      setupCreate();
      const dto = {
        ...BASE_DTO,
        lines: [{ ...BASE_DTO.lines[0], previousQuantity: 30, currentQuantity: 20 }],
      };
      await service.create(TENANT_A, dto);
      const createArgs = prisma.projectCertificate.create.mock.calls[0][0];
      const line = createArgs.data.lines.create[0];
      expect(Number(line.cumulativeQuantity)).toBeCloseTo(50, 2);
    });

    it('line.executedPct = (cumulative / totalBudgeted) × 100', async () => {
      setupCreate();
      const dto = {
        ...BASE_DTO,
        lines: [{ ...BASE_DTO.lines[0], totalQuantityBudgeted: 200, previousQuantity: 0, currentQuantity: 50 }],
      };
      await service.create(TENANT_A, dto);
      const createArgs = prisma.projectCertificate.create.mock.calls[0][0];
      const line = createArgs.data.lines.create[0];
      // 50/200 × 100 = 25%
      expect(Number(line.executedPct)).toBeCloseTo(25, 1);
    });

    it('throws NotFoundException when budget not found', async () => {
      prisma.projectCertificate.findFirst.mockResolvedValue(null);
      prisma.projectCertificate.findMany.mockResolvedValue([]);
      prisma.officialBudget.findFirst.mockResolvedValue(null);
      await expect(service.create(TENANT_A, BASE_DTO)).rejects.toThrow(NotFoundException);
    });
  });

  // ── approve ────────────────────────────────────────────────────────────────
  describe('approve', () => {
    it('approves a DRAFT certificate', async () => {
      prisma.projectCertificate.findFirst.mockResolvedValue(makeCert({ status: 'DRAFT' }));
      prisma.projectCertificate.update.mockResolvedValue(makeCert({ status: 'APPROVED', approvedAt: new Date() }));
      const result = await service.approve(CERT_ID, TENANT_A);
      expect(result.status).toBe('APPROVED');
    });

    it('approves a SUBMITTED certificate', async () => {
      prisma.projectCertificate.findFirst.mockResolvedValue(makeCert({ status: 'SUBMITTED' }));
      prisma.projectCertificate.update.mockResolvedValue(makeCert({ status: 'APPROVED' }));
      await expect(service.approve(CERT_ID, TENANT_A)).resolves.toBeDefined();
    });

    it('throws BadRequestException when already PAID', async () => {
      prisma.projectCertificate.findFirst.mockResolvedValue(makeCert({ status: 'PAID' }));
      await expect(service.approve(CERT_ID, TENANT_A)).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when VOIDED', async () => {
      prisma.projectCertificate.findFirst.mockResolvedValue(makeCert({ status: 'VOIDED' }));
      await expect(service.approve(CERT_ID, TENANT_A)).rejects.toThrow(BadRequestException);
    });
  });

  // ── markPaid / void ────────────────────────────────────────────────────────
  describe('markPaid', () => {
    it('sets status=PAID and paidAt', async () => {
      prisma.projectCertificate.findFirst.mockResolvedValue(makeCert());
      prisma.projectCertificate.update.mockResolvedValue(makeCert({ status: 'PAID', paidAt: new Date() }));
      const result = await service.markPaid(CERT_ID, TENANT_A);
      expect(result.status).toBe('PAID');
      const updateArgs = prisma.projectCertificate.update.mock.calls[0][0];
      expect(updateArgs.data.paidAt).toBeInstanceOf(Date);
    });
  });

  describe('void', () => {
    it('sets status=VOIDED', async () => {
      prisma.projectCertificate.findFirst.mockResolvedValue(makeCert());
      prisma.projectCertificate.update.mockResolvedValue(makeCert({ status: 'VOIDED' }));
      const result = await service.void(CERT_ID, TENANT_A);
      expect(result.status).toBe('VOIDED');
    });
  });
});

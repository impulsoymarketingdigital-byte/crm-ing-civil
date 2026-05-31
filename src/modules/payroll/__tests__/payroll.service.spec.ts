import { ConflictException, NotFoundException } from '@nestjs/common';
import { PayrollService } from '../application/payroll.service';
import {
  SMMLV_2025, TRANSPORT_ALLOWANCE_2025, TRANSPORT_THRESHOLD,
  HEALTH_EMPLOYEE_PCT, PENSION_EMPLOYEE_PCT,
  HEALTH_EMPLOYER_PCT, PENSION_EMPLOYER_PCT,
  SENA_PCT, ICBF_PCT, COMPENSATION_BOX_PCT, ARL_RATES,
  PRIMA_MONTHLY_PCT, CESANTIAS_MONTHLY_PCT,
  CESANTIAS_INTEREST_MONTHLY_PCT, VACACIONES_MONTHLY_PCT,
} from '../application/payroll.constants';
import { Prisma } from '@prisma/client';

// ── Fixtures ──────────────────────────────────────────────────────────────────
const TENANT_A = 'tenant-aa-0000-0000-0000-000000000001';
const EMP_ID   = 'emp-00000-0000-0000-0000-000000000001';
const D = (n: number | string) => new Prisma.Decimal(n.toString());

function makeEmployee(overrides: Partial<{
  baseSalary: number; transportAllowance: boolean; riskLevel: string;
}> = {}) {
  const salary = overrides.baseSalary ?? 2_000_000;
  return {
    id: EMP_ID, tenantId: TENANT_A, code: 'EMP-001',
    firstName: 'Juan', lastName: 'Pérez', document: '1234567890',
    position: 'Operario', department: 'Obra',
    contractType: 'INDEFINIDO',
    baseSalary: D(salary),
    transportAllowance: overrides.transportAllowance ?? (salary <= TRANSPORT_THRESHOLD),
    riskLevel: overrides.riskLevel ?? 'I',
    eps: 'Sura', pensionFund: 'Protección', compensationBox: 'Comfama',
    startDate: new Date('2024-01-01'), endDate: null, isActive: true,
    createdAt: new Date(), updatedAt: new Date(),
  };
}

function makePrisma() {
  return {
    employee: {
      findFirst: jest.fn(),
      findMany:  jest.fn(),
      create:    jest.fn(),
      update:    jest.fn(),
    },
    payrollPeriod: {
      findFirst: jest.fn(),
      findMany:  jest.fn(),
      create:    jest.fn(),
      update:    jest.fn(),
    },
  };
}

// ── Helper: round to 2 decimals (matches service impl) ───────────────────────
const r2 = (n: number) => Math.round(n * 100) / 100;

// ═════════════════════════════════════════════════════════════════════════════
describe('PayrollService', () => {
  let service: PayrollService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
    service = new PayrollService(prisma as any);
    jest.clearAllMocks();
  });

  // ── Constants sanity ───────────────────────────────────────────────────────
  describe('Colombian labor constants (2025)', () => {
    it('SMMLV is $1,423,500', () => expect(SMMLV_2025).toBe(1_423_500));
    it('transport allowance is $200,000', () => expect(TRANSPORT_ALLOWANCE_2025).toBe(200_000));
    it('transport threshold is 2 × SMMLV', () => expect(TRANSPORT_THRESHOLD).toBe(2_847_000));
    it('health employee = 4%', () => expect(HEALTH_EMPLOYEE_PCT).toBeCloseTo(0.04));
    it('pension employee = 4%', () => expect(PENSION_EMPLOYEE_PCT).toBeCloseTo(0.04));
    it('health employer = 8.5%', () => expect(HEALTH_EMPLOYER_PCT).toBeCloseTo(0.085));
    it('pension employer = 12%', () => expect(PENSION_EMPLOYER_PCT).toBeCloseTo(0.12));
    it('SENA = 2%', () => expect(SENA_PCT).toBeCloseTo(0.02));
    it('ICBF = 3%', () => expect(ICBF_PCT).toBeCloseTo(0.03));
    it('caja compensación = 4%', () => expect(COMPENSATION_BOX_PCT).toBeCloseTo(0.04));
    it('ARL level I = 0.522%', () => expect(ARL_RATES['I']).toBeCloseTo(0.00522));
    it('ARL level V = 6.96%',  () => expect(ARL_RATES['V']).toBeCloseTo(0.0696));
  });

  // ── createEmployee ─────────────────────────────────────────────────────────
  describe('createEmployee', () => {
    const dto = {
      code: 'EMP-001', firstName: 'Juan', lastName: 'Pérez',
      document: '1234567890', position: 'Operario',
      baseSalary: 2_000_000, startDate: '2024-01-01',
    };

    it('throws ConflictException when code already exists', async () => {
      prisma.employee.findFirst.mockResolvedValue(makeEmployee());
      await expect(service.createEmployee(TENANT_A, dto)).rejects.toThrow(ConflictException);
      expect(prisma.employee.create).not.toHaveBeenCalled();
    });

    it('auto-enables transport allowance when salary ≤ 2 SMMLV', async () => {
      prisma.employee.findFirst.mockResolvedValue(null);
      prisma.employee.create.mockResolvedValue(makeEmployee({ transportAllowance: true }));

      await service.createEmployee(TENANT_A, { ...dto, baseSalary: 2_000_000 });

      const createArgs = prisma.employee.create.mock.calls[0][0];
      expect(createArgs.data.transportAllowance).toBe(true);
    });

    it('disables transport allowance when salary > 2 SMMLV', async () => {
      prisma.employee.findFirst.mockResolvedValue(null);
      prisma.employee.create.mockResolvedValue(makeEmployee({ transportAllowance: false }));

      await service.createEmployee(TENANT_A, { ...dto, baseSalary: 3_000_000 });

      const createArgs = prisma.employee.create.mock.calls[0][0];
      expect(createArgs.data.transportAllowance).toBe(false);
    });

    it('allows explicit override of transportAllowance', async () => {
      prisma.employee.findFirst.mockResolvedValue(null);
      prisma.employee.create.mockResolvedValue(makeEmployee());

      await service.createEmployee(TENANT_A, { ...dto, baseSalary: 3_000_000, transportAllowance: true });
      const createArgs = prisma.employee.create.mock.calls[0][0];
      expect(createArgs.data.transportAllowance).toBe(true);
    });
  });

  // ── createPeriod — payroll calculation engine ──────────────────────────────
  describe('createPeriod', () => {
    const SALARY = 2_000_000;
    const dto = {
      employeeId: EMP_ID, year: 2025, month: 1, fortnight: 0,
    };

    function setupPeriod(salaryOverride = SALARY, riskLevel = 'I', transport = true) {
      const emp = makeEmployee({ baseSalary: salaryOverride, riskLevel, transportAllowance: transport });
      prisma.employee.findFirst.mockResolvedValue(emp);
      prisma.payrollPeriod.findFirst.mockResolvedValue(null); // no duplicate
      prisma.payrollPeriod.create.mockImplementation(({ data }: any) =>
        Promise.resolve({ id: 'period-001', ...data }),
      );
      return emp;
    }

    it('throws ConflictException on duplicate period', async () => {
      prisma.employee.findFirst.mockResolvedValue(makeEmployee());
      prisma.payrollPeriod.findFirst.mockResolvedValue({ id: 'existing' });

      await expect(service.createPeriod(TENANT_A, dto)).rejects.toThrow(ConflictException);
    });

    it('baseSalary equals fullSalary for monthly (fortnight=0)', async () => {
      setupPeriod();
      const result = await service.createPeriod(TENANT_A, { ...dto, fortnight: 0 });
      expect(Number(result.baseSalary)).toBe(SALARY);
    });

    it('baseSalary = salary/2 for quincena (fortnight=1 or 2)', async () => {
      setupPeriod();
      const result = await service.createPeriod(TENANT_A, { ...dto, fortnight: 1 });
      expect(Number(result.baseSalary)).toBeCloseTo(SALARY / 2);
    });

    it('includes transport allowance when employee has it (monthly)', async () => {
      setupPeriod(SALARY, 'I', true);
      const result = await service.createPeriod(TENANT_A, dto);
      expect(Number(result.transportAllowance)).toBe(TRANSPORT_ALLOWANCE_2025);
    });

    it('transport = 0 when employee flag is false', async () => {
      setupPeriod(3_000_000, 'I', false);
      const result = await service.createPeriod(TENANT_A, { ...dto });
      expect(Number(result.transportAllowance)).toBe(0);
    });

    it('transport = half when quincena', async () => {
      setupPeriod(SALARY, 'I', true);
      const result = await service.createPeriod(TENANT_A, { ...dto, fortnight: 1 });
      expect(Number(result.transportAllowance)).toBeCloseTo(TRANSPORT_ALLOWANCE_2025 / 2);
    });

    it('employee health deduction = 4% of contributionBase', async () => {
      setupPeriod(SALARY, 'I', false); // no transport → contributionBase = SALARY
      const result = await service.createPeriod(TENANT_A, dto);
      const expected = r2(SALARY * HEALTH_EMPLOYEE_PCT);
      expect(Number(result.healthEmployee)).toBeCloseTo(expected);
    });

    it('employee pension deduction = 4% of contributionBase', async () => {
      setupPeriod(SALARY, 'I', false);
      const result = await service.createPeriod(TENANT_A, dto);
      expect(Number(result.pensionEmployee)).toBeCloseTo(r2(SALARY * PENSION_EMPLOYEE_PCT));
    });

    it('netPay = totalEarned - totalDeductions', async () => {
      setupPeriod(SALARY, 'I', false);
      const result = await service.createPeriod(TENANT_A, dto);
      const expected = r2(Number(result.totalEarned) - Number(result.totalDeductions));
      expect(Number(result.netPay)).toBeCloseTo(expected, 1);
    });

    it('employer health = 8.5% of contributionBase', async () => {
      setupPeriod(SALARY, 'I', false);
      const result = await service.createPeriod(TENANT_A, dto);
      expect(Number(result.healthEmployer)).toBeCloseTo(r2(SALARY * HEALTH_EMPLOYER_PCT));
    });

    it('employer pension = 12% of contributionBase', async () => {
      setupPeriod(SALARY, 'I', false);
      const result = await service.createPeriod(TENANT_A, dto);
      expect(Number(result.pensionEmployer)).toBeCloseTo(r2(SALARY * PENSION_EMPLOYER_PCT));
    });

    it('SENA = 2%, ICBF = 3%, Caja = 4%', async () => {
      setupPeriod(SALARY, 'I', false);
      const result = await service.createPeriod(TENANT_A, dto);
      expect(Number(result.sena)).toBeCloseTo(r2(SALARY * SENA_PCT));
      expect(Number(result.icbf)).toBeCloseTo(r2(SALARY * ICBF_PCT));
      expect(Number(result.compensationBox)).toBeCloseTo(r2(SALARY * COMPENSATION_BOX_PCT));
    });

    it('ARL level I = 0.522% of contributionBase', async () => {
      setupPeriod(SALARY, 'I', false);
      const result = await service.createPeriod(TENANT_A, dto);
      expect(Number(result.arl)).toBeCloseTo(r2(SALARY * ARL_RATES['I']));
    });

    it('ARL level V = 6.96% of contributionBase', async () => {
      setupPeriod(SALARY, 'V', false);
      const result = await service.createPeriod(TENANT_A, dto);
      expect(Number(result.arl)).toBeCloseTo(r2(SALARY * ARL_RATES['V']));
    });

    it('prima monthly accrual = salary × (1/12)', async () => {
      setupPeriod(SALARY, 'I', false);
      const result = await service.createPeriod(TENANT_A, dto);
      expect(Number(result.prima)).toBeCloseTo(r2(SALARY * PRIMA_MONTHLY_PCT));
    });

    it('cesantías monthly accrual = salary × (1/12)', async () => {
      setupPeriod(SALARY, 'I', false);
      const result = await service.createPeriod(TENANT_A, dto);
      expect(Number(result.cesantias)).toBeCloseTo(r2(SALARY * CESANTIAS_MONTHLY_PCT));
    });

    it('intereses cesantías monthly = salary × (12%/12)', async () => {
      setupPeriod(SALARY, 'I', false);
      const result = await service.createPeriod(TENANT_A, dto);
      expect(Number(result.interesesCesantias)).toBeCloseTo(r2(SALARY * CESANTIAS_INTEREST_MONTHLY_PCT));
    });

    it('vacaciones monthly = salary × (15days/360days = 4.17%)', async () => {
      setupPeriod(SALARY, 'I', false);
      const result = await service.createPeriod(TENANT_A, dto);
      expect(Number(result.vacaciones)).toBeCloseTo(r2(SALARY * VACACIONES_MONTHLY_PCT));
    });

    it('totalLaborCost = netPay + totalEmployerContrib + all prestaciones', async () => {
      setupPeriod(SALARY, 'I', false);
      const result = await service.createPeriod(TENANT_A, dto);
      const expected = r2(
        Number(result.netPay) +
        Number(result.totalEmployerContrib) +
        Number(result.prima) +
        Number(result.cesantias) +
        Number(result.interesesCesantias) +
        Number(result.vacaciones),
      );
      expect(Number(result.totalLaborCost)).toBeCloseTo(expected, 1);
    });

    it('overtime amounts are added to totalEarned', async () => {
      setupPeriod(SALARY, 'I', false);
      const result = await service.createPeriod(TENANT_A, {
        ...dto,
        overtimeDayPct25: 50_000,
        bonuses: 100_000,
      });
      expect(Number(result.totalEarned)).toBeCloseTo(SALARY + 50_000 + 100_000);
    });

    it('contributionBase excludes transport allowance', async () => {
      // salary = 2M, transport = 200K → contributionBase should be 2M
      // healthEmployee = 4% × 2M = 80,000 (NOT 4% × 2.2M)
      setupPeriod(SALARY, 'I', true);
      const result = await service.createPeriod(TENANT_A, dto);
      expect(Number(result.healthEmployee)).toBeCloseTo(r2(SALARY * HEALTH_EMPLOYEE_PCT));
    });

    it('status defaults to DRAFT', async () => {
      setupPeriod();
      const result = await service.createPeriod(TENANT_A, dto);
      expect(result.status).toBe('DRAFT');
    });
  });

  // ── approvePeriod / markPaid ───────────────────────────────────────────────
  describe('approvePeriod', () => {
    it('throws NotFoundException when period does not exist', async () => {
      prisma.payrollPeriod.findFirst.mockResolvedValue(null);
      await expect(service.approvePeriod('non-existent', TENANT_A)).rejects.toThrow(NotFoundException);
    });

    it('sets status to APPROVED', async () => {
      prisma.payrollPeriod.findFirst.mockResolvedValue({ id: 'p-1', tenantId: TENANT_A });
      prisma.payrollPeriod.update.mockResolvedValue({ id: 'p-1', status: 'APPROVED' });

      const result = await service.approvePeriod('p-1', TENANT_A);
      expect(result.status).toBe('APPROVED');
      const updateArgs = prisma.payrollPeriod.update.mock.calls[0][0];
      expect(updateArgs.data.status).toBe('APPROVED');
    });
  });

  describe('markPaid', () => {
    it('sets status to PAID and records paidAt', async () => {
      prisma.payrollPeriod.findFirst.mockResolvedValue({ id: 'p-1', tenantId: TENANT_A });
      prisma.payrollPeriod.update.mockResolvedValue({ id: 'p-1', status: 'PAID', paidAt: new Date() });

      await service.markPaid('p-1', TENANT_A);
      const updateArgs = prisma.payrollPeriod.update.mock.calls[0][0];
      expect(updateArgs.data.status).toBe('PAID');
      expect(updateArgs.data.paidAt).toBeInstanceOf(Date);
    });
  });

  // ── Tenant isolation ───────────────────────────────────────────────────────
  describe('tenant isolation', () => {
    it('findEmployee query is scoped to tenantId', async () => {
      prisma.employee.findFirst.mockResolvedValue(null);
      await service.findEmployee(EMP_ID, TENANT_A).catch(() => {});
      const query = prisma.employee.findFirst.mock.calls[0][0];
      expect(query.where.tenantId).toBe(TENANT_A);
    });
  });
});

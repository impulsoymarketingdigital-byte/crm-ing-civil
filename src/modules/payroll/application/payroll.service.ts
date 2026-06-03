import { ConflictException, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { CreateEmployeeDto } from '../domain/dto/create-employee.dto';
import { CreatePayrollPeriodDto } from '../domain/dto/create-payroll-period.dto';
import {
  TRANSPORT_ALLOWANCE_2025, TRANSPORT_THRESHOLD,
  HEALTH_EMPLOYEE_PCT, PENSION_EMPLOYEE_PCT,
  HEALTH_EMPLOYER_PCT, PENSION_EMPLOYER_PCT,
  SENA_PCT, ICBF_PCT, COMPENSATION_BOX_PCT, ARL_RATES,
  PRIMA_MONTHLY_PCT, CESANTIAS_MONTHLY_PCT,
  CESANTIAS_INTEREST_MONTHLY_PCT, VACACIONES_MONTHLY_PCT,
} from './payroll.constants';

const round2 = (n: number) => Math.round(n * 100) / 100;

@Injectable()
export class PayrollService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Employees ─────────────────────────────────────────────────────────────

  findAllEmployees(tenantId: string) {
    return this.prisma.employee.findMany({
      where: { tenantId, isActive: true },
      orderBy: { code: 'asc' },
    });
  }

  async findEmployee(id: string, tenantId: string) {
    const emp = await this.prisma.employee.findFirst({ where: { id, tenantId } });
    if (!emp) throw new NotFoundException('Employee not found');
    return emp;
  }

  async createEmployee(tenantId: string, dto: CreateEmployeeDto) {
    const exists = await this.prisma.employee.findFirst({
      where: { tenantId, code: dto.code },
    });
    if (exists) throw new ConflictException(`Employee code "${dto.code}" already exists`);

    const salary = dto.baseSalary;
    const transport = dto.transportAllowance ?? salary <= TRANSPORT_THRESHOLD;

    return this.prisma.employee.create({
      data: {
        tenantId,
        code: dto.code,
        firstName: dto.firstName,
        lastName: dto.lastName,
        document: dto.document,
        position: dto.position,
        department: dto.department,
        contractType: dto.contractType ?? 'INDEFINIDO',
        baseSalary: salary,
        transportAllowance: transport,
        riskLevel: dto.riskLevel ?? 'I',
        eps: dto.eps,
        pensionFund: dto.pensionFund,
        compensationBox: dto.compensationBox,
        bankAccount: dto.bankAccount,
        bankAccountType: dto.bankAccountType ?? 'Savings',
        bankName: dto.bankName ?? 'Bancolombia',
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
    });
  }

  async deactivateEmployee(id: string, tenantId: string) {
    await this.findEmployee(id, tenantId);
    return this.prisma.employee.update({ where: { id }, data: { isActive: false } });
  }

  // ── Payroll Periods ───────────────────────────────────────────────────────

  async findPeriods(tenantId: string, year?: number, month?: number) {
    return this.prisma.payrollPeriod.findMany({
      where: {
        tenantId,
        ...(year ? { year } : {}),
        ...(month ? { month } : {}),
      },
      include: { employee: { select: { firstName: true, lastName: true, code: true } } },
      orderBy: [{ year: 'desc' }, { month: 'desc' }, { employeeId: 'asc' }],
    });
  }

  async findPeriod(id: string, tenantId: string) {
    const p = await this.prisma.payrollPeriod.findFirst({
      where: { id, tenantId },
      include: { employee: true },
    });
    if (!p) throw new NotFoundException('Payroll period not found');
    return p;
  }

  async createPeriod(tenantId: string, dto: CreatePayrollPeriodDto) {
    const employee = await this.findEmployee(dto.employeeId, tenantId);

    const fortnight = dto.fortnight ?? 0;
    const existing = await this.prisma.payrollPeriod.findFirst({
      where: { tenantId, employeeId: dto.employeeId, year: dto.year, month: dto.month, fortnight },
    });
    if (existing) throw new ConflictException('Payroll period already exists for this employee/period');

    // ── Base salary (pro-rated for quincena) ─────────────────────────────
    const fullSalary = Number(employee.baseSalary);
    const baseSalary = fortnight !== 0 ? round2(fullSalary / 2) : fullSalary;

    // ── Auxilio de transporte ────────────────────────────────────────────
    const transportBase = employee.transportAllowance ? TRANSPORT_ALLOWANCE_2025 : 0;
    const transportAllowance = fortnight !== 0 ? round2(transportBase / 2) : transportBase;

    // ── Horas extra y otros devengos ─────────────────────────────────────
    const overtimeDayPct25      = dto.overtimeDayPct25      ?? 0;
    const overtimeNightPct75    = dto.overtimeNightPct75    ?? 0;
    const overtimeHolidayPct75  = dto.overtimeHolidayPct75  ?? 0;
    const overtimeHolidayPct100 = dto.overtimeHolidayPct100 ?? 0;
    const bonuses               = dto.bonuses               ?? 0;

    const totalEarned = round2(
      baseSalary + transportAllowance +
      overtimeDayPct25 + overtimeNightPct75 +
      overtimeHolidayPct75 + overtimeHolidayPct100 +
      bonuses,
    );

    // ── Base for social contributions (excludes transport allowance) ────
    const contributionBase = totalEarned - transportAllowance;

    // ── Employee deductions ──────────────────────────────────────────────
    const healthEmployee  = round2(contributionBase * HEALTH_EMPLOYEE_PCT);
    const pensionEmployee = round2(contributionBase * PENSION_EMPLOYEE_PCT);
    const incomeTax       = dto.incomeTax ?? 0;
    const otherDeductions = dto.otherDeductions ?? 0;
    const totalDeductions = round2(healthEmployee + pensionEmployee + incomeTax + otherDeductions);
    const netPay          = round2(totalEarned - totalDeductions);

    // ── Social benefits (accrual for the period) ─────────────────────────
    const periodFraction = fortnight !== 0 ? 0.5 : 1; // months in this period
    const prima               = round2(baseSalary * PRIMA_MONTHLY_PCT * periodFraction);
    const cesantias           = round2(baseSalary * CESANTIAS_MONTHLY_PCT * periodFraction);
    const interesesCesantias  = round2(baseSalary * CESANTIAS_INTEREST_MONTHLY_PCT * periodFraction);
    const vacaciones          = round2(baseSalary * VACACIONES_MONTHLY_PCT * periodFraction);

    // ── Employer contributions ────────────────────────────────────────────
    const healthEmployer  = round2(contributionBase * HEALTH_EMPLOYER_PCT);
    const pensionEmployer = round2(contributionBase * PENSION_EMPLOYER_PCT);
    const arlRate = ARL_RATES[employee.riskLevel] ?? ARL_RATES['I'];
    const arl             = round2(contributionBase * arlRate);
    const sena            = round2(contributionBase * SENA_PCT);
    const icbf            = round2(contributionBase * ICBF_PCT);
    const compensationBox = round2(contributionBase * COMPENSATION_BOX_PCT);
    const totalEmployerContrib = round2(
      healthEmployer + pensionEmployer + arl + sena + icbf + compensationBox,
    );

    // ── Total labor cost ─────────────────────────────────────────────────
    const totalLaborCost = round2(
      netPay + totalEmployerContrib + prima + cesantias + interesesCesantias + vacaciones,
    );

    // ── Period dates ─────────────────────────────────────────────────────
    const startDay = fortnight === 2 ? 16 : 1;
    const endDay   = fortnight === 1 ? 15 : new Date(dto.year, dto.month, 0).getDate();
    const startDate = new Date(dto.year, dto.month - 1, startDay);
    const endDate   = new Date(dto.year, dto.month - 1, endDay);

    return this.prisma.payrollPeriod.create({
      data: {
        tenantId,
        employeeId: dto.employeeId,
        year: dto.year,
        month: dto.month,
        fortnight,
        status: 'DRAFT',
        startDate,
        endDate,
        baseSalary,
        transportAllowance,
        overtimeDayPct25,
        overtimeNightPct75,
        overtimeHolidayPct75,
        overtimeHolidayPct100,
        bonuses,
        totalEarned,
        healthEmployee,
        pensionEmployee,
        incomeTax,
        otherDeductions,
        totalDeductions,
        netPay,
        prima,
        cesantias,
        interesesCesantias,
        vacaciones,
        healthEmployer,
        pensionEmployer,
        arl,
        sena,
        icbf,
        compensationBox,
        totalEmployerContrib,
        totalLaborCost,
        notes: dto.notes,
      },
    });
  }

  async approvePeriod(id: string, tenantId: string) {
    await this.findPeriod(id, tenantId);
    return this.prisma.payrollPeriod.update({ where: { id }, data: { status: 'APPROVED' } });
  }

  async markPaid(id: string, tenantId: string) {
    await this.findPeriod(id, tenantId);
    return this.prisma.payrollPeriod.update({
      where: { id },
      data: { status: 'PAID', paidAt: new Date() },
    });
  }

  /** Monthly payroll summary: total cost per employee */
  async monthlySummary(tenantId: string, year: number, month: number) {
    const periods = await this.prisma.payrollPeriod.findMany({
      where: { tenantId, year, month },
      include: { employee: { select: { firstName: true, lastName: true, code: true } } },
    });
    const totals = periods.reduce(
      (acc, p) => ({
        totalNetPay:        acc.totalNetPay        + Number(p.netPay),
        totalEmployerContrib: acc.totalEmployerContrib + Number(p.totalEmployerContrib),
        totalPrestaciones:  acc.totalPrestaciones  + Number(p.prima) + Number(p.cesantias) + Number(p.interesesCesantias) + Number(p.vacaciones),
        totalLaborCost:     acc.totalLaborCost     + Number(p.totalLaborCost),
      }),
      { totalNetPay: 0, totalEmployerContrib: 0, totalPrestaciones: 0, totalLaborCost: 0 },
    );
    return { year, month, employees: periods.length, ...totals, detail: periods };
  }

  async generateBancolombiaFlatFile(tenantId: string, year: number, month: number, fortnight: number) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Empresa no encontrada');

    const periods = await this.prisma.payrollPeriod.findMany({
      where: { tenantId, year, month, fortnight },
      include: { employee: true },
    });

    if (periods.length === 0) {
      throw new NotFoundException('No se encontraron registros de nómina para este período');
    }

    // Helper functions for fixed width formatting
    const cleanNum = (val: string) => val ? val.replace(/\D/g, '') : '';
    const padZero = (val: string | number, length: number) => String(val).padStart(length, '0');
    const padSpace = (val: string, length: number) => String(val).slice(0, length).padEnd(length, ' ');

    const now = new Date();
    const transmissionDate = [
      padZero(now.getDate(), 2),
      padZero(now.getMonth() + 1, 2),
      String(now.getFullYear()).substring(2),
    ].join('');

    let totalCents = 0;
    const detailLines: string[] = [];

    for (const p of periods) {
      const netPay = Number(p.netPay);
      if (netPay <= 0) continue;

      const cents = Math.round(netPay * 100);
      totalCents += cents;

      const docClean = cleanNum(p.employee.document);
      const docFormatted = padZero(docClean, 15);
      const nameFormatted = padSpace(`${p.employee.firstName} ${p.employee.lastName}`.trim().toUpperCase(), 30);
      
      const empAccountClean = cleanNum(p.employee.bankAccount ?? '');
      const accountFormatted = padZero(empAccountClean || docClean, 17); // fallback to document
      
      const accountTypeFormatted = p.employee.bankAccountType === 'CORRIENTE' ? 'D' : 'S';
      const centsFormatted = padZero(cents, 17);
      
      const concept = padSpace(`NOMINA ${year}-${month} F${fortnight}`.toUpperCase(), 20);
      const bankCode = '507'; // Bancolombia
      const fillSpaces = ' '.repeat(160); // 264 - 104 = 160

      const detailLine = `6${docFormatted}${nameFormatted}${accountFormatted}${accountTypeFormatted}${centsFormatted}${concept}${bankCode}${fillSpaces}`;
      detailLines.push(detailLine);
    }

    if (detailLines.length === 0) {
      throw new BadRequestException('No hay pagos netos mayores a cero para este período');
    }

    // Header Line
    const tenantTaxClean = cleanNum(tenant.taxId ?? '999999999');
    const tenantTaxFormatted = padZero(tenantTaxClean, 15);
    const tenantNameFormatted = padSpace(tenant.name.trim().toUpperCase(), 16);
    const classOfPayment = '225'; // Payroll
    const paymentDesc = padSpace(`PAGO NOMINA F${fortnight}`, 20);
    const sequenceNumber = '01';
    const recordCountFormatted = padZero(detailLines.length, 7);
    const totalCentsFormatted = padZero(totalCents, 17);
    
    const tenantAccountClean = cleanNum(tenant.bankAccount ?? '12345678901');
    const tenantAccountFormatted = padZero(tenantAccountClean, 11);
    const tenantAccountTypeFormatted = tenant.bankAccountType === 'CORRIENTE' ? 'D' : 'S';
    const headerFillSpaces = ' '.repeat(165); // 264 - 99 = 165

    const headerLine = `1${tenantTaxFormatted}${tenantNameFormatted}${classOfPayment}${paymentDesc}${transmissionDate}${sequenceNumber}${recordCountFormatted}${totalCentsFormatted}${tenantAccountFormatted}${tenantAccountTypeFormatted}${headerFillSpaces}`;

    return [headerLine, ...detailLines].join('\r\n');
  }
}

import {
  Body, Controller, Get, Param, ParseUUIDPipe,
  Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { TenantId } from '../../../common/decorators/tenant.decorator';
import { PayrollService } from '../application/payroll.service';
import { CreateEmployeeDto } from '../domain/dto/create-employee.dto';
import { CreatePayrollPeriodDto } from '../domain/dto/create-payroll-period.dto';

@UseGuards(JwtAuthGuard)
@Controller('payroll')
export class PayrollController {
  constructor(private readonly svc: PayrollService) {}

  // ── Employees ──────────────────────────────────────────────────────────────

  @Get('employees')
  listEmployees(@TenantId() tenantId: string) {
    return this.svc.findAllEmployees(tenantId);
  }

  @Get('employees/:id')
  getEmployee(@Param('id', ParseUUIDPipe) id: string, @TenantId() tenantId: string) {
    return this.svc.findEmployee(id, tenantId);
  }

  @Post('employees')
  createEmployee(@Body() dto: CreateEmployeeDto, @TenantId() tenantId: string) {
    return this.svc.createEmployee(tenantId, dto);
  }

  @Patch('employees/:id/deactivate')
  deactivate(@Param('id', ParseUUIDPipe) id: string, @TenantId() tenantId: string) {
    return this.svc.deactivateEmployee(id, tenantId);
  }

  // ── Payroll Periods ────────────────────────────────────────────────────────

  @Get('periods')
  listPeriods(
    @TenantId() tenantId: string,
    @Query('year') year?: string,
    @Query('month') month?: string,
  ) {
    return this.svc.findPeriods(tenantId, year ? +year : undefined, month ? +month : undefined);
  }

  @Get('periods/:id')
  getPeriod(@Param('id', ParseUUIDPipe) id: string, @TenantId() tenantId: string) {
    return this.svc.findPeriod(id, tenantId);
  }

  @Post('periods')
  createPeriod(@Body() dto: CreatePayrollPeriodDto, @TenantId() tenantId: string) {
    return this.svc.createPeriod(tenantId, dto);
  }

  @Patch('periods/:id/approve')
  approve(@Param('id', ParseUUIDPipe) id: string, @TenantId() tenantId: string) {
    return this.svc.approvePeriod(id, tenantId);
  }

  @Patch('periods/:id/pay')
  markPaid(@Param('id', ParseUUIDPipe) id: string, @TenantId() tenantId: string) {
    return this.svc.markPaid(id, tenantId);
  }

  // ── Summary ────────────────────────────────────────────────────────────────

  @Get('summary/:year/:month')
  summary(
    @Param('year') year: string,
    @Param('month') month: string,
    @TenantId() tenantId: string,
  ) {
    return this.svc.monthlySummary(tenantId, +year, +month);
  }
}

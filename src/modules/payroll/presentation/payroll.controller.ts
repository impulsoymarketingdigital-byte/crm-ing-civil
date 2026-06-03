import {
  Body, Controller, Get, Param, ParseUUIDPipe,
  Patch, Post, Query, UseGuards, Res,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { TenantId } from '../../../common/decorators/tenant.decorator';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { Permission } from '../../../common/constants/permissions.constants';
import { PayrollService } from '../application/payroll.service';
import { CreateEmployeeDto } from '../domain/dto/create-employee.dto';
import { CreatePayrollPeriodDto } from '../domain/dto/create-payroll-period.dto';

@UseGuards(JwtAuthGuard)
@Controller('payroll')
export class PayrollController {
  constructor(private readonly svc: PayrollService) {}

  @Get('employees') @RequirePermissions(Permission.PAYROLL_READ)
  listEmployees(@TenantId() tenantId: string) { return this.svc.findAllEmployees(tenantId); }

  @Get('employees/:id') @RequirePermissions(Permission.PAYROLL_READ)
  getEmployee(@Param('id', ParseUUIDPipe) id: string, @TenantId() tenantId: string) {
    return this.svc.findEmployee(id, tenantId);
  }

  @Post('employees') @RequirePermissions(Permission.PAYROLL_WRITE)
  createEmployee(@Body() dto: CreateEmployeeDto, @TenantId() tenantId: string) {
    return this.svc.createEmployee(tenantId, dto);
  }

  @Patch('employees/:id/deactivate') @RequirePermissions(Permission.PAYROLL_WRITE)
  deactivate(@Param('id', ParseUUIDPipe) id: string, @TenantId() tenantId: string) {
    return this.svc.deactivateEmployee(id, tenantId);
  }

  @Get('bancolombia') @RequirePermissions(Permission.PAYROLL_READ)
  async downloadBancolombiaFlatFile(
    @Query('year') year: string,
    @Query('month') month: string,
    @Query('fortnight') fortnight: string,
    @TenantId() tenantId: string,
    @Res() res: Response,
  ) {
    const fileContent = await this.svc.generateBancolombiaFlatFile(tenantId, +year, +month, +fortnight);
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename=bancolombia_nomina_${year}_${month}_f${fortnight}.txt`);
    return res.send(fileContent);
  }

  @Get('periods') @RequirePermissions(Permission.PAYROLL_READ)
  listPeriods(@TenantId() tenantId: string, @Query('year') year?: string, @Query('month') month?: string) {
    return this.svc.findPeriods(tenantId, year ? +year : undefined, month ? +month : undefined);
  }

  @Get('periods/:id') @RequirePermissions(Permission.PAYROLL_READ)
  getPeriod(@Param('id', ParseUUIDPipe) id: string, @TenantId() tenantId: string) {
    return this.svc.findPeriod(id, tenantId);
  }

  @Post('periods') @RequirePermissions(Permission.PAYROLL_WRITE)
  createPeriod(@Body() dto: CreatePayrollPeriodDto, @TenantId() tenantId: string) {
    return this.svc.createPeriod(tenantId, dto);
  }

  @Patch('periods/:id/approve') @RequirePermissions(Permission.PAYROLL_APPROVE)
  approve(@Param('id', ParseUUIDPipe) id: string, @TenantId() tenantId: string) {
    return this.svc.approvePeriod(id, tenantId);
  }

  @Patch('periods/:id/pay') @RequirePermissions(Permission.PAYROLL_PAY)
  markPaid(@Param('id', ParseUUIDPipe) id: string, @TenantId() tenantId: string) {
    return this.svc.markPaid(id, tenantId);
  }

  @Get('summary/:year/:month') @RequirePermissions(Permission.PAYROLL_READ)
  summary(@Param('year') year: string, @Param('month') month: string, @TenantId() tenantId: string) {
    return this.svc.monthlySummary(tenantId, +year, +month);
  }
}

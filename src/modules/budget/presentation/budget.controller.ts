import {
  Body, Controller, Delete, Get, Param,
  ParseUUIDPipe, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { TenantId } from '../../../common/decorators/tenant.decorator';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { Permission } from '../../../common/constants/permissions.constants';
import { BudgetService } from '../application/budget.service';
import { CreateOfficialBudgetDto } from '../domain/dto/create-budget.dto';
import { CreateBudgetChapterDto } from '../domain/dto/create-chapter.dto';
import { CreateBudgetLineDto } from '../domain/dto/create-line.dto';

@UseGuards(JwtAuthGuard)
@Controller('budgets')
export class BudgetController {
  constructor(private readonly svc: BudgetService) {}

  @Get() @RequirePermissions(Permission.BUDGET_READ)
  findAll(@TenantId() tenantId: string, @Query('projectId') projectId?: string) {
    return this.svc.findAll(tenantId, projectId);
  }

  @Get(':id') @RequirePermissions(Permission.BUDGET_READ)
  findOne(@Param('id', ParseUUIDPipe) id: string, @TenantId() tenantId: string) {
    return this.svc.findOne(id, tenantId);
  }

  @Post() @RequirePermissions(Permission.BUDGET_WRITE)
  create(@Body() dto: CreateOfficialBudgetDto, @TenantId() tenantId: string) {
    return this.svc.create(tenantId, dto);
  }

  @Patch(':id/approve') @RequirePermissions(Permission.BUDGET_APPROVE)
  approve(@Param('id', ParseUUIDPipe) id: string, @TenantId() tenantId: string) {
    return this.svc.approve(id, tenantId);
  }

  @Post(':id/chapters') @RequirePermissions(Permission.BUDGET_WRITE)
  addChapter(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateBudgetChapterDto, @TenantId() tenantId: string) {
    return this.svc.addChapter(id, tenantId, dto);
  }

  @Post(':id/lines') @RequirePermissions(Permission.BUDGET_WRITE)
  addLine(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateBudgetLineDto, @TenantId() tenantId: string) {
    return this.svc.addLine(id, tenantId, dto);
  }

  @Delete('lines/:lineId') @RequirePermissions(Permission.BUDGET_WRITE)
  deleteLine(@Param('lineId', ParseUUIDPipe) lineId: string, @TenantId() tenantId: string) {
    return this.svc.deleteLine(lineId, tenantId);
  }

  @Get(':id/vs-actual') @RequirePermissions(Permission.BUDGET_READ)
  budgetVsActual(@Param('id', ParseUUIDPipe) id: string, @TenantId() tenantId: string) {
    return this.svc.budgetVsActual(id, tenantId);
  }
}

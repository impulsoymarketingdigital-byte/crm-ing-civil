import {
  Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { TenantId } from '../../../common/decorators/tenant.decorator';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { Permission } from '../../../common/constants/permissions.constants';
import { ProjectService } from '../application/project.service';
import { CreateProjectDto } from '../domain/dto/create-project.dto';
import { UpdateProjectDto } from '../domain/dto/update-project.dto';
import { CreatePhaseDto } from '../domain/dto/create-phase.dto';
import { CreateBudgetDto } from '../domain/dto/create-budget.dto';
import { AiuCalculateDto } from '../domain/dto/aiu-calculate.dto';

@UseGuards(JwtAuthGuard)
@Controller('projects')
export class ProjectsController {
  constructor(private readonly svc: ProjectService) {}

  @Get() @RequirePermissions(Permission.PROJECT_READ)
  findAll(@TenantId() tenantId: string) {
    return this.svc.findAll(tenantId);
  }

  @Get(':id') @RequirePermissions(Permission.PROJECT_READ)
  findOne(@Param('id', ParseUUIDPipe) id: string, @TenantId() tenantId: string) {
    return this.svc.findOne(id, tenantId);
  }

  @Post() @RequirePermissions(Permission.PROJECT_WRITE)
  create(@Body() dto: CreateProjectDto, @TenantId() tenantId: string) {
    return this.svc.create(tenantId, dto);
  }

  @Patch(':id') @RequirePermissions(Permission.PROJECT_WRITE)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateProjectDto, @TenantId() tenantId: string) {
    return this.svc.update(id, tenantId, dto);
  }

  @Post('aiu/calculate') @RequirePermissions(Permission.PROJECT_READ)
  calculateAiu(@Body() dto: AiuCalculateDto) {
    return this.svc.calculateAiu(dto);
  }

  @Post(':id/aiu') @RequirePermissions(Permission.PROJECT_WRITE)
  saveAiu(@Param('id', ParseUUIDPipe) id: string, @Body() body: AiuCalculateDto & { description?: string }, @TenantId() tenantId: string) {
    const { description, ...dto } = body;
    return this.svc.saveAiuBreakdown(id, tenantId, dto, description);
  }

  @Post(':id/phases') @RequirePermissions(Permission.PROJECT_WRITE)
  addPhase(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CreatePhaseDto, @TenantId() tenantId: string) {
    return this.svc.addPhase(id, tenantId, dto);
  }

  @Patch('phases/:phaseId/progress') @RequirePermissions(Permission.PROJECT_WRITE)
  updateProgress(@Param('phaseId', ParseUUIDPipe) phaseId: string, @Body('actualPct') actualPct: number, @TenantId() tenantId: string) {
    return this.svc.updatePhaseProgress(phaseId, tenantId, actualPct);
  }

  @Post(':id/budget') @RequirePermissions(Permission.PROJECT_WRITE)
  addBudget(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateBudgetDto, @TenantId() tenantId: string) {
    return this.svc.addBudgetLine(id, tenantId, dto);
  }

  @Get(':id/budget/summary') @RequirePermissions(Permission.PROJECT_READ)
  budgetSummary(@Param('id', ParseUUIDPipe) id: string, @TenantId() tenantId: string) {
    return this.svc.getBudgetSummary(id, tenantId);
  }
}

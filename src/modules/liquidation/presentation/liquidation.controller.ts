import {
  Body, Controller, Get, Param, ParseUUIDPipe,
  Patch, Post, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { TenantId } from '../../../common/decorators/tenant.decorator';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { Permission } from '../../../common/constants/permissions.constants';
import { LiquidationService } from '../application/liquidation.service';
import { CreateLiquidationDto } from '../domain/dto/create-liquidation.dto';

@UseGuards(JwtAuthGuard)
@Controller('liquidations')
export class LiquidationController {
  constructor(private readonly svc: LiquidationService) {}

  @Post() @RequirePermissions(Permission.LIQUIDATION_WRITE)
  create(@Body() dto: CreateLiquidationDto, @TenantId() tenantId: string) {
    return this.svc.create(tenantId, dto);
  }

  @Get(':id') @RequirePermissions(Permission.LIQUIDATION_READ)
  findOne(@Param('id', ParseUUIDPipe) id: string, @TenantId() tenantId: string) {
    return this.svc.findOne(id, tenantId);
  }

  @Get('project/:projectId') @RequirePermissions(Permission.LIQUIDATION_READ)
  byProject(@Param('projectId', ParseUUIDPipe) projectId: string, @TenantId() tenantId: string) {
    return this.svc.findByProject(projectId, tenantId);
  }

  @Patch(':id/finalize') @RequirePermissions(Permission.LIQUIDATION_FINALIZE)
  finalize(@Param('id', ParseUUIDPipe) id: string, @TenantId() tenantId: string) {
    return this.svc.finalize(id, tenantId);
  }

  @Get(':id/statement') @RequirePermissions(Permission.LIQUIDATION_READ)
  statement(@Param('id', ParseUUIDPipe) id: string, @TenantId() tenantId: string) {
    return this.svc.statement(id, tenantId);
  }
}

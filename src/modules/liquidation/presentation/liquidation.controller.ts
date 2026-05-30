import {
  Body, Controller, Get, Param, ParseUUIDPipe,
  Patch, Post, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { TenantId } from '../../../common/decorators/tenant.decorator';
import { LiquidationService } from '../application/liquidation.service';
import { CreateLiquidationDto } from '../domain/dto/create-liquidation.dto';

@UseGuards(JwtAuthGuard)
@Controller('liquidations')
export class LiquidationController {
  constructor(private readonly svc: LiquidationService) {}

  @Post()
  create(@Body() dto: CreateLiquidationDto, @TenantId() tenantId: string) {
    return this.svc.create(tenantId, dto);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @TenantId() tenantId: string) {
    return this.svc.findOne(id, tenantId);
  }

  @Get('project/:projectId')
  byProject(@Param('projectId', ParseUUIDPipe) projectId: string, @TenantId() tenantId: string) {
    return this.svc.findByProject(projectId, tenantId);
  }

  @Patch(':id/finalize')
  finalize(@Param('id', ParseUUIDPipe) id: string, @TenantId() tenantId: string) {
    return this.svc.finalize(id, tenantId);
  }

  @Get(':id/statement')
  statement(@Param('id', ParseUUIDPipe) id: string, @TenantId() tenantId: string) {
    return this.svc.statement(id, tenantId);
  }
}

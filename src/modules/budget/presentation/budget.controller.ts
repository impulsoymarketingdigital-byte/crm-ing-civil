import {
  Body, Controller, Delete, Get, Param,
  ParseUUIDPipe, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { TenantId } from '../../../common/decorators/tenant.decorator';
import { BudgetService } from '../application/budget.service';
import { CreateOfficialBudgetDto } from '../domain/dto/create-budget.dto';
import { CreateBudgetChapterDto } from '../domain/dto/create-chapter.dto';
import { CreateBudgetLineDto } from '../domain/dto/create-line.dto';

@UseGuards(JwtAuthGuard)
@Controller('budgets')
export class BudgetController {
  constructor(private readonly svc: BudgetService) {}

  @Get()
  findAll(@TenantId() tenantId: string, @Query('projectId') projectId?: string) {
    return this.svc.findAll(tenantId, projectId);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @TenantId() tenantId: string) {
    return this.svc.findOne(id, tenantId);
  }

  @Post()
  create(@Body() dto: CreateOfficialBudgetDto, @TenantId() tenantId: string) {
    return this.svc.create(tenantId, dto);
  }

  @Patch(':id/approve')
  approve(@Param('id', ParseUUIDPipe) id: string, @TenantId() tenantId: string) {
    return this.svc.approve(id, tenantId);
  }

  @Post(':id/chapters')
  addChapter(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateBudgetChapterDto,
    @TenantId() tenantId: string,
  ) {
    return this.svc.addChapter(id, tenantId, dto);
  }

  @Post(':id/lines')
  addLine(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateBudgetLineDto,
    @TenantId() tenantId: string,
  ) {
    return this.svc.addLine(id, tenantId, dto);
  }

  @Delete('lines/:lineId')
  deleteLine(@Param('lineId', ParseUUIDPipe) lineId: string, @TenantId() tenantId: string) {
    return this.svc.deleteLine(lineId, tenantId);
  }

  @Get(':id/vs-actual')
  budgetVsActual(@Param('id', ParseUUIDPipe) id: string, @TenantId() tenantId: string) {
    return this.svc.budgetVsActual(id, tenantId);
  }
}

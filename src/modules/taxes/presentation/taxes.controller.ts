import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { TenantId } from '../../../common/decorators/tenant.decorator';
import { TaxesService, CreateObligationDto, PayObligationDto } from '../application/taxes.service';

@UseGuards(JwtAuthGuard)
@Controller('taxes')
export class TaxesController {
  constructor(private readonly svc: TaxesService) {}

  @Get('obligations')
  list(@TenantId() t: string, @Query('status') status?: string) { return this.svc.findAll(t, status); }

  @Get('obligations/dashboard')
  dashboard(@TenantId() t: string) { return this.svc.dashboard(t); }

  @Get('obligations/:id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @TenantId() t: string) { return this.svc.findOne(id, t); }

  @Post('obligations')
  create(@Body() dto: CreateObligationDto, @TenantId() t: string) { return this.svc.create(t, dto); }

  @Patch('obligations/:id/pay')
  pay(@Param('id', ParseUUIDPipe) id: string, @Body() dto: PayObligationDto, @TenantId() t: string) {
    return this.svc.pay(id, t, dto);
  }
}

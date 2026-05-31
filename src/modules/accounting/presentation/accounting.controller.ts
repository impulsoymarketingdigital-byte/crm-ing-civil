import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { TenantId } from '../../../common/decorators/tenant.decorator';
import { AccountingService, CreateReceiptDto, CreateDisbursementDto } from '../application/accounting.service';

@UseGuards(JwtAuthGuard)
@Controller('accounting')
export class AccountingController {
  constructor(private readonly svc: AccountingService) {}

  // ── Recibos de Caja ───────────────────────────────────────────────────────
  @Get('receipts')
  listReceipts(@TenantId() tenantId: string) { return this.svc.findAllReceipts(tenantId); }

  @Post('receipts')
  createReceipt(@Body() dto: CreateReceiptDto, @TenantId() tenantId: string) {
    return this.svc.createReceipt(tenantId, dto);
  }

  @Patch('receipts/:id/post')
  postReceipt(@Param('id', ParseUUIDPipe) id: string, @TenantId() tenantId: string) {
    return this.svc.postReceipt(id, tenantId);
  }

  // ── Comprobantes de Egreso ────────────────────────────────────────────────
  @Get('disbursements')
  listDisbursements(@TenantId() tenantId: string) { return this.svc.findAllDisbursements(tenantId); }

  @Post('disbursements')
  createDisbursement(@Body() dto: CreateDisbursementDto, @TenantId() tenantId: string) {
    return this.svc.createDisbursement(tenantId, dto);
  }

  @Patch('disbursements/:id/post')
  postDisbursement(@Param('id', ParseUUIDPipe) id: string, @TenantId() tenantId: string) {
    return this.svc.postDisbursement(id, tenantId);
  }

  // ── Resumen ────────────────────────────────────────────────────────────────
  @Get('summary/:year')
  summary(
    @Param('year') year: string,
    @Query('month') month: string,
    @TenantId() tenantId: string,
  ) {
    return this.svc.summary(tenantId, +year, month ? +month : undefined);
  }
}

import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { TenantId } from '../../../common/decorators/tenant.decorator';
import { BillingService } from '../application/billing.service';

@UseGuards(JwtAuthGuard)
@Controller('billing')
export class BillingController {
  constructor(private readonly svc: BillingService) {}

  /** Resumen de facturación: usuarios, costo próximo, próxima fecha */
  @Get('summary')
  summary(@TenantId() tenantId: string) {
    return this.svc.currentSummary(tenantId);
  }

  /** Lista de facturas de suscripción */
  @Get('invoices')
  list(@TenantId() tenantId: string) {
    return this.svc.listInvoices(tenantId);
  }

  /** Marcar factura como pagada (confirmación manual) */
  @Patch('invoices/:id/pay')
  markPaid(@Param('id', ParseUUIDPipe) id: string, @TenantId() tenantId: string) {
    return this.svc.markPaid(id, tenantId);
  }

  /** Actualizar email de facturación */
  @Patch('email')
  updateEmail(@Body('email') email: string, @TenantId() tenantId: string) {
    return this.svc.updateBillingEmail(tenantId, email);
  }

  /** Generar factura manualmente (útil para pruebas o ajustes) */
  @Post('generate')
  generate(@TenantId() tenantId: string) {
    return this.svc.generateManual(tenantId);
  }
}

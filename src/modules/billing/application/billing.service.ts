import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

/** Precio por bloque de 8 usuarios (USD) */
const UNIT_PRICE_USD = 59;
/** Usuarios por bloque */
const USERS_PER_UNIT = 8;
/** Días del ciclo de facturación */
const BILLING_CYCLE_DAYS = 30;

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ── Cálculo de precio ─────────────────────────────────────────────────────

  calcAmount(activeUsers: number): { units: number; totalUsd: number } {
    const units    = Math.ceil(activeUsers / USERS_PER_UNIT);
    const totalUsd = units * UNIT_PRICE_USD;
    return { units: Math.max(units, 1), totalUsd };
  }

  // ── Generar factura para un tenant ────────────────────────────────────────

  async generateInvoiceForTenant(tenantId: string): Promise<any> {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant || !tenant.isActive) return null;

    // Contar usuarios activos
    const activeUsers = await this.prisma.user.count({ where: { tenantId, isActive: true } });
    const { units, totalUsd } = this.calcAmount(activeUsers);

    // Número correlativo por tenant
    const lastInv = await this.prisma.billingInvoice.findFirst({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
    const seq    = lastInv ? parseInt(lastInv.number.split('-')[1] ?? '0', 10) + 1 : 1;
    const number = `SUBS-${String(seq).padStart(4, '0')}`;

    const now         = new Date();
    const periodStart = new Date(tenant.nextBillingDate);
    const periodEnd   = new Date(periodStart);
    periodEnd.setDate(periodEnd.getDate() + BILLING_CYCLE_DAYS);

    const dueDate = new Date(periodStart);
    dueDate.setDate(dueDate.getDate() + 7); // 7 días de gracia

    // Crear factura y avanzar nextBillingDate
    const [invoice] = await this.prisma.$transaction([
      this.prisma.billingInvoice.create({
        data: {
          tenantId,
          number,
          status: 'PENDING',
          periodStart,
          periodEnd,
          activeUsers,
          units,
          unitPriceUsd: UNIT_PRICE_USD,
          totalUsd,
          dueDate,
        },
      }),
      this.prisma.tenant.update({
        where: { id: tenantId },
        data: { nextBillingDate: periodEnd },
      }),
    ]);

    this.logger.log(
      `Billing invoice ${number} generated for tenant ${tenant.slug}: ` +
      `${activeUsers} users → ${units} units → $${totalUsd} USD`,
    );
    return invoice;
  }

  // ── Cron: corre diariamente y genera facturas vencidas ─────────────────────

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async processDueInvoices() {
    this.logger.log('Running billing cycle check…');

    const now  = new Date();
    const due  = await this.prisma.tenant.findMany({
      where: {
        isActive:       true,
        nextBillingDate: { lte: now },
        plan:           { not: 'free' }, // tenants 'free' no se cobran
      },
      select: { id: true, slug: true },
    });

    this.logger.log(`${due.length} tenant(s) due for billing`);

    for (const tenant of due) {
      try {
        await this.generateInvoiceForTenant(tenant.id);
      } catch (err) {
        this.logger.error(`Failed to generate invoice for tenant ${tenant.slug}:`, err);
      }
    }
  }

  // ── Marcar facturas vencidas (también corre diariamente) ──────────────────

  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async markOverdue() {
    const updated = await this.prisma.billingInvoice.updateMany({
      where: { status: 'PENDING', dueDate: { lt: new Date() } },
      data:  { status: 'OVERDUE' },
    });
    if (updated.count > 0) {
      this.logger.warn(`Marked ${updated.count} billing invoice(s) as OVERDUE`);
    }
  }

  // ── Endpoints públicos ─────────────────────────────────────────────────────

  /** Resumen de facturación actual del tenant */
  async currentSummary(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true, slug: true, plan: true, nextBillingDate: true, billingEmail: true },
    });
    if (!tenant) throw new NotFoundException('Tenant no encontrado');

    const activeUsers = await this.prisma.user.count({ where: { tenantId, isActive: true } });
    const { units, totalUsd } = this.calcAmount(activeUsers);

    const pendingInvoices = await this.prisma.billingInvoice.findMany({
      where: { tenantId, status: { in: ['PENDING', 'OVERDUE'] } },
      orderBy: { dueDate: 'asc' },
    });

    const totalOwed = pendingInvoices.reduce((s, i) => s + Number(i.totalUsd), 0);

    return {
      plan:            tenant.plan,
      activeUsers,
      usersPerUnit:    USERS_PER_UNIT,
      units,
      unitPriceUsd:    UNIT_PRICE_USD,
      nextChargeUsd:   totalUsd,
      nextBillingDate: tenant.nextBillingDate,
      billingEmail:    tenant.billingEmail,
      pendingInvoices: pendingInvoices.length,
      totalOwedUsd:    Math.round(totalOwed * 100) / 100,
      breakdown: {
        formula:  `ceil(${activeUsers} usuarios ÷ ${USERS_PER_UNIT}) × $${UNIT_PRICE_USD} = ${units} × $${UNIT_PRICE_USD} = $${totalUsd}`,
      },
    };
  }

  /** Lista de facturas de suscripción del tenant */
  listInvoices(tenantId: string) {
    return this.prisma.billingInvoice.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Marcar factura como pagada (pago manual / notificación de pasarela) */
  async markPaid(invoiceId: string, tenantId: string) {
    const inv = await this.prisma.billingInvoice.findFirst({ where: { id: invoiceId, tenantId } });
    if (!inv) throw new NotFoundException('Factura no encontrada');
    return this.prisma.billingInvoice.update({
      where: { id: invoiceId },
      data:  { status: 'PAID', paidAt: new Date() },
    });
  }

  /** Actualizar email de facturación */
  async updateBillingEmail(tenantId: string, email: string) {
    return this.prisma.tenant.update({
      where: { id: tenantId },
      data:  { billingEmail: email },
      select: { billingEmail: true, nextBillingDate: true },
    });
  }

  /** Admin: genera factura manual para un tenant (para testing / corrección) */
  async generateManual(tenantId: string) {
    return this.generateInvoiceForTenant(tenantId);
  }
}

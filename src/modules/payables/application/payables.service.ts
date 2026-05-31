import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

const r2 = (n: number) => Math.round(n * 100) / 100;

export interface CreateVendorDto {
  code: string; name: string; taxId?: string; email?: string;
  phone?: string; address?: string; contactName?: string;
}

export interface CreatePurchaseInvoiceDto {
  vendorId: string; number: string; issueDate: string; dueDate?: string;
  retentionPct?: number;
  lines: Array<{ description: string; quantity: number; unitCost: number; accountId?: string }>;
  notes?: string;
}

export interface PayVendorDto {
  cashAccountId: string; amount: number; paymentDate: string; reference?: string;
}

@Injectable()
export class PayablesService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Vendors ───────────────────────────────────────────────────────────────
  findAllVendors(tenantId: string) {
    return this.prisma.vendor.findMany({ where: { tenantId, isActive: true }, orderBy: { name: 'asc' } });
  }

  async createVendor(tenantId: string, dto: CreateVendorDto) {
    const exists = await this.prisma.vendor.findFirst({ where: { tenantId, code: dto.code } });
    if (exists) throw new ConflictException(`Código de proveedor "${dto.code}" ya existe`);
    return this.prisma.vendor.create({ data: { tenantId, ...dto } });
  }

  async deactivateVendor(id: string, tenantId: string) {
    const v = await this.prisma.vendor.findFirst({ where: { id, tenantId } });
    if (!v) throw new NotFoundException('Proveedor no encontrado');
    return this.prisma.vendor.update({ where: { id }, data: { isActive: false } });
  }

  // ── Purchase Invoices ─────────────────────────────────────────────────────
  findAllInvoices(tenantId: string, status?: string) {
    return this.prisma.purchaseInvoice.findMany({
      where: { tenantId, ...(status ? { status: status as any } : {}) },
      include: { vendor: { select: { name: true, taxId: true } }, lines: true },
      orderBy: { issueDate: 'desc' },
    });
  }

  async findInvoice(id: string, tenantId: string) {
    const inv = await this.prisma.purchaseInvoice.findFirst({
      where: { id, tenantId },
      include: { vendor: true, lines: true, payments: true },
    });
    if (!inv) throw new NotFoundException('Factura de proveedor no encontrada');
    return inv;
  }

  async createPurchaseInvoice(tenantId: string, dto: CreatePurchaseInvoiceDto) {
    const exists = await this.prisma.purchaseInvoice.findFirst({ where: { tenantId, number: dto.number } });
    if (exists) throw new ConflictException(`Factura N° "${dto.number}" ya existe`);

    const vendor = await this.prisma.vendor.findFirst({ where: { id: dto.vendorId, tenantId } });
    if (!vendor) throw new NotFoundException('Proveedor no encontrado');

    const retentionPct = dto.retentionPct ?? 0;
    const subtotal    = r2(dto.lines.reduce((s, l) => s + l.quantity * l.unitCost, 0));
    const retentionAmt = r2(subtotal * retentionPct);
    const total       = r2(subtotal - retentionAmt);

    return this.prisma.$transaction(async tx => {
      const inv = await tx.purchaseInvoice.create({
        data: {
          tenantId, vendorId: dto.vendorId, number: dto.number, status: 'PENDING',
          issueDate: new Date(dto.issueDate),
          dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
          subtotal, retentionPct, retentionAmt, total,
          paidAmount: 0, balance: total, notes: dto.notes,
          lines: {
            create: dto.lines.map(l => ({
              description: l.description, quantity: l.quantity,
              unitCost: l.unitCost, totalCost: r2(l.quantity * l.unitCost),
              accountId: l.accountId,
            })),
          },
        },
        include: { lines: true },
      });

      // Auto-create journal entry: DR Gasto, CR Cuentas por Pagar
      const apAccount = await tx.account.findFirst({ where: { tenantId, code: { startsWith: '2205' } } });
      if (apAccount) {
        const jeLines: any[] = [];
        // DR each expense line
        for (const line of dto.lines) {
          if (line.accountId) {
            jeLines.push({ accountId: line.accountId, debit: r2(line.quantity * line.unitCost), credit: 0, description: line.description, order: jeLines.length + 1 });
          }
        }
        // CR Cuentas por pagar
        if (jeLines.length > 0) {
          jeLines.push({ accountId: apAccount.id, debit: 0, credit: subtotal, description: `Factura proveedor ${dto.number}`, order: jeLines.length + 1 });
          // CR Retención if applicable
          if (retentionAmt > 0) {
            const retAccount = await tx.account.findFirst({ where: { tenantId, code: { startsWith: '2330' } } });
            if (retAccount) {
              jeLines[jeLines.length - 1].credit = r2(subtotal - retentionAmt); // adjust AP
              jeLines.push({ accountId: retAccount.id, debit: 0, credit: retentionAmt, description: 'Retención en la fuente', order: jeLines.length + 1 });
            }
          }
          const je = await tx.journalEntry.create({
            data: {
              tenantId, reference: `FP-${dto.number}`,
              description: `Factura proveedor: ${vendor.name}`,
              date: new Date(dto.issueDate), status: 'POSTED', postedAt: new Date(),
              lines: { create: jeLines },
            },
          });
          await tx.purchaseInvoice.update({ where: { id: inv.id }, data: { journalEntryId: je.id } });
        }
      }
      return inv;
    });
  }

  /** Registrar pago de factura de proveedor */
  async payInvoice(id: string, tenantId: string, dto: PayVendorDto) {
    const inv = await this.findInvoice(id, tenantId);
    if (inv.status === 'PAID') throw new BadRequestException('Factura ya está pagada');
    if (inv.status === 'VOID') throw new BadRequestException('No se puede pagar una factura anulada');

    const amount = Math.min(dto.amount, Number(inv.balance));
    if (amount <= 0) throw new BadRequestException('Monto de pago inválido');

    const newPaid    = r2(Number(inv.paidAmount) + amount);
    const newBalance = r2(Number(inv.balance) - amount);
    const newStatus  = newBalance <= 0 ? 'PAID' : 'PARTIAL';

    return this.prisma.$transaction(async tx => {
      // Journal: DR CxP, CR Caja/Banco
      const apAccount = await tx.account.findFirst({ where: { tenantId, code: { startsWith: '2205' } } });
      let jeId: string | undefined;
      if (apAccount) {
        const je = await tx.journalEntry.create({
          data: {
            tenantId, reference: `PFP-${inv.number}-${Date.now()}`,
            description: `Pago factura proveedor ${inv.number}`,
            date: new Date(dto.paymentDate), status: 'POSTED', postedAt: new Date(),
            lines: {
              create: [
                { accountId: apAccount.id,      debit: amount, credit: 0,      description: `Pago ${inv.number}`, order: 1 },
                { accountId: dto.cashAccountId, debit: 0,      credit: amount, description: `Pago ${inv.number}`, order: 2 },
              ],
            },
          },
        });
        jeId = je.id;
      }
      const payment = await tx.vendorPayment.create({
        data: {
          tenantId, purchaseInvoiceId: id, amount, cashAccountId: dto.cashAccountId,
          paymentDate: new Date(dto.paymentDate), reference: dto.reference, journalEntryId: jeId,
        },
      });
      await tx.purchaseInvoice.update({
        where: { id },
        data: { paidAmount: newPaid, balance: newBalance, status: newStatus },
      });
      return { payment, status: newStatus, remainingBalance: newBalance };
    });
  }

  findAllPayments(tenantId: string) {
    return this.prisma.vendorPayment.findMany({
      where: { tenantId },
      include: { purchaseInvoice: { include: { vendor: { select: { name: true } } } } },
      orderBy: { paymentDate: 'desc' },
    });
  }
}

import { ConflictException, BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

const r2 = (n: number) => Math.round(n * 100) / 100;

// ── DTOs (inline for simplicity) ─────────────────────────────────────────────
export interface CreateReceiptDto {
  number: string;
  concept: string;
  thirdParty?: string;
  amount: number;
  cashAccountId: string;
  incomeAccountId?: string;
  relatedInvoiceId?: string;
  receiptDate: string;
  notes?: string;
}

export interface CreateDisbursementDto {
  number: string;
  concept: string;
  beneficiary: string;
  amount: number;
  cashAccountId: string;
  expenseAccountId: string;
  projectId?: string;
  disbursementDate: string;
  notes?: string;
}

@Injectable()
export class AccountingService {
  constructor(private readonly prisma: PrismaService) {}

  // ── RECIBOS DE CAJA ───────────────────────────────────────────────────────

  findAllReceipts(tenantId: string) {
    return this.prisma.cashReceipt.findMany({
      where: { tenantId },
      orderBy: { receiptDate: 'desc' },
    });
  }

  async createReceipt(tenantId: string, dto: CreateReceiptDto, userId?: string) {
    const exists = await this.prisma.cashReceipt.findFirst({ where: { tenantId, number: dto.number } });
    if (exists) throw new ConflictException(`Recibo N° "${dto.number}" ya existe`);

    return this.prisma.cashReceipt.create({
      data: {
        tenantId,
        number: dto.number,
        concept: dto.concept,
        thirdParty: dto.thirdParty,
        amount: dto.amount,
        cashAccountId: dto.cashAccountId,
        incomeAccountId: dto.incomeAccountId,
        relatedInvoiceId: dto.relatedInvoiceId,
        receiptDate: new Date(dto.receiptDate),
        notes: dto.notes,
        createdBy: userId,
        status: 'DRAFT',
      },
    });
  }

  /** Contabilizar recibo de caja: DR Caja/Banco, CR CxC o Ingreso */
  async postReceipt(id: string, tenantId: string) {
    const receipt = await this.prisma.cashReceipt.findFirst({ where: { id, tenantId } });
    if (!receipt) throw new NotFoundException('Recibo no encontrado');
    if (receipt.status !== 'DRAFT') throw new BadRequestException('Solo se pueden contabilizar recibos en estado DRAFT');

    // Determine credit account
    let creditAccountId = receipt.incomeAccountId;
    if (!creditAccountId) {
      // Use AR account (1305) or find one
      const arAccount = await this.prisma.account.findFirst({
        where: { tenantId, code: { startsWith: '1305' } },
      });
      creditAccountId = arAccount?.id;
    }
    if (!creditAccountId) throw new BadRequestException('Se requiere cuenta de ingreso o CxC para contabilizar');

    const ref = `RC-${receipt.number}`;
    const entry = await this.prisma.$transaction(async tx => {
      const je = await tx.journalEntry.create({
        data: {
          tenantId,
          reference: ref,
          description: `Recibo de caja: ${receipt.concept}`,
          date: receipt.receiptDate,
          status: 'POSTED',
          postedAt: new Date(),
          lines: {
            create: [
              { accountId: receipt.cashAccountId,  debit: Number(receipt.amount), credit: 0, description: receipt.concept, order: 1 },
              { accountId: creditAccountId!,         debit: 0, credit: Number(receipt.amount), description: receipt.concept, order: 2 },
            ],
          },
        },
      });
      await tx.cashReceipt.update({
        where: { id },
        data: { status: 'POSTED', journalEntryId: je.id },
      });
      return je;
    });
    return entry;
  }

  // ── COMPROBANTES DE EGRESO ─────────────────────────────────────────────────

  findAllDisbursements(tenantId: string) {
    return this.prisma.cashDisbursement.findMany({
      where: { tenantId },
      include: { project: { select: { code: true, name: true } } },
      orderBy: { disbursementDate: 'desc' },
    });
  }

  async createDisbursement(tenantId: string, dto: CreateDisbursementDto, userId?: string) {
    const exists = await this.prisma.cashDisbursement.findFirst({ where: { tenantId, number: dto.number } });
    if (exists) throw new ConflictException(`Comprobante N° "${dto.number}" ya existe`);

    return this.prisma.cashDisbursement.create({
      data: {
        tenantId,
        number: dto.number,
        concept: dto.concept,
        beneficiary: dto.beneficiary,
        amount: dto.amount,
        cashAccountId: dto.cashAccountId,
        expenseAccountId: dto.expenseAccountId,
        projectId: dto.projectId,
        disbursementDate: new Date(dto.disbursementDate),
        notes: dto.notes,
        createdBy: userId,
        status: 'DRAFT',
      },
    });
  }

  /** Contabilizar egreso: DR Gasto/Activo, CR Caja/Banco */
  async postDisbursement(id: string, tenantId: string) {
    const disb = await this.prisma.cashDisbursement.findFirst({ where: { id, tenantId } });
    if (!disb) throw new NotFoundException('Comprobante de egreso no encontrado');
    if (disb.status !== 'DRAFT') throw new BadRequestException('Solo se pueden contabilizar comprobantes en estado DRAFT');

    const ref = `CE-${disb.number}`;
    const entry = await this.prisma.$transaction(async tx => {
      const je = await tx.journalEntry.create({
        data: {
          tenantId,
          reference: ref,
          description: `Egreso: ${disb.concept} - ${disb.beneficiary}`,
          date: disb.disbursementDate,
          status: 'POSTED',
          postedAt: new Date(),
          lines: {
            create: [
              { accountId: disb.expenseAccountId, debit: Number(disb.amount), credit: 0, description: disb.concept, order: 1 },
              { accountId: disb.cashAccountId,    debit: 0, credit: Number(disb.amount), description: disb.concept, order: 2 },
            ],
          },
        },
      });
      await tx.cashDisbursement.update({
        where: { id },
        data: { status: 'POSTED', journalEntryId: je.id },
      });
      return je;
    });
    return entry;
  }

  /** Resumen de ingresos y egresos del período */
  async summary(tenantId: string, year: number, month?: number) {
    const from = new Date(year, (month ?? 1) - 1, 1);
    const to   = month ? new Date(year, month, 0, 23, 59, 59) : new Date(year, 12, 0, 23, 59, 59);

    const [receipts, disbursements] = await Promise.all([
      this.prisma.cashReceipt.findMany({
        where: { tenantId, receiptDate: { gte: from, lte: to }, status: 'POSTED' },
      }),
      this.prisma.cashDisbursement.findMany({
        where: { tenantId, disbursementDate: { gte: from, lte: to }, status: 'POSTED' },
      }),
    ]);

    const totalReceipts      = r2(receipts.reduce((s, r) => s + Number(r.amount), 0));
    const totalDisbursements = r2(disbursements.reduce((s, d) => s + Number(d.amount), 0));

    return {
      year, month,
      totalReceipts,
      totalDisbursements,
      netFlow: r2(totalReceipts - totalDisbursements),
      receipts:      receipts.length,
      disbursements: disbursements.length,
    };
  }
}

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

const r2 = (n: number) => Math.round(n * 100) / 100;

// Tax account codes by type (PUC Colombiano)
const TAX_ACCOUNT_CODES: Record<string, string> = {
  IVA:        '2404', // IVA por pagar
  RETEFUENTE: '2330', // Retenciones en la fuente
  RETEICA:    '2335', // Reteica
  RENTA:      '2412', // Impuesto de renta
  ICA:        '2408', // Industria y Comercio
  CREE:       '2330', // uses same as retefuente
  GMF:        '5115', // impuestos (gasto)
};

export interface CreateObligationDto {
  type: string; period: string; base: number; rate: number;
  amount?: number; dueDate: string; notes?: string;
}

export interface PayObligationDto {
  cashAccountId: string; paidDate: string; paidAmount?: number;
}

@Injectable()
export class TaxesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(tenantId: string, status?: string) {
    return this.prisma.taxObligation.findMany({
      where: { tenantId, ...(status ? { status: status as any } : {}) },
      orderBy: [{ dueDate: 'asc' }, { type: 'asc' }],
    });
  }

  async findOne(id: string, tenantId: string) {
    const t = await this.prisma.taxObligation.findFirst({ where: { id, tenantId } });
    if (!t) throw new NotFoundException('Obligación tributaria no encontrada');
    return t;
  }

  async create(tenantId: string, dto: CreateObligationDto) {
    const amount = dto.amount ?? r2(dto.base * dto.rate);
    return this.prisma.taxObligation.create({
      data: {
        tenantId, type: dto.type as any, period: dto.period,
        base: dto.base, rate: dto.rate, amount,
        dueDate: new Date(dto.dueDate), notes: dto.notes, status: 'PENDING',
      },
    });
  }

  async pay(id: string, tenantId: string, dto: PayObligationDto) {
    const obligation = await this.findOne(id, tenantId);
    if (obligation.status === 'PAID') throw new BadRequestException('Obligación ya pagada');

    const paidAmount = dto.paidAmount ?? Number(obligation.amount);
    const taxCode    = TAX_ACCOUNT_CODES[obligation.type] ?? '2404';

    // Find the tax liability account
    const taxAccount = await this.prisma.account.findFirst({
      where: { tenantId, code: { startsWith: taxCode } },
    });

    return this.prisma.$transaction(async tx => {
      let jeId: string | undefined;
      if (taxAccount) {
        const je = await tx.journalEntry.create({
          data: {
            tenantId,
            reference: `IMP-${obligation.type}-${obligation.period}-${Date.now()}`,
            description: `Pago ${obligation.type} período ${obligation.period}`,
            date: new Date(dto.paidDate), status: 'POSTED', postedAt: new Date(),
            lines: {
              create: [
                { accountId: taxAccount.id,      debit: paidAmount, credit: 0,           description: `Pago ${obligation.type}`, order: 1 },
                { accountId: dto.cashAccountId,  debit: 0,          credit: paidAmount,  description: `Pago ${obligation.type}`, order: 2 },
              ],
            },
          },
        });
        jeId = je.id;
      }
      return tx.taxObligation.update({
        where: { id },
        data: {
          status: 'PAID', paidDate: new Date(dto.paidDate),
          paidAmount, cashAccountId: dto.cashAccountId, journalEntryId: jeId,
        },
      });
    });
  }

  /** Returns upcoming obligations (due in next 30 days) and overdue ones */
  async dashboard(tenantId: string) {
    const now     = new Date();
    const in30    = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const [overdue, upcoming, paid] = await Promise.all([
      this.prisma.taxObligation.findMany({
        where: { tenantId, status: 'PENDING', dueDate: { lt: now } },
      }),
      this.prisma.taxObligation.findMany({
        where: { tenantId, status: 'PENDING', dueDate: { gte: now, lte: in30 } },
        orderBy: { dueDate: 'asc' },
      }),
      this.prisma.taxObligation.findMany({
        where: { tenantId, status: 'PAID' },
        orderBy: { paidDate: 'desc' },
        take: 10,
      }),
    ]);

    // Mark overdue
    if (overdue.length > 0) {
      await this.prisma.taxObligation.updateMany({
        where: { tenantId, status: 'PENDING', dueDate: { lt: now } },
        data: { status: 'OVERDUE' },
      });
    }

    return {
      overdue:  overdue.map(o => ({ ...o, totalAmount: Number(o.amount) })),
      upcoming: upcoming.map(o => ({ ...o, daysLeft: Math.ceil((new Date(o.dueDate).getTime() - now.getTime()) / 86400000) })),
      recentlyPaid: paid,
      totalPending: r2([...overdue, ...upcoming].reduce((s, o) => s + Number(o.amount), 0)),
    };
  }
}

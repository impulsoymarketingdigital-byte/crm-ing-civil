import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

const r2 = (n: number) => Math.round(n * 100) / 100;

export interface CreateFundDto {
  projectId?: string; name: string; responsible: string;
  cashAccountId: string; initialBalance: number;
}

export interface CreateTransactionDto {
  description: string; category: string; amount: number;
  receiptNumber?: string; transactionDate: string;
}

@Injectable()
export class PettyCashService {
  constructor(private readonly prisma: PrismaService) {}

  findAllFunds(tenantId: string) {
    return this.prisma.pettyCashFund.findMany({
      where: { tenantId },
      include: { project: { select: { code: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findFund(id: string, tenantId: string) {
    const f = await this.prisma.pettyCashFund.findFirst({
      where: { id, tenantId },
      include: { project: { select: { code: true, name: true } }, transactions: { orderBy: { transactionDate: 'desc' } } },
    });
    if (!f) throw new NotFoundException('Fondo de caja menor no encontrado');
    return f;
  }

  async createFund(tenantId: string, dto: CreateFundDto) {
    return this.prisma.pettyCashFund.create({
      data: {
        tenantId, name: dto.name, responsible: dto.responsible,
        cashAccountId: dto.cashAccountId, projectId: dto.projectId,
        initialBalance: dto.initialBalance, currentBalance: dto.initialBalance,
        status: 'ACTIVE',
      },
    });
  }

  async addTransaction(fundId: string, tenantId: string, dto: CreateTransactionDto) {
    const fund = await this.findFund(fundId, tenantId);
    if (fund.status !== 'ACTIVE') throw new BadRequestException('El fondo no está activo');
    if (Number(fund.currentBalance) < dto.amount) {
      throw new BadRequestException(`Saldo insuficiente: disponible $${Number(fund.currentBalance).toLocaleString('es-CO')}`);
    }

    const newBalance = r2(Number(fund.currentBalance) - dto.amount);

    const [tx] = await this.prisma.$transaction([
      this.prisma.pettyCashTransaction.create({
        data: {
          fundId, description: dto.description, category: dto.category as any,
          amount: dto.amount, receiptNumber: dto.receiptNumber,
          transactionDate: new Date(dto.transactionDate),
        },
      }),
      this.prisma.pettyCashFund.update({ where: { id: fundId }, data: { currentBalance: newBalance } }),
    ]);
    return tx;
  }

  /** Reembolso de caja menor — crea asiento contable y restaura el saldo */
  async reimburse(fundId: string, tenantId: string) {
    const fund = await this.findFund(fundId, tenantId);
    const spent = r2(Number(fund.initialBalance) - Number(fund.currentBalance));
    if (spent <= 0) throw new BadRequestException('No hay gastos pendientes de reembolso');

    // Find a generic expense account (5195 Diversos)
    const expAccount = await this.prisma.account.findFirst({
      where: { tenantId, code: { startsWith: '5195' } },
    });
    const expAccountId = expAccount?.id;

    await this.prisma.$transaction(async tx => {
      if (expAccountId) {
        await tx.journalEntry.create({
          data: {
            tenantId,
            reference: `CM-REIMB-${fundId.slice(0, 8)}-${Date.now()}`,
            description: `Reembolso caja menor: ${fund.name}`,
            date: new Date(),
            status: 'POSTED',
            postedAt: new Date(),
            lines: {
              create: [
                { accountId: expAccountId,        debit: spent, credit: 0,     description: 'Gastos caja menor', order: 1 },
                { accountId: fund.cashAccountId,  debit: 0,     credit: spent, description: 'Reembolso caja',   order: 2 },
              ],
            },
          },
        });
      }
      await tx.pettyCashFund.update({
        where: { id: fundId },
        data: { currentBalance: fund.initialBalance },
      });
    });

    return { reimbursed: spent, newBalance: Number(fund.initialBalance) };
  }

  async closeFund(fundId: string, tenantId: string) {
    const fund = await this.findFund(fundId, tenantId);
    return this.prisma.pettyCashFund.update({ where: { id: fund.id }, data: { status: 'CLOSED' } });
  }
}

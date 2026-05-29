import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { JournalEntryStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { DecimalMoney } from '../domain/value-objects/decimal-money.value-object';
import { CreateLedgerEntryDto, LedgerLineDto } from '../domain/dto/create-ledger-entry.dto';
import { TrialBalanceQueryDto } from '../domain/dto/trial-balance-query.dto';
import type { TrialBalanceReport, TrialBalanceLine } from '../domain/interfaces/trial-balance.interface';

// Account types whose normal (positive) balance sits on the DEBIT side
const DEBIT_NORMAL_TYPES = new Set(['ASSET', 'EXPENSE']);

@Injectable()
export class LedgerService {
  constructor(private readonly prisma: PrismaService) {}

  // ── List & Fetch ─────────────────────────────────────────────────────────

  findAll(tenantId: string, status?: JournalEntryStatus) {
    return this.prisma.journalEntry.findMany({
      where: { tenantId, ...(status && { status }) },
      include: {
        lines: {
          include: { account: { select: { id: true, code: true, name: true } } },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { date: 'desc' },
    });
  }

  async findOne(id: string, tenantId: string) {
    const entry = await this.prisma.journalEntry.findFirst({
      where: { id, tenantId },
      include: {
        lines: {
          include: { account: { select: { id: true, code: true, name: true, type: true } } },
          orderBy: { order: 'asc' },
        },
      },
    });
    if (!entry) throw new NotFoundException('Journal entry not found');
    return entry;
  }

  // ── Create (strict Decimal validation) ───────────────────────────────────

  async createEntry(tenantId: string, dto: CreateLedgerEntryDto) {
    // ── Rule 1: balanced entry (Decimal arithmetic, no floating-point error) ──
    LedgerService.assertBalancedDecimal(dto.lines);

    // ── Rule 2: reference uniqueness within tenant ────────────────────────────
    const existing = await this.prisma.journalEntry.findFirst({
      where: { reference: dto.reference, tenantId },
    });
    if (existing) {
      throw new ConflictException(
        `Reference "${dto.reference}" already exists in this tenant`,
      );
    }

    // ── Rule 3: all accounts belong to this tenant and are active ─────────────
    const uniqueAccountIds = [...new Set(dto.lines.map((l) => l.accountId))];
    const foundAccounts = await this.prisma.account.findMany({
      where: { id: { in: uniqueAccountIds }, tenantId, isActive: true },
      select: { id: true },
    });
    if (foundAccounts.length !== uniqueAccountIds.length) {
      const foundIds = new Set(foundAccounts.map((a) => a.id));
      const missing = uniqueAccountIds.filter((id) => !foundIds.has(id));
      throw new BadRequestException(
        `Accounts not found or inactive in this tenant: ${missing.join(', ')}`,
      );
    }

    // ── Create (Prisma nested write is atomic) ────────────────────────────────
    return this.prisma.journalEntry.create({
      data: {
        tenantId,
        reference: dto.reference,
        description: dto.description,
        date: new Date(dto.date),
        createdBy: dto.createdBy,
        lines: {
          create: dto.lines.map((line, idx) => ({
            accountId: line.accountId,
            description: line.description,
            debit: DecimalMoney.from(line.debit),
            credit: DecimalMoney.from(line.credit),
            order: idx,
          })),
        },
      },
      include: {
        lines: {
          include: { account: { select: { id: true, code: true, name: true, type: true } } },
          orderBy: { order: 'asc' },
        },
      },
    });
  }

  // ── Post ──────────────────────────────────────────────────────────────────

  async postEntry(id: string, tenantId: string) {
    const entry = await this.findOne(id, tenantId);
    if (entry.status !== 'DRAFT') {
      throw new BadRequestException(`Only DRAFT entries can be posted (current: ${entry.status})`);
    }
    return this.prisma.journalEntry.update({
      where: { id },
      data: { status: 'POSTED', postedAt: new Date() },
    });
  }

  // ── Void ──────────────────────────────────────────────────────────────────

  async voidEntry(id: string, tenantId: string) {
    const entry = await this.findOne(id, tenantId);
    if (entry.status === 'VOIDED') {
      throw new BadRequestException('Entry is already VOIDED');
    }
    if (entry.status !== 'POSTED') {
      throw new BadRequestException('Only POSTED entries can be voided');
    }
    return this.prisma.journalEntry.update({
      where: { id },
      data: { status: 'VOIDED' },
    });
  }

  // ── Trial Balance ─────────────────────────────────────────────────────────

  async getTrialBalance(
    tenantId: string,
    query: TrialBalanceQueryDto,
  ): Promise<TrialBalanceReport> {
    // Fetch all lines from POSTED entries that match the tenant + date range.
    // Filtering via relation where clause is supported in Prisma findMany.
    const journalLines = await this.prisma.journalLine.findMany({
      where: {
        journalEntry: {
          tenantId,
          status: 'POSTED',
          // Both bounds must merge into a single `date` object — two separate
          // spreads would let the second overwrite the first.
          ...(query.dateFrom || query.dateTo
            ? {
                date: {
                  ...(query.dateFrom && { gte: new Date(query.dateFrom) }),
                  ...(query.dateTo   && { lte: new Date(query.dateTo)   }),
                },
              }
            : {}),
        },
        ...(query.accountType && {
          account: { type: query.accountType },
        }),
      },
      include: {
        account: {
          select: { id: true, code: true, name: true, type: true },
        },
      },
    });

    // Aggregate by accountId using Decimal arithmetic
    type AccRow = {
      accountId: string;
      accountCode: string;
      accountName: string;
      accountType: string;
      totalDebit: Prisma.Decimal;
      totalCredit: Prisma.Decimal;
    };

    const accMap = new Map<string, AccRow>();

    for (const line of journalLines) {
      const key = line.accountId;
      if (!accMap.has(key)) {
        accMap.set(key, {
          accountId: key,
          accountCode: line.account.code,
          accountName: line.account.name,
          accountType: line.account.type,
          totalDebit: new Prisma.Decimal(0),
          totalCredit: new Prisma.Decimal(0),
        });
      }
      const row = accMap.get(key)!;
      // line.debit / line.credit are already Prisma.Decimal values from the DB
      row.totalDebit = row.totalDebit.add(line.debit);
      row.totalCredit = row.totalCredit.add(line.credit);
    }

    // Build report lines
    let grandDebit = new Prisma.Decimal(0);
    let grandCredit = new Prisma.Decimal(0);

    const lines: TrialBalanceLine[] = [...accMap.values()]
      .sort((a, b) => a.accountCode.localeCompare(b.accountCode))
      .map((row) => {
        grandDebit = grandDebit.add(row.totalDebit);
        grandCredit = grandCredit.add(row.totalCredit);

        const isDebitNormal = DEBIT_NORMAL_TYPES.has(row.accountType);
        const balance = isDebitNormal
          ? row.totalDebit.minus(row.totalCredit)
          : row.totalCredit.minus(row.totalDebit);

        return {
          accountId: row.accountId,
          accountCode: row.accountCode,
          accountName: row.accountName,
          accountType: row.accountType,
          normalBalance: isDebitNormal ? 'DEBIT' : 'CREDIT',
          totalDebit: row.totalDebit.toFixed(4),
          totalCredit: row.totalCredit.toFixed(4),
          balance: balance.toFixed(4),
        };
      });

    return {
      tenantId,
      generatedAt: new Date().toISOString(),
      periodStart: query.dateFrom ?? null,
      periodEnd: query.dateTo ?? null,
      lines,
      totals: {
        totalDebit: grandDebit.toFixed(4),
        totalCredit: grandCredit.toFixed(4),
        isBalanced: grandDebit.equals(grandCredit),
      },
    };
  }

  // ── Business-rule helpers ─────────────────────────────────────────────────

  /**
   * Validates that the sum of debits equals the sum of credits
   * using exact Decimal arithmetic (decimal.js via Prisma.Decimal).
   *
   * Made static so it can be called without instantiating the service
   * (useful in unit tests and could be reused elsewhere).
   *
   * Why not native JS floats?
   *   0.1 + 0.2 = 0.30000000000000004  ← breaks Math.abs tolerance checks
   *   new Prisma.Decimal("0.1").add("0.2") = 0.3  ← exact
   */
  static assertBalancedDecimal(lines: Pick<LedgerLineDto, 'debit' | 'credit'>[]): void {
    const sumDebit = DecimalMoney.sum(lines.map((l) => l.debit));
    const sumCredit = DecimalMoney.sum(lines.map((l) => l.credit));

    if (!sumDebit.equals(sumCredit)) {
      throw new UnprocessableEntityException(
        `Journal entry is not balanced: ` +
          `Σ debit = ${sumDebit.toFixed(4)} ≠ Σ credit = ${sumCredit.toFixed(4)}`,
      );
    }
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { JournalEntryStatus } from '@prisma/client';

@Injectable()
export class JournalEntriesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByTenant(tenantId: string, status?: JournalEntryStatus) {
    return this.prisma.journalEntry.findMany({
      where: { tenantId, ...(status && { status }) },
      include: { lines: { include: { account: true } } },
      orderBy: { date: 'desc' },
    });
  }

  findById(id: string, tenantId: string) {
    return this.prisma.journalEntry.findFirst({
      where: { id, tenantId },
      include: { lines: { include: { account: true } } },
    });
  }

  findByReference(reference: string, tenantId: string) {
    return this.prisma.journalEntry.findFirst({ where: { reference, tenantId } });
  }

  async create(data: { tenantId: string; reference: string; description?: string; date: string; lines: Array<{ accountId: string; description?: string; debit: number; credit: number }> }) {
    const { lines, ...entry } = data;
    return this.prisma.journalEntry.create({
      data: {
        ...entry,
        date: new Date(entry.date),
        lines: { create: lines.map((l, i) => ({ ...l, order: i })) },
      },
      include: { lines: true },
    });
  }

  post(id: string) {
    return this.prisma.journalEntry.update({
      where: { id },
      data: { status: 'POSTED', postedAt: new Date() },
    });
  }

  void_(id: string) {
    return this.prisma.journalEntry.update({ where: { id }, data: { status: 'VOIDED' } });
  }
}

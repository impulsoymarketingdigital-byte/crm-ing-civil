import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { JournalEntriesRepository } from '../infrastructure/journal-entries.repository';
import { CreateJournalEntryDto } from '../domain/dto/create-journal-entry.dto';
import { JournalEntryStatus } from '@prisma/client';

@Injectable()
export class JournalEntriesService {
  constructor(private readonly repo: JournalEntriesRepository) {}

  findAll(tenantId: string, status?: JournalEntryStatus) { return this.repo.findByTenant(tenantId, status); }

  async findOne(id: string, tenantId: string) {
    const entry = await this.repo.findById(id, tenantId);
    if (!entry) throw new NotFoundException('Journal entry not found');
    return entry;
  }

  async create(dto: CreateJournalEntryDto) {
    const totalDebit = dto.lines.reduce((s, l) => s + l.debit, 0);
    const totalCredit = dto.lines.reduce((s, l) => s + l.credit, 0);
    if (Math.abs(totalDebit - totalCredit) > 0.0001)
      throw new BadRequestException(`Unbalanced entry: debit ${totalDebit} != credit ${totalCredit}`);

    const exists = await this.repo.findByReference(dto.reference, dto.tenantId);
    if (exists) throw new ConflictException(`Reference "${dto.reference}" already exists`);

    return this.repo.create(dto);
  }

  async post(id: string, tenantId: string) {
    const entry = await this.findOne(id, tenantId);
    if (entry.status !== 'DRAFT') throw new BadRequestException('Only DRAFT entries can be posted');
    return this.repo.post(id);
  }

  async void_(id: string, tenantId: string) {
    const entry = await this.findOne(id, tenantId);
    if (entry.status === 'VOIDED') throw new BadRequestException('Entry already voided');
    return this.repo.void_(id);
  }
}

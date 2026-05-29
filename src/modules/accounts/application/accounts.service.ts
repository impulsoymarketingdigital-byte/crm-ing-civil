import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { AccountsRepository } from '../infrastructure/accounts.repository';
import { CreateAccountDto } from '../domain/dto/create-account.dto';
import { AccountType } from '@prisma/client';

@Injectable()
export class AccountsService {
  constructor(private readonly repo: AccountsRepository) {}
  findAll(tenantId: string, type?: AccountType) { return this.repo.findByTenant(tenantId, type); }
  async findOne(id: string, tenantId: string) {
    const account = await this.repo.findById(id, tenantId);
    if (!account) throw new NotFoundException('Account not found');
    return account;
  }
  async create(dto: CreateAccountDto) {
    const exists = await this.repo.findByCode(dto.code, dto.tenantId);
    if (exists) throw new ConflictException(`Account code "${dto.code}" already exists`);
    return this.repo.create(dto);
  }
}

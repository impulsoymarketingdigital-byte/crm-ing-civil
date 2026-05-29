import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { AccountType } from '@prisma/client';

@Injectable()
export class AccountsRepository {
  constructor(private readonly prisma: PrismaService) {}
  findByTenant(tenantId: string, type?: AccountType) {
    return this.prisma.account.findMany({ where: { tenantId, ...(type && { type }), isActive: true }, orderBy: { code: 'asc' } });
  }
  findById(id: string, tenantId: string) { return this.prisma.account.findFirst({ where: { id, tenantId } }); }
  findByCode(code: string, tenantId: string) { return this.prisma.account.findFirst({ where: { code, tenantId } }); }
  create(data: object) { return this.prisma.account.create({ data: data as any }); }
  update(id: string, data: Partial<{ name: string; description: string; isActive: boolean }>) {
    return this.prisma.account.update({ where: { id }, data });
  }
}

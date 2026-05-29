import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByTenant(tenantId: string) {
    return this.prisma.user.findMany({ where: { tenantId, isActive: true }, omit: { passwordHash: true } });
  }

  findById(id: string, tenantId: string) {
    return this.prisma.user.findFirst({ where: { id, tenantId }, omit: { passwordHash: true } });
  }

  findByEmail(email: string, tenantId: string) {
    return this.prisma.user.findFirst({ where: { email, tenantId } });
  }

  async create(data: { tenantId: string; roleId?: string; email: string; password: string; firstName: string; lastName: string }) {
    const passwordHash = await bcrypt.hash(data.password, 12);
    const { password, ...rest } = data;
    return this.prisma.user.create({ data: { ...rest, passwordHash }, omit: { passwordHash: true } });
  }

  update(id: string, tenantId: string, data: Partial<{ roleId: string; isActive: boolean }>) {
    return this.prisma.user.update({ where: { id }, data });
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByTenant(tenantId: string) {
    return this.prisma.user.findMany({
      where: { tenantId },
      include: { role: { select: { id: true, name: true } } },
      omit: { passwordHash: true },
      orderBy: { firstName: 'asc' },
    });
  }

  findById(id: string, tenantId: string) {
    return this.prisma.user.findFirst({
      where: { id, tenantId },
      include: { role: { select: { id: true, name: true, permissions: true } } },
      omit: { passwordHash: true },
    });
  }

  findByEmail(email: string, tenantId: string) {
    return this.prisma.user.findFirst({ where: { email, tenantId } });
  }

  async create(data: {
    tenantId: string; roleId?: string; email: string;
    password: string; firstName: string; lastName: string;
  }) {
    const passwordHash = await bcrypt.hash(data.password, 12);
    const { password, ...rest } = data;
    return this.prisma.user.create({
      data: { ...rest, passwordHash },
      include: { role: { select: { id: true, name: true } } },
      omit: { passwordHash: true },
    });
  }

  update(id: string, data: Partial<{ roleId: string; firstName: string; lastName: string; isActive: boolean; customPermissions: string[] }>) {
    return this.prisma.user.update({
      where: { id },
      data,
      include: { role: { select: { id: true, name: true } } },
      omit: { passwordHash: true },
    });
  }

  async resetPassword(id: string, newPassword: string) {
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({ where: { id }, data: { passwordHash } });
    return { message: 'Contraseña restablecida' };
  }
}

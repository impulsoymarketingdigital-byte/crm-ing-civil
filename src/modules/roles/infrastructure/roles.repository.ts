import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

@Injectable()
export class RolesRepository {
  constructor(private readonly prisma: PrismaService) {}
  findByTenant(tenantId: string) { return this.prisma.role.findMany({ where: { tenantId } }); }
  findById(id: string, tenantId: string) { return this.prisma.role.findFirst({ where: { id, tenantId } }); }
  findByName(name: string, tenantId: string) { return this.prisma.role.findFirst({ where: { name, tenantId } }); }
  create(data: { tenantId: string; name: string; permissions?: string[] }) {
    return this.prisma.role.create({ data: { ...data, permissions: data.permissions ?? [] } });
  }
}

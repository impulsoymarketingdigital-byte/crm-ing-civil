import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { CreateTenantDto } from '../domain/dto/create-tenant.dto';

@Injectable()
export class TenantsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll() { return this.prisma.tenant.findMany({ where: { isActive: true } }); }
  findById(id: string) { return this.prisma.tenant.findUnique({ where: { id } }); }
  findBySlug(slug: string) { return this.prisma.tenant.findUnique({ where: { slug } }); }
  create(data: CreateTenantDto) { return this.prisma.tenant.create({ data }); }
  update(id: string, data: Partial<{ isActive: boolean; plan: string }>) {
    return this.prisma.tenant.update({ where: { id }, data });
  }
}

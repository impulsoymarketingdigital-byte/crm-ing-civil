import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { TenantsRepository } from '../infrastructure/tenants.repository';
import { CreateTenantDto } from '../domain/dto/create-tenant.dto';

@Injectable()
export class TenantsService {
  constructor(private readonly repo: TenantsRepository) {}

  findAll() { return this.repo.findAll(); }

  async findOne(id: string) {
    const tenant = await this.repo.findById(id);
    if (!tenant) throw new NotFoundException(`Tenant ${id} not found`);
    return tenant;
  }

  async create(dto: CreateTenantDto) {
    const exists = await this.repo.findBySlug(dto.slug);
    if (exists) throw new ConflictException(`Slug "${dto.slug}" already taken`);
    return this.repo.create(dto);
  }

  async deactivate(id: string) {
    await this.findOne(id);
    return this.repo.update(id, { isActive: false });
  }
}

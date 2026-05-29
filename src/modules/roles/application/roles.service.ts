import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { RolesRepository } from '../infrastructure/roles.repository';
import { CreateRoleDto } from '../domain/dto/create-role.dto';

@Injectable()
export class RolesService {
  constructor(private readonly repo: RolesRepository) {}
  findAll(tenantId: string) { return this.repo.findByTenant(tenantId); }
  async findOne(id: string, tenantId: string) {
    const role = await this.repo.findById(id, tenantId);
    if (!role) throw new NotFoundException('Role not found');
    return role;
  }
  async create(dto: CreateRoleDto) {
    const exists = await this.repo.findByName(dto.name, dto.tenantId);
    if (exists) throw new ConflictException(`Role "${dto.name}" already exists`);
    return this.repo.create(dto);
  }
}

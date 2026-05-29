import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { UsersRepository } from '../infrastructure/users.repository';
import { CreateUserDto } from '../domain/dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly repo: UsersRepository) {}

  findAll(tenantId: string) { return this.repo.findByTenant(tenantId); }

  async findOne(id: string, tenantId: string) {
    const user = await this.repo.findById(id, tenantId);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async create(dto: CreateUserDto) {
    const exists = await this.repo.findByEmail(dto.email, dto.tenantId);
    if (exists) throw new ConflictException('Email already in use for this tenant');
    return this.repo.create({ ...dto, password: dto.password });
  }
}

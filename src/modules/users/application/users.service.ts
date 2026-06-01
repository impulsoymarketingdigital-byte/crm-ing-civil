import { BadRequestException, Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { UsersRepository } from '../infrastructure/users.repository';
import { CreateUserDto } from '../domain/dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly repo: UsersRepository) {}

  findAll(tenantId: string) { return this.repo.findByTenant(tenantId); }

  async findOne(id: string, tenantId: string) {
    const user = await this.repo.findById(id, tenantId);
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  async create(dto: CreateUserDto) {
    const exists = await this.repo.findByEmail(dto.email, dto.tenantId);
    if (exists) throw new ConflictException('El email ya está en uso en esta empresa');
    if (!dto.password || dto.password.length < 8)
      throw new BadRequestException('La contraseña debe tener al menos 8 caracteres');
    return this.repo.create({ ...dto, password: dto.password });
  }

  async update(id: string, tenantId: string, data: { firstName?: string; lastName?: string; roleId?: string }) {
    await this.findOne(id, tenantId);
    return this.repo.update(id, data);
  }

  async deactivate(id: string, tenantId: string) {
    await this.findOne(id, tenantId);
    return this.repo.update(id, { isActive: false });
  }

  async activate(id: string, tenantId: string) {
    const user = await this.repo.findById(id, tenantId);
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return this.repo.update(id, { isActive: true });
  }

  async resetPassword(id: string, tenantId: string, newPassword: string) {
    await this.findOne(id, tenantId);
    if (!newPassword || newPassword.length < 8)
      throw new BadRequestException('La nueva contraseña debe tener al menos 8 caracteres');
    return this.repo.resetPassword(id, newPassword);
  }
}

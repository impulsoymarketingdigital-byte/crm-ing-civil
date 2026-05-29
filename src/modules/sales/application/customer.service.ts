import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { CreateCustomerDto } from '../domain/dto/create-customer.dto';
import { UpdateCustomerDto } from '../domain/dto/update-customer.dto';

@Injectable()
export class CustomerService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(tenantId: string) {
    return this.prisma.customer.findMany({
      where: { tenantId, isActive: true },
      orderBy: { code: 'asc' },
    });
  }

  async findOne(id: string, tenantId: string) {
    const customer = await this.prisma.customer.findFirst({ where: { id, tenantId } });
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  async create(tenantId: string, dto: CreateCustomerDto) {
    const exists = await this.prisma.customer.findFirst({
      where: { code: dto.code, tenantId },
    });
    if (exists) throw new ConflictException(`Customer code "${dto.code}" already exists`);

    return this.prisma.customer.create({ data: { tenantId, ...dto } });
  }

  async update(id: string, tenantId: string, dto: UpdateCustomerDto) {
    await this.findOne(id, tenantId);
    return this.prisma.customer.update({ where: { id }, data: dto });
  }

  async deactivate(id: string, tenantId: string) {
    await this.findOne(id, tenantId);
    return this.prisma.customer.update({ where: { id }, data: { isActive: false } });
  }
}

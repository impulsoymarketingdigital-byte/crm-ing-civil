import { Controller, Get, Post, Param, Body, Patch } from '@nestjs/common';
import { TenantsService } from '../application/tenants.service';
import { CreateTenantDto } from '../domain/dto/create-tenant.dto';

@Controller('tenants')
export class TenantsController {
  constructor(private readonly service: TenantsService) {}

  @Get() findAll() { return this.service.findAll(); }
  @Get(':id') findOne(@Param('id') id: string) { return this.service.findOne(id); }
  @Post() create(@Body() dto: CreateTenantDto) { return this.service.create(dto); }
  @Patch(':id/deactivate') deactivate(@Param('id') id: string) { return this.service.deactivate(id); }
}

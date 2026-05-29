import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { RolesService } from '../application/roles.service';
import { CreateRoleDto } from '../domain/dto/create-role.dto';
import { TenantId } from '../../../common/decorators/tenant.decorator';

@Controller('roles')
export class RolesController {
  constructor(private readonly service: RolesService) {}
  @Get() findAll(@TenantId() tenantId: string) { return this.service.findAll(tenantId); }
  @Get(':id') findOne(@Param('id') id: string, @TenantId() tenantId: string) { return this.service.findOne(id, tenantId); }
  @Post() create(@Body() dto: CreateRoleDto) { return this.service.create(dto); }
}

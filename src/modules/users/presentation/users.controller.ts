import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { UsersService } from '../application/users.service';
import { CreateUserDto } from '../domain/dto/create-user.dto';
import { TenantId } from '../../../common/decorators/tenant.decorator';

@Controller('users')
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Get() findAll(@TenantId() tenantId: string) { return this.service.findAll(tenantId); }
  @Get(':id') findOne(@Param('id') id: string, @TenantId() tenantId: string) { return this.service.findOne(id, tenantId); }
  @Post() create(@Body() dto: CreateUserDto) { return this.service.create(dto); }
}

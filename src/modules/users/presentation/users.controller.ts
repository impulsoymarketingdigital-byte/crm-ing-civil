import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { TenantId } from '../../../common/decorators/tenant.decorator';
import { UsersService } from '../application/users.service';
import { CreateUserDto } from '../domain/dto/create-user.dto';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Get()
  findAll(@TenantId() tenantId: string) {
    return this.service.findAll(tenantId);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @TenantId() tenantId: string) {
    return this.service.findOne(id, tenantId);
  }

  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
    @Body() body: { firstName?: string; lastName?: string; roleId?: string },
  ) {
    return this.service.update(id, tenantId, body);
  }

  @Patch(':id/deactivate')
  deactivate(@Param('id', ParseUUIDPipe) id: string, @TenantId() tenantId: string) {
    return this.service.deactivate(id, tenantId);
  }

  @Patch(':id/activate')
  activate(@Param('id', ParseUUIDPipe) id: string, @TenantId() tenantId: string) {
    return this.service.activate(id, tenantId);
  }

  @Post(':id/reset-password')
  resetPassword(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
    @Body() body: { newPassword: string },
  ) {
    return this.service.resetPassword(id, tenantId, body.newPassword);
  }

  /** PUT /users/:id/permissions — update custom permissions for a user */
  @Put(':id/permissions')
  updatePermissions(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
    @Body() body: { customPermissions: string[] },
  ) {
    return this.service.updatePermissions(id, tenantId, body.customPermissions);
  }
}

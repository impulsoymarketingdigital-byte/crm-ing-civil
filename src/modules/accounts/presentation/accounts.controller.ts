import { Controller, Get, Post, Patch, Param, Body, Query } from '@nestjs/common';
import { AccountsService } from '../application/accounts.service';
import { CreateAccountDto } from '../domain/dto/create-account.dto';
import { TenantId } from '../../../common/decorators/tenant.decorator';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { Permission } from '../../../common/constants/permissions.constants';
import { AccountType } from '@prisma/client';

@Controller('accounts')
export class AccountsController {
  constructor(private readonly service: AccountsService) {}

  @Get()
  @RequirePermissions(Permission.ACCOUNT_READ)
  findAll(@TenantId() tenantId: string, @Query('type') type?: AccountType) {
    return this.service.findAll(tenantId, type);
  }

  @Get(':id')
  @RequirePermissions(Permission.ACCOUNT_READ)
  findOne(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.service.findOne(id, tenantId);
  }

  @Post()
  @RequirePermissions(Permission.ACCOUNT_WRITE)
  create(@Body() dto: CreateAccountDto) {
    return this.service.create(dto);
  }
}

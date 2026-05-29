import { Controller, Get, Post, Param, Body, Query } from '@nestjs/common';
import { AccountsService } from '../application/accounts.service';
import { CreateAccountDto } from '../domain/dto/create-account.dto';
import { TenantId } from '../../../common/decorators/tenant.decorator';
import { AccountType } from '@prisma/client';

@Controller('accounts')
export class AccountsController {
  constructor(private readonly service: AccountsService) {}
  @Get() findAll(@TenantId() tenantId: string, @Query('type') type?: AccountType) { return this.service.findAll(tenantId, type); }
  @Get(':id') findOne(@Param('id') id: string, @TenantId() tenantId: string) { return this.service.findOne(id, tenantId); }
  @Post() create(@Body() dto: CreateAccountDto) { return this.service.create(dto); }
}

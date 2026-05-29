import { Controller, Get, Post, Patch, Param, Body, Query } from '@nestjs/common';
import { JournalEntriesService } from '../application/journal-entries.service';
import { CreateJournalEntryDto } from '../domain/dto/create-journal-entry.dto';
import { TenantId } from '../../../common/decorators/tenant.decorator';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { Permission } from '../../../common/constants/permissions.constants';
import { JournalEntryStatus } from '@prisma/client';

@Controller('journal-entries')
export class JournalEntriesController {
  constructor(private readonly service: JournalEntriesService) {}

  @Get()
  @RequirePermissions(Permission.JOURNAL_READ)
  findAll(@TenantId() tenantId: string, @Query('status') status?: JournalEntryStatus) {
    return this.service.findAll(tenantId, status);
  }

  @Get(':id')
  @RequirePermissions(Permission.JOURNAL_READ)
  findOne(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.service.findOne(id, tenantId);
  }

  @Post()
  @RequirePermissions(Permission.JOURNAL_WRITE)
  create(@Body() dto: CreateJournalEntryDto) {
    return this.service.create(dto);
  }

  @Patch(':id/post')
  @RequirePermissions(Permission.JOURNAL_POST)
  post(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.service.post(id, tenantId);
  }

  @Patch(':id/void')
  @RequirePermissions(Permission.JOURNAL_VOID)
  void_(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.service.void_(id, tenantId);
  }
}

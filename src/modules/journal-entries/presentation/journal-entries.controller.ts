import { Controller, Get, Post, Patch, Param, Body, Query } from '@nestjs/common';
import { JournalEntriesService } from '../application/journal-entries.service';
import { CreateJournalEntryDto } from '../domain/dto/create-journal-entry.dto';
import { TenantId } from '../../../common/decorators/tenant.decorator';
import { JournalEntryStatus } from '@prisma/client';

@Controller('journal-entries')
export class JournalEntriesController {
  constructor(private readonly service: JournalEntriesService) {}
  @Get() findAll(@TenantId() tenantId: string, @Query('status') status?: JournalEntryStatus) { return this.service.findAll(tenantId, status); }
  @Get(':id') findOne(@Param('id') id: string, @TenantId() tenantId: string) { return this.service.findOne(id, tenantId); }
  @Post() create(@Body() dto: CreateJournalEntryDto) { return this.service.create(dto); }
  @Patch(':id/post') post(@Param('id') id: string, @TenantId() tenantId: string) { return this.service.post(id, tenantId); }
  @Patch(':id/void') void_(@Param('id') id: string, @TenantId() tenantId: string) { return this.service.void_(id, tenantId); }
}

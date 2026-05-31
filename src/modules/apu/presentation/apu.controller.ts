import {
  Body, Controller, Delete, Get, Param,
  ParseUUIDPipe, Post, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { TenantId } from '../../../common/decorators/tenant.decorator';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { Permission } from '../../../common/constants/permissions.constants';
import { ApuService } from '../application/apu.service';
import { CreateApuChapterDto } from '../domain/dto/create-apu-chapter.dto';
import { CreateApuItemDto } from '../domain/dto/create-apu-item.dto';
import { CreateApuInputDto } from '../domain/dto/create-apu-input.dto';

@UseGuards(JwtAuthGuard)
@Controller('apu')
export class ApuController {
  constructor(private readonly svc: ApuService) {}

  @Get('chapters') @RequirePermissions(Permission.APU_READ)
  listChapters(@TenantId() tenantId: string) { return this.svc.findAllChapters(tenantId); }

  @Post('chapters') @RequirePermissions(Permission.APU_WRITE)
  createChapter(@Body() dto: CreateApuChapterDto, @TenantId() tenantId: string) {
    return this.svc.createChapter(tenantId, dto);
  }

  @Get('chapters/:id') @RequirePermissions(Permission.APU_READ)
  chapterReport(@Param('id', ParseUUIDPipe) id: string, @TenantId() tenantId: string) {
    return this.svc.chapterReport(id, tenantId);
  }

  @Post('items') @RequirePermissions(Permission.APU_WRITE)
  createItem(@Body() dto: CreateApuItemDto, @TenantId() tenantId: string) {
    return this.svc.createItem(tenantId, dto);
  }

  @Get('items/:id') @RequirePermissions(Permission.APU_READ)
  getItem(@Param('id', ParseUUIDPipe) id: string, @TenantId() tenantId: string) {
    return this.svc.findItem(id, tenantId);
  }

  @Post('items/:id/inputs') @RequirePermissions(Permission.APU_WRITE)
  addInput(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateApuInputDto, @TenantId() tenantId: string) {
    return this.svc.addInput(id, tenantId, dto);
  }

  @Delete('inputs/:inputId') @RequirePermissions(Permission.APU_WRITE)
  deleteInput(@Param('inputId', ParseUUIDPipe) inputId: string, @TenantId() tenantId: string) {
    return this.svc.deleteInput(inputId, tenantId);
  }
}

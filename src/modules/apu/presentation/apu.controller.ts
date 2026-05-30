import {
  Body, Controller, Delete, Get, Param,
  ParseUUIDPipe, Post, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { TenantId } from '../../../common/decorators/tenant.decorator';
import { ApuService } from '../application/apu.service';
import { CreateApuChapterDto } from '../domain/dto/create-apu-chapter.dto';
import { CreateApuItemDto } from '../domain/dto/create-apu-item.dto';
import { CreateApuInputDto } from '../domain/dto/create-apu-input.dto';

@UseGuards(JwtAuthGuard)
@Controller('apu')
export class ApuController {
  constructor(private readonly svc: ApuService) {}

  @Get('chapters')
  listChapters(@TenantId() tenantId: string) {
    return this.svc.findAllChapters(tenantId);
  }

  @Post('chapters')
  createChapter(@Body() dto: CreateApuChapterDto, @TenantId() tenantId: string) {
    return this.svc.createChapter(tenantId, dto);
  }

  @Get('chapters/:id')
  chapterReport(@Param('id', ParseUUIDPipe) id: string, @TenantId() tenantId: string) {
    return this.svc.chapterReport(id, tenantId);
  }

  @Post('items')
  createItem(@Body() dto: CreateApuItemDto, @TenantId() tenantId: string) {
    return this.svc.createItem(tenantId, dto);
  }

  @Get('items/:id')
  getItem(@Param('id', ParseUUIDPipe) id: string, @TenantId() tenantId: string) {
    return this.svc.findItem(id, tenantId);
  }

  @Post('items/:id/inputs')
  addInput(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateApuInputDto,
    @TenantId() tenantId: string,
  ) {
    return this.svc.addInput(id, tenantId, dto);
  }

  @Delete('inputs/:inputId')
  deleteInput(@Param('inputId', ParseUUIDPipe) inputId: string, @TenantId() tenantId: string) {
    return this.svc.deleteInput(inputId, tenantId);
  }
}

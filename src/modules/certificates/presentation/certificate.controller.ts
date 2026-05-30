import {
  Body, Controller, Get, Param, ParseUUIDPipe,
  Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { TenantId } from '../../../common/decorators/tenant.decorator';
import { CertificateService } from '../application/certificate.service';
import { CreateCertificateDto } from '../domain/dto/create-certificate.dto';

@UseGuards(JwtAuthGuard)
@Controller('certificates')
export class CertificateController {
  constructor(private readonly svc: CertificateService) {}

  @Get()
  findAll(@TenantId() tenantId: string, @Query('projectId') projectId?: string) {
    return this.svc.findAll(tenantId, projectId);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @TenantId() tenantId: string) {
    return this.svc.findOne(id, tenantId);
  }

  @Post()
  create(@Body() dto: CreateCertificateDto, @TenantId() tenantId: string) {
    return this.svc.create(tenantId, dto);
  }

  @Patch(':id/approve')
  approve(@Param('id', ParseUUIDPipe) id: string, @TenantId() tenantId: string) {
    return this.svc.approve(id, tenantId);
  }

  @Patch(':id/pay')
  markPaid(@Param('id', ParseUUIDPipe) id: string, @TenantId() tenantId: string) {
    return this.svc.markPaid(id, tenantId);
  }

  @Patch(':id/void')
  void(@Param('id', ParseUUIDPipe) id: string, @TenantId() tenantId: string) {
    return this.svc.void(id, tenantId);
  }

  @Get('progress/:projectId')
  progressReport(@Param('projectId', ParseUUIDPipe) projectId: string, @TenantId() tenantId: string) {
    return this.svc.progressReport(projectId, tenantId);
  }
}

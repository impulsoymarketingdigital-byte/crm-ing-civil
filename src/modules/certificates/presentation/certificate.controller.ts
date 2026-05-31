import {
  Body, Controller, Get, Param, ParseUUIDPipe,
  Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { TenantId } from '../../../common/decorators/tenant.decorator';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { Permission } from '../../../common/constants/permissions.constants';
import { CertificateService } from '../application/certificate.service';
import { CreateCertificateDto } from '../domain/dto/create-certificate.dto';

@UseGuards(JwtAuthGuard)
@Controller('certificates')
export class CertificateController {
  constructor(private readonly svc: CertificateService) {}

  @Get() @RequirePermissions(Permission.CERTIFICATE_READ)
  findAll(@TenantId() tenantId: string, @Query('projectId') projectId?: string) {
    return this.svc.findAll(tenantId, projectId);
  }

  @Get(':id') @RequirePermissions(Permission.CERTIFICATE_READ)
  findOne(@Param('id', ParseUUIDPipe) id: string, @TenantId() tenantId: string) {
    return this.svc.findOne(id, tenantId);
  }

  @Post() @RequirePermissions(Permission.CERTIFICATE_WRITE)
  create(@Body() dto: CreateCertificateDto, @TenantId() tenantId: string) {
    return this.svc.create(tenantId, dto);
  }

  @Patch(':id/approve') @RequirePermissions(Permission.CERTIFICATE_APPROVE)
  approve(@Param('id', ParseUUIDPipe) id: string, @TenantId() tenantId: string) {
    return this.svc.approve(id, tenantId);
  }

  @Patch(':id/pay') @RequirePermissions(Permission.CERTIFICATE_PAY)
  markPaid(@Param('id', ParseUUIDPipe) id: string, @TenantId() tenantId: string) {
    return this.svc.markPaid(id, tenantId);
  }

  @Patch(':id/void') @RequirePermissions(Permission.CERTIFICATE_APPROVE)
  void(@Param('id', ParseUUIDPipe) id: string, @TenantId() tenantId: string) {
    return this.svc.void(id, tenantId);
  }

  @Get('progress/:projectId') @RequirePermissions(Permission.CERTIFICATE_READ)
  progressReport(@Param('projectId', ParseUUIDPipe) projectId: string, @TenantId() tenantId: string) {
    return this.svc.progressReport(projectId, tenantId);
  }
}

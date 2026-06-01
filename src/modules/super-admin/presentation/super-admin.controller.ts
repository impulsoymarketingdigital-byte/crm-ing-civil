import {
  Controller, Get, Param, ParseUUIDPipe, Patch, Query, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../../../common/guards/super-admin.guard';
import { SuperAdminService } from '../application/super-admin.service';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

const RequesterId = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): string =>
    ctx.switchToHttp().getRequest().user?.sub,
);

@UseGuards(JwtAuthGuard, SuperAdminGuard)
@Controller('super-admin')
export class SuperAdminController {
  constructor(private readonly svc: SuperAdminService) {}

  /** Dashboard: totales de empresas y usuarios */
  @Get('dashboard')
  dashboard() { return this.svc.dashboard(); }

  /** Lista todos los tenants con conteo de usuarios activos */
  @Get('tenants')
  tenants() { return this.svc.listAllTenants(); }

  /** Activa o desactiva un tenant */
  @Patch('tenants/:id/toggle')
  toggleTenant(@Param('id', ParseUUIDPipe) id: string) {
    return this.svc.toggleTenant(id);
  }

  /** Lista todos los usuarios del sistema (con filtro opcional) */
  @Get('users')
  users(
    @Query('tenantId') tenantId?: string,
    @Query('search')   search?: string,
  ) {
    return this.svc.listAllUsers(tenantId, search);
  }

  /** Otorga o revoca el rol de super-admin a un usuario */
  @Patch('users/:id/toggle-superadmin')
  toggleSuperAdmin(
    @Param('id', ParseUUIDPipe) id: string,
    @RequesterId() requesterId: string,
  ) {
    return this.svc.toggleSuperAdmin(id, requesterId);
  }
}

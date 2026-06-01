import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../../../common/guards/super-admin.guard';
import { TenantId } from '../../../common/decorators/tenant.decorator';
import { SubscriptionService } from '../application/subscription.service';

@Controller('subscription')
export class SubscriptionController {
  constructor(private readonly svc: SubscriptionService) {}

  /** GET /subscription/status — estado de suscripción del tenant actual */
  @UseGuards(JwtAuthGuard)
  @Get('status')
  status(@TenantId() tenantId: string) {
    return this.svc.getStatus(tenantId);
  }

  /** GET /subscription/plans — lista de planes disponibles */
  @Get('plans')
  plans() { return this.svc.getAvailablePlans(); }

  /** POST /subscription/request — usuario solicita un plan */
  @UseGuards(JwtAuthGuard)
  @Post('request')
  request(
    @TenantId() tenantId: string,
    @Body() body: { plan: string; billingEmail: string },
  ) {
    return this.svc.requestPlan(tenantId, body.plan, body.billingEmail);
  }

  /** PATCH /subscription/activate/:tenantId — super-admin activa plan manualmente */
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @Patch('activate/:tenantId')
  activate(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Body() body: { plan: 'monthly' | 'annual' | 'enterprise'; billingEmail?: string },
  ) {
    return this.svc.activatePlan(tenantId, body.plan, body.billingEmail);
  }
}

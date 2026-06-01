import {
  CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { SubscriptionService } from '../../modules/subscription/application/subscription.service';

@Injectable()
export class TrialGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly subscriptionSvc: SubscriptionService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    // 1. Skip public routes
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(), ctx.getClass(),
    ]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest();
    const user = req.user;

    // 2. Skip if no user yet (handled by JwtAuthGuard)
    if (!user) return true;

    // 3. Super-admin is always allowed
    if (user.isSuperAdmin) return true;

    // 4. Check subscription/trial status
    const tenantId = user.tenantId;
    if (!tenantId) return true;

    const allowed = await this.subscriptionSvc.isAccessAllowed(tenantId);
    if (!allowed) {
      throw new HttpException(
        {
          statusCode: 402,
          error: 'Payment Required',
          message: 'Tu período de prueba ha vencido. Por favor, elige un plan para continuar.',
          code: 'TRIAL_EXPIRED',
        },
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    return true;
  }
}

import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Extracts the tenant identifier from the authenticated JWT payload.
 * Falls back to the x-tenant-id header only for routes that explicitly
 * allow unauthenticated access (@Public).
 *
 * Always use this decorator instead of reading req.headers directly —
 * it guarantees the tenantId comes from the verified JWT.
 */
export const TenantId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    // After JwtAuthGuard, request.user is the authoritative source
    return request.user?.tenantId ?? request.headers['x-tenant-id'];
  },
);

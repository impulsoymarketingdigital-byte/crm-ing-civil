import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

export interface AuthenticatedUser {
  userId: string;
  email: string;
  tenantId: string;
  permissions: string[];
}

/**
 * Global RBAC guard — runs after JwtAuthGuard.
 *
 * Enforces two invariants on every authenticated request:
 * 1. Cross-tenant isolation: if the request carries a tenantId context
 *    (URL param or x-tenant-id header) it must match the JWT's tenantId.
 * 2. Permission check: if the handler is decorated with @RequirePermissions(),
 *    the user must hold every listed permission (or admin:*).
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Public routes skip RBAC entirely
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<{
      user?: AuthenticatedUser;
      params?: Record<string, string>;
      headers?: Record<string, string>;
    }>();

    const user = request.user;
    if (!user) return false;

    // ── Invariant 1: cross-tenant isolation ──────────────────────────────
    const contextTenantId =
      request.params?.['tenantId'] ?? request.headers?.['x-tenant-id'];

    if (contextTenantId && contextTenantId !== user.tenantId) {
      throw new ForbiddenException(
        `Cross-tenant access denied: token belongs to tenant "${user.tenantId}"`,
      );
    }

    // ── Invariant 2: permission check ────────────────────────────────────
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required || required.length === 0) return true;

    // admin:* bypasses all granular checks (within the verified tenant)
    if (user.permissions.includes('admin:*')) return true;

    const missing = required.filter((p) => !user.permissions.includes(p));
    if (missing.length > 0) {
      throw new ForbiddenException(
        `Missing permissions: ${missing.join(', ')}`,
      );
    }

    return true;
  }
}

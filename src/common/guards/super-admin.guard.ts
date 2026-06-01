import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    if (!req.user?.isSuperAdmin) {
      throw new ForbiddenException('Acceso restringido al super-administrador del sistema');
    }
    return true;
  }
}

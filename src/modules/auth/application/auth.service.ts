import {
  BadRequestException, ConflictException, Injectable,
  NotFoundException, UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { ROLE_PERMISSIONS } from '../../../common/constants/permissions.constants';
import { LoginDto } from '../domain/dto/login.dto';
import { RegisterTenantDto } from '../domain/dto/register-tenant.dto';
import { JwtPayload } from '../domain/interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  // ── Helpers ──────────────────────────────────────────────────────────────

  private async resolveTenant(slug?: string, tenantId?: string) {
    if (!slug && !tenantId) throw new UnauthorizedException('Se requiere slug o tenantId');
    const tenant = slug
      ? await this.prisma.tenant.findUnique({ where: { slug } })
      : await this.prisma.tenant.findUnique({ where: { id: tenantId! } });
    if (!tenant) throw new UnauthorizedException('Empresa no encontrada');
    if (!tenant.isActive) throw new UnauthorizedException('Esta empresa está desactivada');
    return tenant;
  }

  /** Merges role permissions + user customPermissions (deduped) */
  private mergePermissions(rolePerms: string[], customPerms: string[]): string[] {
    return Array.from(new Set([...rolePerms, ...customPerms]));
  }

  // ── Login ─────────────────────────────────────────────────────────────────

  async login(dto: LoginDto) {
    const tenant = await this.resolveTenant(dto.slug, dto.tenantId);

    const user = await this.prisma.user.findFirst({
      where: { email: dto.email, tenantId: tenant.id, isActive: true },
      include: { role: { select: { permissions: true, name: true } } },
    });
    if (!user) throw new UnauthorizedException('Credenciales inválidas');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Credenciales inválidas');

    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    const rolePerms   = (user.role?.permissions as string[]) ?? [];
    const customPerms = (user.customPermissions as string[]) ?? [];
    const permissions = user.isSuperAdmin
      ? ['admin:*']
      : this.mergePermissions(rolePerms, customPerms);

    return {
      access_token: this.issueToken(user.id, user.email, tenant.id, permissions, user.isSuperAdmin),
      user: {
        id: user.id, email: user.email,
        firstName: user.firstName, lastName: user.lastName,
        tenantId: tenant.id, roleId: user.roleId,
        roleName: user.role?.name,
        isSuperAdmin: user.isSuperAdmin,
        permissions,
      },
      tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug, plan: tenant.plan },
    };
  }

  // ── Register new tenant ───────────────────────────────────────────────────

  async registerTenant(dto: RegisterTenantDto) {
    const slugTaken = await this.prisma.tenant.findUnique({ where: { slug: dto.tenant.slug } });
    if (slugTaken) throw new ConflictException(`El slug "${dto.tenant.slug}" ya está en uso`);

    const result = await this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: { name: dto.tenant.name, slug: dto.tenant.slug, plan: dto.tenant.plan ?? 'pro' },
      });
      const roleNames = ['ADMIN','PROJECT_MANAGER','ACCOUNTANT','PAYROLL_MANAGER',
                         'ESTIMATOR','INVENTORY_MANAGER','SALES_REP','VIEWER'];
      const roles = await tx.role.createManyAndReturn({
        data: roleNames.map(name => ({ tenantId: tenant.id, name, permissions: ROLE_PERMISSIONS[name] ?? [] })),
      });
      const adminRole = roles.find(r => r.name === 'ADMIN')!;
      const passwordHash = await bcrypt.hash(dto.admin.password, 12);
      const user = await tx.user.create({
        data: { tenantId: tenant.id, roleId: adminRole.id, email: dto.admin.email,
                passwordHash, firstName: dto.admin.firstName, lastName: dto.admin.lastName },
      });
      return { tenant, user, permissions: ROLE_PERMISSIONS['ADMIN'] };
    });

    return {
      access_token: this.issueToken(result.user.id, result.user.email, result.tenant.id,
                                    result.permissions, false),
      user: { id: result.user.id, email: result.user.email,
              firstName: result.user.firstName, lastName: result.user.lastName,
              tenantId: result.tenant.id, permissions: result.permissions, isSuperAdmin: false },
      tenant: { id: result.tenant.id, name: result.tenant.name,
                slug: result.tenant.slug, plan: result.tenant.plan },
    };
  }

  // ── Profile ───────────────────────────────────────────────────────────────

  async getMe(userId: string, tenantId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
      include: { role: { select: { name: true, permissions: true } } },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    const { passwordHash: _, ...safe } = user;
    return safe;
  }

  async updateProfile(userId: string, tenantId: string, firstName: string, lastName: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { firstName, lastName },
      select: { id: true, email: true, firstName: true, lastName: true, updatedAt: true },
    });
  }

  async changePassword(userId: string, tenantId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findFirst({ where: { id: userId, tenantId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw new BadRequestException('La contraseña actual es incorrecta');
    if (newPassword.length < 8) throw new BadRequestException('Mínimo 8 caracteres');
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash: await bcrypt.hash(newPassword, 12) } });
    return { message: 'Contraseña actualizada exitosamente' };
  }

  // ── Internal ──────────────────────────────────────────────────────────────

  private issueToken(userId: string, email: string, tenantId: string,
                     permissions: string[], isSuperAdmin: boolean): string {
    const payload: JwtPayload = { sub: userId, email, tenantId, permissions, isSuperAdmin };
    return this.jwt.sign(payload);
  }
}

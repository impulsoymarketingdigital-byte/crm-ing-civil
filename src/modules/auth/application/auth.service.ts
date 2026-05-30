import {
  ConflictException,
  Injectable,
  UnauthorizedException,
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

  // ── Validate credentials ─────────────────────────────────────────────
  async validateUser(email: string, password: string, tenantId: string) {
    const user = await this.prisma.user.findFirst({
      where: { email, tenantId, isActive: true },
      include: { role: { select: { permissions: true } } },
    });

    if (!user) return null;

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return null;

    const { passwordHash: _, ...safeUser } = user;
    return safeUser;
  }

  // ── Login ─────────────────────────────────────────────────────────────
  async login(dto: LoginDto) {
    const user = await this.validateUser(dto.email, dto.password, dto.tenantId);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const permissions = (user.role?.permissions as string[]) ?? [];

    // Fetch tenant info so the frontend can display the company name
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: user.tenantId },
      select: { id: true, name: true, slug: true, plan: true },
    });

    return {
      access_token: this.issueToken(user.id, user.email, user.tenantId, permissions),
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        tenantId: user.tenantId,
        permissions,
      },
      tenant,
    };
  }

  // ── Register tenant + admin user (atomic) ────────────────────────────
  async registerTenant(dto: RegisterTenantDto) {
    const slugTaken = await this.prisma.tenant.findUnique({
      where: { slug: dto.tenant.slug },
    });
    if (slugTaken) {
      throw new ConflictException(`Slug "${dto.tenant.slug}" is already taken`);
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Create tenant
      const tenant = await tx.tenant.create({
        data: {
          name: dto.tenant.name,
          slug: dto.tenant.slug,
          plan: dto.tenant.plan ?? 'free',
        },
      });

      // 2. Create default ADMIN role for this tenant
      const adminRole = await tx.role.create({
        data: {
          tenantId: tenant.id,
          name: 'ADMIN',
          permissions: ROLE_PERMISSIONS['ADMIN'],
        },
      });

      // Also seed ACCOUNTANT and INVENTORY_MANAGER roles
      await tx.role.createMany({
        data: [
          {
            tenantId: tenant.id,
            name: 'ACCOUNTANT',
            permissions: ROLE_PERMISSIONS['ACCOUNTANT'],
          },
          {
            tenantId: tenant.id,
            name: 'INVENTORY_MANAGER',
            permissions: ROLE_PERMISSIONS['INVENTORY_MANAGER'],
          },
          {
            tenantId: tenant.id,
            name: 'VIEWER',
            permissions: ROLE_PERMISSIONS['VIEWER'],
          },
        ],
      });

      // 3. Create admin user
      const passwordHash = await bcrypt.hash(dto.admin.password, 12);
      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          roleId: adminRole.id,
          email: dto.admin.email,
          passwordHash,
          firstName: dto.admin.firstName,
          lastName: dto.admin.lastName,
        },
      });

      return { tenant, user, permissions: ROLE_PERMISSIONS['ADMIN'] };
    });

    return {
      access_token: this.issueToken(
        result.user.id,
        result.user.email,
        result.tenant.id,
        result.permissions,
      ),
      user: {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        tenantId: result.tenant.id,
        permissions: result.permissions,
      },
      tenant: {
        id: result.tenant.id,
        name: result.tenant.name,
        slug: result.tenant.slug,
        plan: result.tenant.plan,
      },
    };
  }

  // ── Internal token issuer ────────────────────────────────────────────
  private issueToken(
    userId: string,
    email: string,
    tenantId: string,
    permissions: string[],
  ): string {
    const payload: JwtPayload = { sub: userId, email, tenantId, permissions };
    return this.jwt.sign(payload);
  }
}

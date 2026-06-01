import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

@Injectable()
export class SuperAdminService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Tenants ───────────────────────────────────────────────────────────────

  async listAllTenants() {
    const tenants = await this.prisma.tenant.findMany({
      include: {
        _count: { select: { users: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return Promise.all(tenants.map(async t => {
      const activeUsers = await this.prisma.user.count({
        where: { tenantId: t.id, isActive: true },
      });
      return { ...t, activeUsers };
    }));
  }

  async toggleTenant(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Empresa no encontrada');
    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: { isActive: !tenant.isActive },
    });
  }

  // ── Users (cross-tenant) ──────────────────────────────────────────────────

  async listAllUsers(tenantId?: string, search?: string) {
    return this.prisma.user.findMany({
      where: {
        ...(tenantId ? { tenantId } : {}),
        ...(search ? {
          OR: [
            { email:     { contains: search, mode: 'insensitive' } },
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName:  { contains: search, mode: 'insensitive' } },
          ],
        } : {}),
      },
      include: {
        tenant: { select: { name: true, slug: true } },
        role:   { select: { name: true } },
      },
      omit:    { passwordHash: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async toggleSuperAdmin(userId: string, requesterId: string) {
    if (userId === requesterId) {
      throw new Error('No puedes modificar tu propio estado de super-admin');
    }
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return this.prisma.user.update({
      where: { id: userId },
      data: { isSuperAdmin: !user.isSuperAdmin },
      omit: { passwordHash: true },
    });
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────

  async dashboard() {
    const [totalTenants, activeTenants, totalUsers, activeUsers, superAdmins] =
      await Promise.all([
        this.prisma.tenant.count(),
        this.prisma.tenant.count({ where: { isActive: true } }),
        this.prisma.user.count(),
        this.prisma.user.count({ where: { isActive: true } }),
        this.prisma.user.count({ where: { isSuperAdmin: true } }),
      ]);

    const byPlan = await this.prisma.tenant.groupBy({
      by: ['plan'],
      _count: { _all: true },
    });

    return {
      totalTenants, activeTenants,
      totalUsers, activeUsers,
      superAdmins,
      byPlan: byPlan.map(p => ({ plan: p.plan, count: p._count._all })),
    };
  }
}

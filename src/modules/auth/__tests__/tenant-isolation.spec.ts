import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { IS_PUBLIC_KEY } from '../../../common/decorators/public.decorator';
import { PERMISSIONS_KEY } from '../../../common/decorators/permissions.decorator';

// ── Fixtures ──────────────────────────────────────────────────────────────────
const TENANT_A = 'tenant-aaaa-0000-0000-0000-000000000001';
const TENANT_B = 'tenant-bbbb-0000-0000-0000-000000000002';

const userTenantA = {
  userId: 'user-a',
  email: 'admin@a.com',
  tenantId: TENANT_A,
  permissions: ['account:read', 'journal:read'],
};

const adminTenantA = {
  userId: 'super-a',
  email: 'super@a.com',
  tenantId: TENANT_A,
  permissions: ['admin:*'],
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function buildGuard() {
  const reflector = new Reflector();
  const guard = new RolesGuard(reflector);
  return { guard, reflector };
}

function buildCtx(
  user: object | undefined,
  params: Record<string, string> = {},
  headers: Record<string, string> = {},
): ExecutionContext {
  const mockRequest = { user, params, headers };
  return {
    switchToHttp: () => ({ getRequest: () => mockRequest }),
    getHandler: () => function h() {},
    getClass:   () => class C {},
  } as unknown as ExecutionContext;
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('RolesGuard – tenant isolation', () => {
  // ── @Public bypass ──────────────────────────────────────────────────────────
  describe('@Public() routes', () => {
    it('allows unauthenticated access to @Public routes', () => {
      const { guard, reflector } = buildGuard();
      jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
        if (key === IS_PUBLIC_KEY) return true;
        return undefined;
      });
      expect(guard.canActivate(buildCtx(undefined))).toBe(true);
    });
  });

  // ── Cross-tenant isolation via URL param ────────────────────────────────────
  describe('URL param tenantId cross-tenant checks', () => {
    it('allows access when URL tenantId matches JWT tenantId', () => {
      const { guard, reflector } = buildGuard();
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
      const ctx = buildCtx(userTenantA, { tenantId: TENANT_A });
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('denies: Tenant A user tries to access Tenant B data via URL param', () => {
      const { guard, reflector } = buildGuard();
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
      // JWT says Tenant A, URL requests Tenant B
      const ctx = buildCtx(userTenantA, { tenantId: TENANT_B });
      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });

    it('ForbiddenException message identifies the tenant mismatch', () => {
      const { guard, reflector } = buildGuard();
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
      const ctx = buildCtx(userTenantA, { tenantId: TENANT_B });
      try {
        guard.canActivate(ctx);
        fail('Should have thrown');
      } catch (e: any) {
        expect(e).toBeInstanceOf(ForbiddenException);
        expect(e.message).toContain(TENANT_A);
      }
    });
  });

  // ── Cross-tenant isolation via header ───────────────────────────────────────
  describe('x-tenant-id header cross-tenant checks', () => {
    it('denies: Tenant A user with x-tenant-id header pointing to Tenant B', () => {
      const { guard, reflector } = buildGuard();
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
      const ctx = buildCtx(userTenantA, {}, { 'x-tenant-id': TENANT_B });
      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });

    it('allows access when x-tenant-id header matches JWT tenant', () => {
      const { guard, reflector } = buildGuard();
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
      const ctx = buildCtx(userTenantA, {}, { 'x-tenant-id': TENANT_A });
      expect(guard.canActivate(ctx)).toBe(true);
    });
  });

  // ── Permission checks ────────────────────────────────────────────────────────
  describe('Permission enforcement', () => {
    it('allows access when user holds the required permission', () => {
      const { guard, reflector } = buildGuard();
      jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
        if (key === PERMISSIONS_KEY) return ['account:read'];
        return undefined;
      });
      const ctx = buildCtx(userTenantA);
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('throws ForbiddenException when user is missing a required permission', () => {
      const { guard, reflector } = buildGuard();
      jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
        if (key === PERMISSIONS_KEY) return ['journal:post'];
        return undefined;
      });
      // userTenantA has journal:read but NOT journal:post
      const ctx = buildCtx(userTenantA);
      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });

    it('allows admin:* to bypass any permission requirement within their tenant', () => {
      const { guard, reflector } = buildGuard();
      jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
        if (key === PERMISSIONS_KEY) return ['journal:post', 'journal:void', 'inventory:write'];
        return undefined;
      });
      const ctx = buildCtx(adminTenantA);
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('denies admin:* of Tenant A when URL targets Tenant B (cross-tenant check runs first)', () => {
      const { guard, reflector } = buildGuard();
      jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
        if (key === PERMISSIONS_KEY) return ['admin:*'];
        return undefined;
      });
      // Even a super-admin cannot cross tenant boundaries
      const ctx = buildCtx(adminTenantA, { tenantId: TENANT_B });
      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });

    it('allows access when no @RequirePermissions is set on the route', () => {
      const { guard, reflector } = buildGuard();
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
      const ctx = buildCtx(userTenantA);
      expect(guard.canActivate(ctx)).toBe(true);
    });
  });

  // ── Unauthenticated on protected route ──────────────────────────────────────
  describe('Missing JWT (protected route)', () => {
    it('returns false when request.user is absent', () => {
      const { guard, reflector } = buildGuard();
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
      const ctx = buildCtx(undefined);
      expect(guard.canActivate(ctx)).toBe(false);
    });
  });
});

// ── Repository-level isolation contract ────────────────────────────────────────
describe('Repository-level tenant isolation (contract tests)', () => {
  /**
   * Every repository method that fetches a list must include tenantId
   * in the WHERE clause. These tests verify that invariant by inspecting
   * the Prisma call arguments directly, without a running database.
   */

  const mockPrisma = {
    account:       { findMany: jest.fn().mockResolvedValue([]) },
    journalEntry:  { findMany: jest.fn().mockResolvedValue([]) },
    inventoryItem: { findMany: jest.fn().mockResolvedValue([]) },
  };

  beforeEach(() => jest.clearAllMocks());

  it('AccountsRepository always passes tenantId to Prisma WHERE clause', async () => {
    const { AccountsRepository } = await import('../../accounts/infrastructure/accounts.repository');
    const repo = new AccountsRepository(mockPrisma as any);
    await repo.findByTenant(TENANT_A);

    expect(mockPrisma.account.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ tenantId: TENANT_A }) }),
    );
    // The query MUST NOT contain Tenant B in any shape
    const where = mockPrisma.account.findMany.mock.calls[0][0].where;
    expect(where.tenantId).toBe(TENANT_A);
    expect(where.tenantId).not.toBe(TENANT_B);
  });

  it('JournalEntriesRepository always passes tenantId to Prisma WHERE clause', async () => {
    const { JournalEntriesRepository } = await import('../../journal-entries/infrastructure/journal-entries.repository');
    const repo = new JournalEntriesRepository(mockPrisma as any);
    await repo.findByTenant(TENANT_A);

    const where = mockPrisma.journalEntry.findMany.mock.calls[0][0].where;
    expect(where.tenantId).toBe(TENANT_A);
    expect(where.tenantId).not.toBe(TENANT_B);
  });

  it('InventoryRepository always passes tenantId to Prisma WHERE clause', async () => {
    const { InventoryRepository } = await import('../../inventory/infrastructure/inventory.repository');
    const repo = new InventoryRepository(mockPrisma as any);
    await repo.findByTenant(TENANT_A);

    const where = mockPrisma.inventoryItem.findMany.mock.calls[0][0].where;
    expect(where.tenantId).toBe(TENANT_A);
    expect(where.tenantId).not.toBe(TENANT_B);
  });
});

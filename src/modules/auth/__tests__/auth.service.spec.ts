import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { AuthService } from '../application/auth.service';

// ── Fixtures ──────────────────────────────────────────────────────────────────
const TENANT_A_ID = 'tenant-aaaaaaaa-0000-0000-0000-000000000001';
const TENANT_B_ID = 'tenant-bbbbbbbb-0000-0000-0000-000000000002';

const mockPasswordHash = bcrypt.hashSync('correct-password', 10);

const tenantA = { id: TENANT_A_ID, name: 'Acme Corp', slug: 'acme', plan: 'pro', isActive: true };

const userTenantA = {
  id: 'user-aaaa',
  email: 'admin@acme.com',
  passwordHash: mockPasswordHash,
  firstName: 'Alice',
  lastName: 'Admin',
  tenantId: TENANT_A_ID,
  roleId: 'role-aaa',
  isActive: true,
  lastLoginAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  role: { name: 'ADMIN', permissions: ['admin:*'] },
};

// ── Prisma mock ───────────────────────────────────────────────────────────────
function makePrisma() {
  return {
    user:   { findFirst: jest.fn(), update: jest.fn() },
    tenant: { findUnique: jest.fn(), create: jest.fn() },
    role:   { create: jest.fn(), createMany: jest.fn(), createManyAndReturn: jest.fn() },
    $transaction: jest.fn(),
  };
}

const mockJwtService = {
  sign: jest.fn().mockReturnValue('signed.jwt.token'),
} as unknown as JwtService;

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('AuthService', () => {
  let service: AuthService;
  let mockPrisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma = makePrisma();
    service = new AuthService(mockPrisma as any, mockJwtService);
  });

  // ── login — via slug ────────────────────────────────────────────────────────
  describe('login (via slug)', () => {
    function setupHappyPath() {
      mockPrisma.tenant.findUnique.mockResolvedValue(tenantA);
      mockPrisma.user.findFirst.mockResolvedValue(userTenantA);
      mockPrisma.user.update.mockResolvedValue(userTenantA);
    }

    it('returns access_token and user/tenant info on valid credentials', async () => {
      setupHappyPath();
      const result = await service.login({ slug: 'acme', email: 'admin@acme.com', password: 'correct-password' });
      expect(result.access_token).toBe('signed.jwt.token');
      expect(result.user.email).toBe('admin@acme.com');
      expect(result.user.tenantId).toBe(TENANT_A_ID);
      expect(result.user.permissions).toEqual(['admin:*']);
      expect(result.tenant.slug).toBe('acme');
    });

    it('resolves tenant by slug (not by id)', async () => {
      setupHappyPath();
      await service.login({ slug: 'acme', email: 'admin@acme.com', password: 'correct-password' });
      expect(mockPrisma.tenant.findUnique).toHaveBeenCalledWith({ where: { slug: 'acme' } });
    });

    it('also resolves tenant by tenantId (backward compat)', async () => {
      setupHappyPath();
      await service.login({ tenantId: TENANT_A_ID, email: 'admin@acme.com', password: 'correct-password' });
      expect(mockPrisma.tenant.findUnique).toHaveBeenCalledWith({ where: { id: TENANT_A_ID } });
    });

    it('throws UnauthorizedException when slug does not exist', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue(null);
      await expect(
        service.login({ slug: 'nonexistent', email: 'admin@acme.com', password: 'pw' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when tenant is inactive', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({ ...tenantA, isActive: false });
      await expect(
        service.login({ slug: 'acme', email: 'admin@acme.com', password: 'pw' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when user not found in tenant', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue(tenantA);
      mockPrisma.user.findFirst.mockResolvedValue(null);
      await expect(
        service.login({ slug: 'acme', email: 'nope@acme.com', password: 'correct-password' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when password is wrong', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue(tenantA);
      mockPrisma.user.findFirst.mockResolvedValue(userTenantA);
      await expect(
        service.login({ slug: 'acme', email: 'admin@acme.com', password: 'wrong-password' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('updates lastLoginAt on successful login', async () => {
      setupHappyPath();
      await service.login({ slug: 'acme', email: 'admin@acme.com', password: 'correct-password' });
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ lastLoginAt: expect.any(Date) }) }),
      );
    });

    it('signs JWT with sub, tenantId and permissions', async () => {
      setupHappyPath();
      await service.login({ slug: 'acme', email: 'admin@acme.com', password: 'correct-password' });
      expect(mockJwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({ sub: 'user-aaaa', tenantId: TENANT_A_ID, permissions: ['admin:*'] }),
      );
    });

    it('tenant isolation: user query is scoped to the resolved tenantId', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue(tenantA);
      mockPrisma.user.findFirst.mockResolvedValue(null);
      await service.login({ slug: 'acme', email: 'admin@acme.com', password: 'pw' }).catch(() => {});
      const query = mockPrisma.user.findFirst.mock.calls[0][0];
      expect(query.where.tenantId).toBe(TENANT_A_ID);
      expect(query.where.tenantId).not.toBe(TENANT_B_ID);
    });
  });

  // ── registerTenant ──────────────────────────────────────────────────────────
  describe('registerTenant', () => {
    const dto = {
      tenant: { name: 'Acme Corp', slug: 'acme', plan: 'pro' },
      admin:  { email: 'admin@acme.com', password: 'P@ssword1', firstName: 'Alice', lastName: 'Admin' },
    };

    it('creates tenant, all roles and admin user inside a transaction', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue(null); // slug not taken
      const createdTenant = { id: TENANT_A_ID, name: 'Acme Corp', slug: 'acme', plan: 'pro' };
      const createdUser   = { id: 'user-aaaa', email: 'admin@acme.com', firstName: 'Alice', lastName: 'Admin', tenantId: TENANT_A_ID };
      const allRoles      = [
        { id: 'role-aaa', name: 'ADMIN', tenantId: TENANT_A_ID },
        { id: 'role-bbb', name: 'VIEWER', tenantId: TENANT_A_ID },
      ];

      mockPrisma.$transaction.mockImplementation(async (cb: (tx: any) => any) => {
        const tx = {
          tenant: { create: jest.fn().mockResolvedValue(createdTenant) },
          role:   { createManyAndReturn: jest.fn().mockResolvedValue(allRoles) },
          user:   { create: jest.fn().mockResolvedValue(createdUser) },
        };
        return cb(tx);
      });

      const result = await service.registerTenant(dto);
      expect(result.tenant.slug).toBe('acme');
      expect(result.user.email).toBe('admin@acme.com');
      expect(result.access_token).toBe('signed.jwt.token');
      expect(result.user.permissions).toContain('admin:*');
    });

    it('throws ConflictException when slug is already taken', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({ id: 'existing', slug: 'acme' });
      await expect(service.registerTenant(dto)).rejects.toThrow(ConflictException);
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });
  });
});

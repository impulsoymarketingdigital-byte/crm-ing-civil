import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { AuthService } from '../application/auth.service';

// ── Fixtures ──────────────────────────────────────────────────────────────────
const TENANT_A_ID = 'tenant-aaaaaaaa-0000-0000-0000-000000000001';
const TENANT_B_ID = 'tenant-bbbbbbbb-0000-0000-0000-000000000002';

const mockPasswordHash = bcrypt.hashSync('correct-password', 10);

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
  role: { permissions: ['admin:*'] },
};

// ── Prisma mock ───────────────────────────────────────────────────────────────
const mockPrisma = {
  user: { findFirst: jest.fn() },
  tenant: { findUnique: jest.fn(), create: jest.fn() },
  role: { create: jest.fn(), createMany: jest.fn() },
  $transaction: jest.fn(),
};

const mockJwtService = {
  sign: jest.fn().mockReturnValue('signed.jwt.token'),
} as unknown as JwtService;

// ── Helpers ───────────────────────────────────────────────────────────────────
function buildService() {
  return new AuthService(mockPrisma as any, mockJwtService);
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = buildService();
  });

  // ── validateUser ────────────────────────────────────────────────────────────
  describe('validateUser', () => {
    it('returns user (without passwordHash) when credentials are valid', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(userTenantA);

      const result = await service.validateUser(
        'admin@acme.com',
        'correct-password',
        TENANT_A_ID,
      );

      expect(result).toBeDefined();
      expect(result!.id).toBe('user-aaaa');
      expect((result as any).passwordHash).toBeUndefined();
    });

    it('returns null when password is wrong', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(userTenantA);

      const result = await service.validateUser(
        'admin@acme.com',
        'wrong-password',
        TENANT_A_ID,
      );

      expect(result).toBeNull();
    });

    it('returns null when user does not exist in the given tenant', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      const result = await service.validateUser(
        'admin@acme.com',
        'correct-password',
        TENANT_B_ID, // ← different tenant
      );

      expect(result).toBeNull();
    });

    it('queries Prisma with the exact tenantId from the login request', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await service.validateUser('admin@acme.com', 'pw', TENANT_B_ID);

      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: TENANT_B_ID }),
        }),
      );
    });
  });

  // ── login ───────────────────────────────────────────────────────────────────
  describe('login', () => {
    it('returns access_token and user info on valid credentials', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(userTenantA);

      const result = await service.login({
        tenantId: TENANT_A_ID,
        email: 'admin@acme.com',
        password: 'correct-password',
      });

      expect(result.access_token).toBe('signed.jwt.token');
      expect(result.user.email).toBe('admin@acme.com');
      expect(result.user.tenantId).toBe(TENANT_A_ID);
      expect(result.user.permissions).toEqual(['admin:*']);
    });

    it('throws UnauthorizedException when credentials are invalid', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(
        service.login({
          tenantId: TENANT_A_ID,
          email: 'admin@acme.com',
          password: 'bad-pw',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('signs the JWT with the correct tenantId and permissions payload', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(userTenantA);

      await service.login({
        tenantId: TENANT_A_ID,
        email: 'admin@acme.com',
        password: 'correct-password',
      });

      expect(mockJwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: 'user-aaaa',
          tenantId: TENANT_A_ID,
          permissions: ['admin:*'],
        }),
      );
    });
  });

  // ── registerTenant ──────────────────────────────────────────────────────────
  describe('registerTenant', () => {
    const dto = {
      tenant: { name: 'Acme Corp', slug: 'acme', plan: 'pro' },
      admin:  { email: 'admin@acme.com', password: 'P@ssword1', firstName: 'Alice', lastName: 'Admin' },
    };

    it('creates tenant, roles and admin user inside a transaction', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue(null); // slug not taken

      const createdTenant = { id: TENANT_A_ID, name: 'Acme Corp', slug: 'acme', plan: 'pro' };
      const createdRole   = { id: 'role-aaa', name: 'ADMIN', tenantId: TENANT_A_ID };
      const createdUser   = {
        id: 'user-aaaa', email: 'admin@acme.com',
        firstName: 'Alice', lastName: 'Admin', tenantId: TENANT_A_ID,
      };

      mockPrisma.$transaction.mockImplementation(async (cb: (tx: any) => any) => {
        const tx = {
          tenant: { create: jest.fn().mockResolvedValue(createdTenant) },
          role:   { create: jest.fn().mockResolvedValue(createdRole), createMany: jest.fn().mockResolvedValue({ count: 3 }) },
          user:   { create: jest.fn().mockResolvedValue(createdUser) },
        };
        return cb(tx);
      });

      const result = await service.registerTenant(dto);

      expect(result.tenant.slug).toBe('acme');
      expect(result.user.email).toBe('admin@acme.com');
      expect(result.access_token).toBe('signed.jwt.token');
      expect(result.user.permissions).toEqual(['admin:*']);
    });

    it('throws ConflictException when slug is already taken', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({ id: 'existing', slug: 'acme' });

      await expect(service.registerTenant(dto)).rejects.toThrow(ConflictException);
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });
  });
});

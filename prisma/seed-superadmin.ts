/**
 * Crea el usuario super-administrador del sistema.
 * Solo necesita correrse una vez.
 *
 * Uso: npx tsx prisma/seed-superadmin.ts
 *
 * Credenciales:
 *   Empresa slug: constructora-demo  (tenant existente del seed principal)
 *   Email:        superadmin@sistema.com
 *   Contraseña:   SuperAdmin2025!
 */

import * as dotenv from 'dotenv';
dotenv.config();
import * as bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool   = new Pool({ connectionString: process.env['DATABASE_URL'] });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) } as any);

const SUPER_ADMIN_EMAIL    = 'superadmin@sistema.com';
const SUPER_ADMIN_PASSWORD = 'SuperAdmin2025!';

async function main() {
  console.log('\n🔐 Seeding super-admin user…\n');

  // Usamos el primer tenant disponible como "tenant de sistema"
  const tenant = await prisma.tenant.findFirst({ orderBy: { createdAt: 'asc' } });
  if (!tenant) {
    console.error('❌ No tenants found. Run npm run prisma:seed first.');
    process.exit(1);
  }

  // Verificar si ya existe
  const existing = await prisma.user.findFirst({
    where: { email: SUPER_ADMIN_EMAIL, tenantId: tenant.id },
  });

  if (existing) {
    if (!existing.isSuperAdmin) {
      await prisma.user.update({
        where: { id: existing.id },
        data: { isSuperAdmin: true },
      });
      console.log(`✓ User ${SUPER_ADMIN_EMAIL} upgraded to super-admin`);
    } else {
      console.log(`✓ Super-admin already exists (${SUPER_ADMIN_EMAIL})`);
    }
  } else {
    const passwordHash = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 12);
    await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: SUPER_ADMIN_EMAIL,
        passwordHash,
        firstName: 'Super',
        lastName: 'Admin',
        isSuperAdmin: true,
        isActive: true,
      },
    });
    console.log(`✓ Created super-admin user`);
  }

  console.log('\n✅ Super-admin ready!\n');
  console.log(`  Empresa (slug): ${tenant.slug}`);
  console.log(`  Email:          ${SUPER_ADMIN_EMAIL}`);
  console.log(`  Contraseña:     ${SUPER_ADMIN_PASSWORD}`);
  console.log(`  URL login:      http://localhost:3100/login\n`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); await pool.end(); });

import * as dotenv from 'dotenv';
dotenv.config();
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env['DATABASE_URL'] });
const p = new PrismaClient({ adapter: new PrismaPg(pool) } as any);

p.user.findMany({
  select: {
    email: true, firstName: true, lastName: true,
    isActive: true, isSuperAdmin: true,
    tenant: { select: { name: true, slug: true } },
    role:   { select: { name: true } },
  },
  orderBy: { createdAt: 'asc' },
}).then((users: any[]) => {
  console.log('\n===== USUARIOS EN LA PLATAFORMA =====\n');
  users.forEach((u: any, i: number) => {
    const sa = u.isSuperAdmin ? ' ⚡ SUPERADMIN' : '';
    console.log(`${i + 1}. ${u.firstName} ${u.lastName}${sa}`);
    console.log(`   Email:   ${u.email}`);
    console.log(`   Empresa: ${u.tenant?.name} (slug: ${u.tenant?.slug})`);
    console.log(`   Rol:     ${u.role?.name ?? 'Sin rol asignado'}`);
    console.log(`   Activo:  ${u.isActive ? 'Sí' : 'No'}`);
    console.log('');
  });
  console.log(`Total: ${users.length} usuario(s)\n`);
}).catch((e: Error) => console.error('Error:', e.message))
  .finally(async () => { await p.$disconnect(); await pool.end(); });

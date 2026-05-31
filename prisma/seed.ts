/**
 * Demo seed — creates a complete demo tenant for a Colombian civil engineering company.
 * Run:  npm run prisma:seed
 *
 * Creates:
 *   - 1 tenant: Constructora Demo SA
 *   - 1 admin user  (admin@demo.co / Demo1234!)
 *   - 1 viewer user (viewer@demo.co / Demo1234!)
 *   - 3 roles: ADMIN, PROJECT_MANAGER, VIEWER
 *   - 2 projects with AIU
 *   - 2 employees with payroll period
 *   - 1 APU chapter + 2 items + inputs
 *   - 1 official budget with chapters and lines
 *   - 1 certificate (acta de avance)
 */

import * as dotenv from 'dotenv';
dotenv.config();

import * as bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { ROLE_PERMISSIONS } from '../src/common/constants/permissions.constants';

const pool = new Pool({ connectionString: process.env['DATABASE_URL'] });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) } as any);

const PASS_HASH = bcrypt.hashSync('Demo1234!', 10);

async function main() {
  console.log('\n🌱 Seeding demo data...\n');

  // ── Tenant ────────────────────────────────────────────────────────────────
  const tenant = await prisma.tenant.upsert({
    where:  { slug: 'constructora-demo' },
    update: {},
    create: { name: 'Constructora Demo SA', slug: 'constructora-demo', plan: 'pro' },
  });
  console.log(`✓ Tenant: ${tenant.name} (${tenant.id})`);

  // ── Roles ─────────────────────────────────────────────────────────────────
  const roles: Record<string, any> = {};
  for (const roleName of ['ADMIN', 'PROJECT_MANAGER', 'VIEWER']) {
    roles[roleName] = await prisma.role.upsert({
      where:  { tenantId_name: { tenantId: tenant.id, name: roleName } },
      update: { permissions: ROLE_PERMISSIONS[roleName] ?? [] },
      create: { tenantId: tenant.id, name: roleName, permissions: ROLE_PERMISSIONS[roleName] ?? [] },
    });
  }
  console.log(`✓ Roles: ${Object.keys(roles).join(', ')}`);

  // ── Users ─────────────────────────────────────────────────────────────────
  await prisma.user.upsert({
    where:  { tenantId_email: { tenantId: tenant.id, email: 'admin@demo.co' } },
    update: {},
    create: {
      tenantId: tenant.id, roleId: roles['ADMIN'].id,
      email: 'admin@demo.co', passwordHash: PASS_HASH,
      firstName: 'Carlos', lastName: 'Administrador',
    },
  });
  await prisma.user.upsert({
    where:  { tenantId_email: { tenantId: tenant.id, email: 'viewer@demo.co' } },
    update: {},
    create: {
      tenantId: tenant.id, roleId: roles['VIEWER'].id,
      email: 'viewer@demo.co', passwordHash: PASS_HASH,
      firstName: 'Ana', lastName: 'Revisora',
    },
  });
  console.log(`✓ Users: admin@demo.co / viewer@demo.co (pass: Demo1234!)`);

  // ── Customers ─────────────────────────────────────────────────────────────
  const customer = await prisma.customer.upsert({
    where:  { tenantId_code: { tenantId: tenant.id, code: 'IDU-001' } },
    update: {},
    create: {
      tenantId: tenant.id, code: 'IDU-001',
      name: 'Instituto de Desarrollo Urbano - IDU',
      email: 'contratos@idu.gov.co', phone: '6013377000',
      address: 'Av. Eldorado 66-63, Bogotá',
      taxId: '899.999.088-2',
    },
  });
  console.log(`✓ Customer: ${customer.name}`);

  // ── Projects ──────────────────────────────────────────────────────────────
  const proj1 = await prisma.project.upsert({
    where:  { tenantId_code: { tenantId: tenant.id, code: 'OBR-2025-001' } },
    update: {},
    create: {
      tenantId: tenant.id, code: 'OBR-2025-001',
      name: 'Puente Peatonal Calle 100 con Autopista Norte',
      clientName: 'IDU', location: 'Bogotá D.C.',
      status: 'ACTIVE',
      contractValue: 1_500_000_000,
      adminPct: 0.10, riskPct: 0.05, profitPct: 0.08,
      adminAmount: 150_000_000, riskAmount: 75_000_000, profitAmount: 120_000_000,
      aiuAmount: 345_000_000, totalValue: 1_845_000_000,
      startDate: new Date('2025-03-01'), endDate: new Date('2025-12-31'),
    },
  });

  const proj2 = await prisma.project.upsert({
    where:  { tenantId_code: { tenantId: tenant.id, code: 'OBR-2025-002' } },
    update: {},
    create: {
      tenantId: tenant.id, code: 'OBR-2025-002',
      name: 'Pavimentación Vía Rural Vereda El Carmen',
      clientName: 'Alcaldía de Zipaquirá', location: 'Cundinamarca',
      status: 'PLANNING',
      contractValue: 800_000_000,
      adminPct: 0.12, riskPct: 0.06, profitPct: 0.10,
      adminAmount: 96_000_000, riskAmount: 48_000_000, profitAmount: 80_000_000,
      aiuAmount: 224_000_000, totalValue: 1_024_000_000,
      startDate: new Date('2025-06-01'), endDate: new Date('2026-03-31'),
    },
  });
  console.log(`✓ Projects: ${proj1.code}, ${proj2.code}`);

  // ── Employees ─────────────────────────────────────────────────────────────
  const emp1 = await prisma.employee.upsert({
    where:  { tenantId_code: { tenantId: tenant.id, code: 'EMP-001' } },
    update: {},
    create: {
      tenantId: tenant.id, code: 'EMP-001',
      firstName: 'Pedro', lastName: 'Hernández',
      document: '79450123', position: 'Residente de Obra',
      department: 'Ingeniería', contractType: 'INDEFINIDO',
      baseSalary: 4_500_000, transportAllowance: false,
      riskLevel: 'III', eps: 'Sura', pensionFund: 'Protección', compensationBox: 'Comfama',
      startDate: new Date('2023-01-15'),
    },
  });

  const emp2 = await prisma.employee.upsert({
    where:  { tenantId_code: { tenantId: tenant.id, code: 'EMP-002' } },
    update: {},
    create: {
      tenantId: tenant.id, code: 'EMP-002',
      firstName: 'María', lastName: 'López',
      document: '52890456', position: 'Oficial de Construcción',
      department: 'Obra', contractType: 'OBRA_LABOR',
      baseSalary: 1_800_000, transportAllowance: true,
      riskLevel: 'IV', eps: 'Nueva EPS', pensionFund: 'Colpensiones', compensationBox: 'Cafam',
      startDate: new Date('2025-03-01'),
    },
  });
  console.log(`✓ Employees: ${emp1.code} ${emp1.firstName}, ${emp2.code} ${emp2.firstName}`);

  // ── APU ───────────────────────────────────────────────────────────────────
  let chapter = await prisma.apuChapter.findFirst({ where: { tenantId: tenant.id, code: 'C01' } });
  if (!chapter) {
    chapter = await prisma.apuChapter.create({
      data: { tenantId: tenant.id, code: 'C01', name: 'Concretos y Morteros', order: 1 },
    });
  }

  let apuItem = await prisma.apuItem.findFirst({ where: { tenantId: tenant.id, code: 'C01-001' } });
  if (!apuItem) {
    apuItem = await prisma.apuItem.create({
      data: {
        tenantId: tenant.id, chapterId: chapter.id,
        code: 'C01-001', name: 'Concreto 3000 PSI suministro y vaciado',
        unit: 'M3', laborFactor: 1.6,
      },
    });
    await prisma.apuInput.createMany({
      data: [
        { apuItemId: apuItem.id, type: 'MATERIAL', description: 'Cemento Portland', unit: 'KG', quantity: 350, unitCost: 800, total: 280_000 },
        { apuItemId: apuItem.id, type: 'MATERIAL', description: 'Arena de río', unit: 'M3', quantity: 0.55, unitCost: 85_000, total: 46_750 },
        { apuItemId: apuItem.id, type: 'MATERIAL', description: 'Triturado 3/4"', unit: 'M3', quantity: 0.90, unitCost: 95_000, total: 85_500 },
        { apuItemId: apuItem.id, type: 'LABOR', description: 'Oficial', unit: 'JOR', quantity: 0.5, unitCost: 120_000, total: 60_000 },
        { apuItemId: apuItem.id, type: 'LABOR', description: 'Ayudante', unit: 'JOR', quantity: 1.0, unitCost: 90_000, total: 90_000 },
        { apuItemId: apuItem.id, type: 'EQUIPMENT', description: 'Mezcladora 1 bolsa', unit: 'HR', quantity: 1.5, unitCost: 35_000, total: 52_500 },
      ],
    });
    // materialCost=412,250 laborCost=150,000×1.6=240,000 equipCost=52,500 → total=704,750
    await prisma.apuItem.update({
      where: { id: apuItem.id },
      data: { materialCost: 412_250, laborCost: 150_000, equipmentCost: 52_500, totalUnitCost: 704_750 },
    });
  }
  console.log(`✓ APU: Capítulo ${chapter.code} + item ${apuItem.code} (totalUnitCost: $704,750/M3)`);

  // ── Official Budget ───────────────────────────────────────────────────────
  let budget = await prisma.officialBudget.findFirst({ where: { tenantId: tenant.id, projectId: proj1.id } });
  if (!budget) {
    budget = await prisma.officialBudget.create({
      data: {
        tenantId: tenant.id, projectId: proj1.id,
        name: 'Presupuesto Oficial v1', version: 1, status: 'APPROVED',
        adminPct: 0.10, riskPct: 0.05, profitPct: 0.08,
        directCost: 1_500_000_000,
        adminAmount: 150_000_000, riskAmount: 75_000_000, profitAmount: 120_000_000,
        aiuAmount: 345_000_000, totalBudget: 1_845_000_000,
        approvedAt: new Date(),
      },
    });

    const budgetChapter = await prisma.budgetChapter.create({
      data: { budgetId: budget.id, code: 'C01', name: 'Estructura Puente', order: 1, totalCost: 900_000_000 },
    });

    await prisma.budgetLine.createMany({
      data: [
        {
          budgetId: budget.id, chapterId: budgetChapter.id, apuItemId: apuItem.id,
          code: 'C01-001', description: 'Concreto 3000 PSI vigas y losa', unit: 'M3',
          quantity: 800, unitCost: 704_750, totalCost: 563_800_000, order: 1,
        },
        {
          budgetId: budget.id, chapterId: budgetChapter.id,
          code: 'C01-002', description: 'Acero de refuerzo fy=420 MPa', unit: 'KG',
          quantity: 180_000, unitCost: 4_200, totalCost: 756_000_000, order: 2,
        },
      ],
    });
  }
  console.log(`✓ Budget: ${budget.name} ($${Number(budget.totalBudget).toLocaleString('es-CO')} COP)`);

  // ── Certificate (Acta de Avance) ──────────────────────────────────────────
  const certExists = await prisma.projectCertificate.findFirst({ where: { projectId: proj1.id, number: 1 } });
  if (!certExists) {
    const lines = await prisma.budgetLine.findMany({ where: { budgetId: budget.id }, take: 2 });
    if (lines.length >= 2) {
      await prisma.projectCertificate.create({
        data: {
          tenantId: tenant.id, projectId: proj1.id, budgetId: budget.id,
          number: 1, name: 'Acta Parcial N° 1 — Primer corte marzo 2025',
          certDate: new Date('2025-03-31'), status: 'APPROVED',
          retentionPct: 0.05,
          grossAmount: 85_000_000, retentionAmount: 4_250_000, netAmount: 80_750_000,
          cumulativeAmount: 85_000_000, cumulativePct: 4.61,
          approvedAt: new Date('2025-04-05'),
          lines: {
            create: [
              {
                budgetLineId: lines[0].id, description: lines[0].description, unit: lines[0].unit,
                totalQuantityBudgeted: 800, previousQuantity: 0, currentQuantity: 80,
                cumulativeQuantity: 80, unitCost: 704_750,
                currentAmount: 56_380_000, cumulativeAmount: 56_380_000, executedPct: 10,
              },
              {
                budgetLineId: lines[1].id, description: lines[1].description, unit: lines[1].unit,
                totalQuantityBudgeted: 180_000, previousQuantity: 0, currentQuantity: 8_000,
                cumulativeQuantity: 8_000, unitCost: 4_200,
                currentAmount: 33_600_000, cumulativeAmount: 33_600_000, executedPct: 4.44,
              },
            ],
          },
        },
      });
    }
  }
  console.log(`✓ Certificate: Acta N°1 — $85,000,000 COP (5.6% del contrato)`);

  console.log('\n✅ Demo seed complete!\n');
  console.log('  Tenant slug: constructora-demo');
  console.log('  Admin:  admin@demo.co  / Demo1234!');
  console.log('  Viewer: viewer@demo.co / Demo1234!\n');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); await pool.end(); });

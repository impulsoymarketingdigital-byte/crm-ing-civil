/**
 * PUC Colombiano — Plan Único de Cuentas adaptado para empresas de Ingeniería Civil
 * Basado en el Decreto 2649/93 actualizado con NIIF para Pymes (Decreto 3022/2013)
 * Incluye cuentas especiales para contratos de construcción y AIU.
 *
 * Uso:  npx ts-node prisma/seed-puc.ts <tenantId>
 */

import * as dotenv from 'dotenv';
dotenv.config();
import { PrismaClient, AccountType } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env['DATABASE_URL'] });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) } as any);

interface AccountSeed {
  code: string;
  name: string;
  type: AccountType;
  parentCode?: string;
  description?: string;
}

// prettier-ignore
const PUC_ACCOUNTS: AccountSeed[] = [
  // ══════════════════════════════════════════════════════════════════════
  // CLASE 1 — ACTIVO
  // ══════════════════════════════════════════════════════════════════════
  { code: '1', name: 'ACTIVO', type: 'ASSET' },

  // Subclase 11 — Disponible
  { code: '11',   name: 'Disponible',                       type: 'ASSET', parentCode: '1' },
  { code: '1105', name: 'Caja',                             type: 'ASSET', parentCode: '11' },
  { code: '1110', name: 'Bancos',                           type: 'ASSET', parentCode: '11' },
  { code: '1115', name: 'Remesas en tránsito',              type: 'ASSET', parentCode: '11' },

  // Subclase 12 — Inversiones
  { code: '12',   name: 'Inversiones',                      type: 'ASSET', parentCode: '1' },
  { code: '1205', name: 'Acciones',                         type: 'ASSET', parentCode: '12' },
  { code: '1210', name: 'Cuotas o partes de interés social',type: 'ASSET', parentCode: '12' },

  // Subclase 13 — Deudores (Cuentas por cobrar)
  { code: '13',   name: 'Deudores',                         type: 'ASSET', parentCode: '1' },
  { code: '1305', name: 'Clientes',                         type: 'ASSET', parentCode: '13', description: 'Cuentas por cobrar a clientes por contratos de obra' },
  { code: '1310', name: 'Anticipos de clientes',            type: 'ASSET', parentCode: '13' },
  { code: '1320', name: 'Deudores varios',                  type: 'ASSET', parentCode: '13' },
  { code: '1330', name: 'Anticipos y avances',              type: 'ASSET', parentCode: '13', description: 'Anticipos a contratistas y proveedores de obra' },
  { code: '1335', name: 'Depósitos',                        type: 'ASSET', parentCode: '13' },
  { code: '1345', name: 'Ingresos por cobrar',              type: 'ASSET', parentCode: '13' },
  { code: '1355', name: 'Anticipo de impuestos y contrib.', type: 'ASSET', parentCode: '13' },
  { code: '1360', name: 'Reclamaciones',                    type: 'ASSET', parentCode: '13' },
  { code: '1380', name: 'Deudores de difícil cobro',        type: 'ASSET', parentCode: '13' },
  { code: '1399', name: 'Provisión deudores',               type: 'ASSET', parentCode: '13' },

  // Subclase 14 — Inventarios
  { code: '14',   name: 'Inventarios',                      type: 'ASSET', parentCode: '1' },
  { code: '1405', name: 'Materias primas',                  type: 'ASSET', parentCode: '14', description: 'Materiales para obra: cemento, hierro, agregados, etc.' },
  { code: '1410', name: 'Productos en proceso de obra',     type: 'ASSET', parentCode: '14', description: 'Costos acumulados en obras en ejecución (WIP construcción)' },
  { code: '1415', name: 'Obras terminadas por transferir',  type: 'ASSET', parentCode: '14' },
  { code: '1430', name: 'Productos terminados',             type: 'ASSET', parentCode: '14' },
  { code: '1455', name: 'Materiales, repuestos y accesorios',type: 'ASSET', parentCode: '14' },
  { code: '1499', name: 'Provisión inventarios',            type: 'ASSET', parentCode: '14' },

  // Subclase 15 — Propiedades, planta y equipo
  { code: '15',   name: 'Propiedades, planta y equipo',     type: 'ASSET', parentCode: '1' },
  { code: '1504', name: 'Terrenos',                         type: 'ASSET', parentCode: '15' },
  { code: '1508', name: 'Construcciones y edificaciones',   type: 'ASSET', parentCode: '15' },
  { code: '1512', name: 'Maquinaria y equipo',              type: 'ASSET', parentCode: '15', description: 'Equipo pesado de obra: retroexcavadoras, compactadores, etc.' },
  { code: '1516', name: 'Equipo de oficina',                type: 'ASSET', parentCode: '15' },
  { code: '1520', name: 'Equipo de computación',            type: 'ASSET', parentCode: '15' },
  { code: '1524', name: 'Equipo de transporte',             type: 'ASSET', parentCode: '15' },
  { code: '1592', name: 'Depreciación acumulada (PP&E)',    type: 'ASSET', parentCode: '15' },

  // Subclase 16 — Intangibles
  { code: '16',   name: 'Intangibles',                      type: 'ASSET', parentCode: '1' },
  { code: '1605', name: 'Crédito mercantil (Goodwill)',     type: 'ASSET', parentCode: '16' },
  { code: '1610', name: 'Marcas',                           type: 'ASSET', parentCode: '16' },
  { code: '1615', name: 'Patentes',                         type: 'ASSET', parentCode: '16' },
  { code: '1640', name: 'Licencias y software',             type: 'ASSET', parentCode: '16' },
  { code: '1698', name: 'Amortización acumulada intangibles',type: 'ASSET', parentCode: '16' },

  // Subclase 17 — Diferidos
  { code: '17',   name: 'Diferidos',                        type: 'ASSET', parentCode: '1' },
  { code: '1705', name: 'Gastos pagados por anticipado',    type: 'ASSET', parentCode: '17' },
  { code: '1710', name: 'Cargos diferidos de obra',         type: 'ASSET', parentCode: '17', description: 'Costos preoperativos de proyectos de construcción' },

  // Subclase 19 — Otros activos
  { code: '19',   name: 'Otros activos',                    type: 'ASSET', parentCode: '1' },
  { code: '1905', name: 'Gastos de organización',           type: 'ASSET', parentCode: '19' },
  { code: '1910', name: 'Seguros de obra',                  type: 'ASSET', parentCode: '19', description: 'Pólizas de cumplimiento, estabilidad, RC' },

  // ══════════════════════════════════════════════════════════════════════
  // CLASE 2 — PASIVO
  // ══════════════════════════════════════════════════════════════════════
  { code: '2', name: 'PASIVO', type: 'LIABILITY' },

  // Subclase 21 — Obligaciones financieras
  { code: '21',   name: 'Obligaciones financieras',         type: 'LIABILITY', parentCode: '2' },
  { code: '2105', name: 'Bancos nacionales',                type: 'LIABILITY', parentCode: '21' },
  { code: '2110', name: 'Corporaciones financieras',        type: 'LIABILITY', parentCode: '21' },
  { code: '2115', name: 'Leasing financiero',               type: 'LIABILITY', parentCode: '21', description: 'Arrendamiento financiero de equipo de obra' },

  // Subclase 22 — Proveedores
  { code: '22',   name: 'Proveedores',                      type: 'LIABILITY', parentCode: '2' },
  { code: '2205', name: 'Proveedores nacionales',           type: 'LIABILITY', parentCode: '22' },
  { code: '2210', name: 'Proveedores del exterior',         type: 'LIABILITY', parentCode: '22' },

  // Subclase 23 — Cuentas por pagar
  { code: '23',   name: 'Cuentas por pagar',                type: 'LIABILITY', parentCode: '2' },
  { code: '2305', name: 'Compañías vinculadas',             type: 'LIABILITY', parentCode: '23' },
  { code: '2315', name: 'Contratistas y subcontratistas',   type: 'LIABILITY', parentCode: '23', description: 'Saldos por pagar a subcontratistas de obra' },
  { code: '2320', name: 'Costos y gastos por pagar',        type: 'LIABILITY', parentCode: '23' },
  { code: '2325', name: 'Dividendos y participaciones',     type: 'LIABILITY', parentCode: '23' },
  { code: '2330', name: 'Retenciones en la fuente',         type: 'LIABILITY', parentCode: '23' },
  { code: '2335', name: 'Reteica',                          type: 'LIABILITY', parentCode: '23' },
  { code: '2340', name: 'Reteiva',                          type: 'LIABILITY', parentCode: '23' },
  { code: '2345', name: 'Anticipos recibidos de clientes',  type: 'LIABILITY', parentCode: '23', description: 'Anticipos de contrato recibidos' },
  { code: '2355', name: 'Deudas con socios y accionistas',  type: 'LIABILITY', parentCode: '23' },
  { code: '2360', name: 'Dividendos por pagar',             type: 'LIABILITY', parentCode: '23' },

  // Subclase 24 — Impuestos, gravámenes y tasas
  { code: '24',   name: 'Impuestos, gravámenes y tasas',    type: 'LIABILITY', parentCode: '2' },
  { code: '2404', name: 'IVA por pagar',                    type: 'LIABILITY', parentCode: '24' },
  { code: '2408', name: 'Impuesto de industria y comercio', type: 'LIABILITY', parentCode: '24' },
  { code: '2412', name: 'Impuesto de renta por pagar',      type: 'LIABILITY', parentCode: '24' },
  { code: '2416', name: 'IVA generado (19%)',               type: 'LIABILITY', parentCode: '24', description: 'IVA cobrado en ventas y servicios gravados' },

  // Subclase 25 — Obligaciones laborales
  { code: '25',   name: 'Obligaciones laborales',           type: 'LIABILITY', parentCode: '2' },
  { code: '2505', name: 'Salarios por pagar',               type: 'LIABILITY', parentCode: '25' },
  { code: '2510', name: 'Cesantías consolidadas',           type: 'LIABILITY', parentCode: '25' },
  { code: '2515', name: 'Intereses sobre cesantías',        type: 'LIABILITY', parentCode: '25' },
  { code: '2520', name: 'Prima de servicios',               type: 'LIABILITY', parentCode: '25' },
  { code: '2525', name: 'Vacaciones consolidadas',          type: 'LIABILITY', parentCode: '25' },
  { code: '2530', name: 'Prestaciones sociales',            type: 'LIABILITY', parentCode: '25' },

  // Subclase 27 — Diferidos pasivo
  { code: '27',   name: 'Diferidos pasivo',                 type: 'LIABILITY', parentCode: '2' },
  { code: '2705', name: 'Ingresos anticipados de obra',     type: 'LIABILITY', parentCode: '27', description: 'Ingresos recibidos anticipadamente de contratos de obra' },

  // Subclase 29 — Otros pasivos
  { code: '29',   name: 'Otros pasivos',                    type: 'LIABILITY', parentCode: '2' },
  { code: '2905', name: 'Bonos en circulación',             type: 'LIABILITY', parentCode: '29' },
  { code: '2910', name: 'Depósitos recibidos',              type: 'LIABILITY', parentCode: '29' },

  // ══════════════════════════════════════════════════════════════════════
  // CLASE 3 — PATRIMONIO
  // ══════════════════════════════════════════════════════════════════════
  { code: '3', name: 'PATRIMONIO', type: 'EQUITY' },

  { code: '31',   name: 'Capital social',                   type: 'EQUITY', parentCode: '3' },
  { code: '3105', name: 'Capital suscrito y pagado',        type: 'EQUITY', parentCode: '31' },

  { code: '32',   name: 'Superávit de capital',             type: 'EQUITY', parentCode: '3' },
  { code: '3205', name: 'Prima en colocación de acciones',  type: 'EQUITY', parentCode: '32' },

  { code: '33',   name: 'Reservas',                         type: 'EQUITY', parentCode: '3' },
  { code: '3305', name: 'Reserva legal',                    type: 'EQUITY', parentCode: '33' },
  { code: '3310', name: 'Reservas estatutarias',            type: 'EQUITY', parentCode: '33' },
  { code: '3315', name: 'Reservas ocasionales',             type: 'EQUITY', parentCode: '33' },

  { code: '36',   name: 'Resultados del ejercicio',         type: 'EQUITY', parentCode: '3' },
  { code: '3605', name: 'Utilidad del ejercicio',           type: 'EQUITY', parentCode: '36' },
  { code: '3610', name: 'Pérdida del ejercicio',            type: 'EQUITY', parentCode: '36' },

  { code: '37',   name: 'Resultados de ejercicios anteriores',type: 'EQUITY', parentCode: '3' },
  { code: '3705', name: 'Utilidades acumuladas',            type: 'EQUITY', parentCode: '37' },
  { code: '3710', name: 'Pérdidas acumuladas',              type: 'EQUITY', parentCode: '37' },

  // ══════════════════════════════════════════════════════════════════════
  // CLASE 4 — INGRESOS
  // ══════════════════════════════════════════════════════════════════════
  { code: '4', name: 'INGRESOS', type: 'REVENUE' },

  { code: '41',   name: 'Ingresos operacionales',           type: 'REVENUE', parentCode: '4' },
  { code: '4105', name: 'Industria manufacturera',          type: 'REVENUE', parentCode: '41' },
  { code: '4120', name: 'Industria de la construcción',     type: 'REVENUE', parentCode: '41', description: 'Ingresos por contratos de obra civil' },
  { code: '4121', name: '  Contratos de obra pública',      type: 'REVENUE', parentCode: '41', description: 'Licitaciones y contratos con entidades estatales (SECOP)' },
  { code: '4122', name: '  Contratos de obra privada',      type: 'REVENUE', parentCode: '41', description: 'Contratos con clientes privados' },
  { code: '4123', name: '  Administración (A de AIU)',      type: 'REVENUE', parentCode: '41', description: 'Componente administración del AIU facturado' },
  { code: '4124', name: '  Imprevistos (I de AIU)',         type: 'REVENUE', parentCode: '41', description: 'Componente imprevistos del AIU facturado' },
  { code: '4125', name: '  Utilidad (U de AIU)',            type: 'REVENUE', parentCode: '41', description: 'Componente utilidad del AIU facturado' },
  { code: '4135', name: 'Comercio al por mayor y menor',    type: 'REVENUE', parentCode: '41' },
  { code: '4145', name: 'Servicios de ingeniería y consultoría',type: 'REVENUE', parentCode: '41' },

  { code: '42',   name: 'Ingresos no operacionales',        type: 'REVENUE', parentCode: '4' },
  { code: '4210', name: 'Dividendos y participaciones',     type: 'REVENUE', parentCode: '42' },
  { code: '4215', name: 'Intereses',                        type: 'REVENUE', parentCode: '42' },
  { code: '4220', name: 'Arrendamientos',                   type: 'REVENUE', parentCode: '42', description: 'Alquiler de equipo de obra a terceros' },
  { code: '4225', name: 'Comisiones',                       type: 'REVENUE', parentCode: '42' },
  { code: '4230', name: 'Servicios',                        type: 'REVENUE', parentCode: '42' },
  { code: '4240', name: 'Utilidad en venta de activos',     type: 'REVENUE', parentCode: '42' },
  { code: '4245', name: 'Recuperaciones',                   type: 'REVENUE', parentCode: '42' },
  { code: '4250', name: 'Indemnizaciones',                  type: 'REVENUE', parentCode: '42' },

  // ══════════════════════════════════════════════════════════════════════
  // CLASE 5 — GASTOS (Operacionales de administración)
  // ══════════════════════════════════════════════════════════════════════
  { code: '5', name: 'GASTOS', type: 'EXPENSE' },

  { code: '51',   name: 'Gastos operacionales de administración',type: 'EXPENSE', parentCode: '5' },
  { code: '5105', name: 'Personal - administración',        type: 'EXPENSE', parentCode: '51' },
  { code: '5110', name: 'Honorarios',                       type: 'EXPENSE', parentCode: '51' },
  { code: '5115', name: 'Impuestos',                        type: 'EXPENSE', parentCode: '51' },
  { code: '5120', name: 'Arrendamientos (oficinas)',        type: 'EXPENSE', parentCode: '51' },
  { code: '5125', name: 'Contribuciones y afiliaciones',    type: 'EXPENSE', parentCode: '51' },
  { code: '5130', name: 'Seguros',                          type: 'EXPENSE', parentCode: '51' },
  { code: '5135', name: 'Servicios públicos',               type: 'EXPENSE', parentCode: '51' },
  { code: '5140', name: 'Gastos legales',                   type: 'EXPENSE', parentCode: '51' },
  { code: '5145', name: 'Mantenimiento y reparaciones (adm.)',type: 'EXPENSE', parentCode: '51' },
  { code: '5150', name: 'Adecuación e instalación',         type: 'EXPENSE', parentCode: '51' },
  { code: '5155', name: 'Gastos de viaje (adm.)',           type: 'EXPENSE', parentCode: '51' },
  { code: '5160', name: 'Depreciaciones (adm.)',            type: 'EXPENSE', parentCode: '51' },
  { code: '5165', name: 'Amortizaciones (adm.)',            type: 'EXPENSE', parentCode: '51' },
  { code: '5195', name: 'Diversos (adm.)',                  type: 'EXPENSE', parentCode: '51' },

  { code: '52',   name: 'Gastos operacionales de ventas',   type: 'EXPENSE', parentCode: '5' },
  { code: '5205', name: 'Personal - ventas',                type: 'EXPENSE', parentCode: '52' },
  { code: '5215', name: 'Publicidad y propaganda',          type: 'EXPENSE', parentCode: '52' },
  { code: '5220', name: 'Gastos de representación',         type: 'EXPENSE', parentCode: '52' },

  // ══════════════════════════════════════════════════════════════════════
  // CLASE 6 — COSTOS DE PRODUCCIÓN / COSTOS DIRECTOS DE OBRA
  // ══════════════════════════════════════════════════════════════════════
  { code: '6', name: 'COSTOS DE OBRA', type: 'EXPENSE' },

  { code: '61',   name: 'Costos directos de obra',          type: 'EXPENSE', parentCode: '6' },
  { code: '6105', name: 'Materiales de construcción',       type: 'EXPENSE', parentCode: '61', description: 'Cemento, hierro, agregados, bloques, tuberías, etc.' },
  { code: '6110', name: 'Mano de obra directa',             type: 'EXPENSE', parentCode: '61', description: 'Salarios y prestaciones de obreros de obra' },
  { code: '6115', name: 'Subcontratos de obra',             type: 'EXPENSE', parentCode: '61', description: 'Costo de subcontratistas especializados' },
  { code: '6120', name: 'Equipo y maquinaria (alquiler)',   type: 'EXPENSE', parentCode: '61', description: 'Alquiler de maquinaria pesada' },
  { code: '6125', name: 'Transporte de materiales',         type: 'EXPENSE', parentCode: '61' },
  { code: '6130', name: 'Combustibles y lubricantes',       type: 'EXPENSE', parentCode: '61' },
  { code: '6135', name: 'Herramientas y equipos menores',   type: 'EXPENSE', parentCode: '61' },
  { code: '6140', name: 'Pólizas de obra',                  type: 'EXPENSE', parentCode: '61', description: 'Seguro de cumplimiento, garantías de obra' },
  { code: '6145', name: 'Topografía y estudios de suelos',  type: 'EXPENSE', parentCode: '61' },
  { code: '6150', name: 'Interventoría técnica',            type: 'EXPENSE', parentCode: '61' },
  { code: '6155', name: 'Permisos y licencias de obra',     type: 'EXPENSE', parentCode: '61' },
  { code: '6160', name: 'Depreciación maquinaria de obra',  type: 'EXPENSE', parentCode: '61' },
  { code: '6195', name: 'Otros costos directos de obra',    type: 'EXPENSE', parentCode: '61' },

  { code: '62',   name: 'Costos indirectos de obra (AIU)',  type: 'EXPENSE', parentCode: '6' },
  { code: '6205', name: 'Administración de obra (A)',       type: 'EXPENSE', parentCode: '62', description: 'Componente Administración del AIU — personal adm., oficina de obra' },
  { code: '6210', name: 'Imprevistos de obra (I)',          type: 'EXPENSE', parentCode: '62', description: 'Componente Imprevistos del AIU — contingencias y riesgos' },
  { code: '6215', name: 'Utilidad del contratista (U)',     type: 'EXPENSE', parentCode: '62', description: 'Componente Utilidad del AIU — margen del contratista' },

  // ══════════════════════════════════════════════════════════════════════
  // CLASE 7 — COSTOS DE VENTAS
  // ══════════════════════════════════════════════════════════════════════
  { code: '7', name: 'COSTOS DE VENTAS', type: 'EXPENSE' },

  { code: '71',   name: 'Costos de ventas y de prestación de servicios',type: 'EXPENSE', parentCode: '7' },
  { code: '7105', name: 'Industria manufacturera - costo',  type: 'EXPENSE', parentCode: '71' },
  { code: '7120', name: 'Contratos de construcción - costo',type: 'EXPENSE', parentCode: '71', description: 'Traslado de costos de obra al resultado' },

  // ══════════════════════════════════════════════════════════════════════
  // CLASE 9 — CUENTAS DE ORDEN (memorandum)
  // ══════════════════════════════════════════════════════════════════════
  { code: '9', name: 'CUENTAS DE ORDEN', type: 'ASSET' },

  { code: '91',   name: 'Cuentas de orden deudoras',        type: 'ASSET', parentCode: '9' },
  { code: '9105', name: 'Bienes y valores entregados en garantía',type: 'ASSET', parentCode: '91' },
  { code: '9120', name: 'Activos totalmente depreciados',   type: 'ASSET', parentCode: '91' },
  { code: '9125', name: 'Contratos de obra en ejecución',   type: 'ASSET', parentCode: '91', description: 'Control del valor de contratos de obra activos' },
  { code: '9130', name: 'Licitaciones en curso',            type: 'ASSET', parentCode: '91', description: 'Registro de propuestas presentadas' },
];

async function seedPuc(tenantId: string) {
  console.log(`\n🌱 Seeding PUC Colombiano for tenant: ${tenantId}\n`);

  // Build a map code → id for parent resolution
  const codeToId = new Map<string, string>();

  let created = 0;
  let skipped = 0;

  for (const acc of PUC_ACCOUNTS) {
    const parentId = acc.parentCode ? codeToId.get(acc.parentCode) : undefined;

    const existing = await prisma.account.findFirst({
      where: { tenantId, code: acc.code },
    });

    if (existing) {
      codeToId.set(acc.code, existing.id);
      skipped++;
      continue;
    }

    const record = await prisma.account.create({
      data: {
        tenantId,
        code: acc.code,
        name: acc.name,
        type: acc.type,
        parentId: parentId ?? null,
        description: acc.description ?? null,
        isActive: true,
      },
    });

    codeToId.set(acc.code, record.id);
    created++;
    console.log(`  ✓ ${acc.code.padEnd(6)} ${acc.name}`);
  }

  console.log(`\n📊 PUC seed complete — ${created} created, ${skipped} already existed.\n`);
}

// ── CLI entrypoint ─────────────────────────────────────────────────────────
const tenantId = process.argv[2];
if (!tenantId) {
  console.error('Usage: npx ts-node prisma/seed-puc.ts <tenantId>');
  process.exit(1);
}

seedPuc(tenantId)
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

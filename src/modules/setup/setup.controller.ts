import {
  BadRequestException, Body, Controller,
  ForbiddenException, Get, Post,
} from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { ROLE_PERMISSIONS } from '../../common/constants/permissions.constants';
import * as bcrypt from 'bcryptjs';

/**
 * Setup endpoint — crea el primer tenant y usuarios iniciales.
 * Protegido por SETUP_SECRET (variable de entorno).
 *
 * Uso:
 *   1. GET  /api/v1/setup/status  → verifica si ya fue inicializado
 *   2. POST /api/v1/setup         → inicializa (solo una vez)
 *
 * Body JSON:
 * {
 *   "secret": "TU_SETUP_SECRET",
 *   "companyName": "Mi Empresa SAS",
 *   "slug": "mi-empresa",
 *   "adminEmail": "admin@miempresa.com",
 *   "adminPassword": "ContraseñaSegura123!",
 *   "superAdminEmail": "superadmin@sistema.com",   <- opcional
 *   "superAdminPassword": "OtraContraseña456!"      <- opcional
 * }
 */
@Public()
@Controller('setup')
export class SetupController {
  constructor(private readonly prisma: PrismaService) {}

  /** GET /api/v1/setup/status */
  @Get('status')
  async status() {
    const count = await this.prisma.tenant.count();
    return {
      initialized: count > 0,
      tenants: count,
      message: count > 0
        ? 'Sistema ya inicializado. Inicia sesión en /login.'
        : 'Listo para inicializar. Llama POST /api/v1/setup con tu clave secreta.',
    };
  }

  /** POST /api/v1/setup */
  @Post()
  async setup(@Body() body: {
    secret: string;
    companyName: string;
    slug: string;
    adminEmail: string;
    adminPassword: string;
    superAdminEmail?: string;
    superAdminPassword?: string;
  }) {
    // Verificar clave secreta
    const expected = process.env['SETUP_SECRET'];
    if (!expected) {
      throw new ForbiddenException(
        'La variable SETUP_SECRET no está configurada en el servidor. Agrégala en "Medio ambiente" de Dokploy.',
      );
    }
    if (body.secret !== expected) {
      throw new ForbiddenException('Clave secreta incorrecta.');
    }

    // Validaciones básicas
    if (!body.companyName || !body.slug || !body.adminEmail || !body.adminPassword) {
      throw new BadRequestException('Faltan campos obligatorios: companyName, slug, adminEmail, adminPassword.');
    }
    if (body.adminPassword.length < 8) {
      throw new BadRequestException('adminPassword debe tener al menos 8 caracteres.');
    }

    // Protección anti-duplicado
    const existing = await this.prisma.tenant.findUnique({ where: { slug: body.slug } });
    if (existing) {
      throw new BadRequestException(
        `El slug "${body.slug}" ya existe. Si necesitas crear otro tenant, usa el registro normal en /register.`,
      );
    }

    // Fechas de suscripción (activa por 10 años — cuenta principal)
    const farFuture = new Date();
    farFuture.setFullYear(farFuture.getFullYear() + 10);

    // Crear todo en una sola transacción
    const { tenant, adminEmail, adminPassword, saEmail, saPassword } =
      await this.prisma.$transaction(async tx => {
        const tenant = await tx.tenant.create({
          data: {
            name: body.companyName,
            slug: body.slug,
            plan: 'monthly',
            subscriptionStatus: 'active',
            trialEndsAt: farFuture,
            subscriptionEndDate: farFuture,
          },
        });

        // Todos los roles predefinidos
        const roleNames = [
          'ADMIN', 'PROJECT_MANAGER', 'ACCOUNTANT', 'PAYROLL_MANAGER',
          'ESTIMATOR', 'INVENTORY_MANAGER', 'SALES_REP', 'VIEWER',
        ];
        const roles = await tx.role.createManyAndReturn({
          data: roleNames.map(name => ({
            tenantId: tenant.id,
            name,
            permissions: ROLE_PERMISSIONS[name] ?? [],
          })),
        });
        const adminRole = roles.find(r => r.name === 'ADMIN')!;

        // Usuario administrador
        await tx.user.create({
          data: {
            tenantId: tenant.id,
            roleId: adminRole.id,
            email: body.adminEmail,
            passwordHash: await bcrypt.hash(body.adminPassword, 12),
            firstName: 'Administrador',
            lastName: body.companyName,
            isActive: true,
          },
        });

        // Super-admin del sistema
        const saEmail    = body.superAdminEmail    ?? `superadmin@${body.slug}.local`;
        const saPassword = body.superAdminPassword ?? body.adminPassword;
        await tx.user.create({
          data: {
            tenantId: tenant.id,
            email: saEmail,
            passwordHash: await bcrypt.hash(saPassword, 12),
            firstName: 'Super',
            lastName: 'Admin',
            isActive: true,
            isSuperAdmin: true,
          },
        });

        return {
          tenant,
          adminEmail:    body.adminEmail,
          adminPassword: body.adminPassword,
          saEmail,
          saPassword,
        };
      });

    return {
      ok: true,
      mensaje: '✅ Sistema inicializado correctamente.',
      empresa: {
        nombre: tenant.name,
        slug:   tenant.slug,
        id:     tenant.id,
      },
      credenciales: {
        admin: {
          email:       adminEmail,
          contraseña:  adminPassword,
          rol:         'ADMIN (acceso completo a la empresa)',
        },
        superAdmin: {
          email:       saEmail,
          contraseña:  saPassword,
          rol:         '⚡ Super Admin (acceso a todo el sistema)',
        },
      },
      instrucciones: [
        `1. Abre https://crm.elohim.solutions`,
        `2. Ingresa el slug: "${tenant.slug}"`,
        `3. Usa el email y contraseña del admin o super-admin`,
        `4. ¡Listo! El endpoint /setup ya no permitirá crear duplicados del slug "${tenant.slug}"`,
      ],
    };
  }
}

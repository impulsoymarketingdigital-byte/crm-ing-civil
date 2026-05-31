import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );

  app.setGlobalPrefix('api/v1');
  app.enableCors({
    origin: (process.env.CORS_ORIGINS ?? 'http://localhost:5173').split(','),
    credentials: true,
  });

  // ── Swagger / OpenAPI ────────────────────────────────────────────────────
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('ERP Ingeniería Civil')
      .setDescription(
        'API completa para gestión de proyectos de construcción en Colombia. ' +
        'Incluye: Nómina+CST, APU, Presupuestos con AIU, Actas de Avance, ' +
        'Liquidación, SECOP II y reportes PDF.',
      )
      .setVersion('1.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', in: 'header' },
        'JWT',
      )
      .addTag('auth',         'Autenticación y registro de tenants')
      .addTag('users',        'Gestión de usuarios')
      .addTag('roles',        'Roles y permisos RBAC')
      .addTag('accounts',     'Plan Único de Cuentas (PUC Colombiano)')
      .addTag('journal-entries', 'Asientos contables')
      .addTag('ledger',       'Libro mayor y balance de comprobación')
      .addTag('inventory',    'Inventario con costo promedio ponderado (WAC)')
      .addTag('customers',    'Clientes')
      .addTag('invoices',     'Facturas de venta')
      .addTag('ai-automation','OCR de facturas con IA (Claude API)')
      .addTag('projects',     'Proyectos de obra con cálculo AIU')
      .addTag('payroll',      'Nómina y carga social colombiana')
      .addTag('apu',          'Análisis de Precios Unitarios')
      .addTag('budgets',      'Presupuesto oficial con AIU')
      .addTag('certificates', 'Actas de avance de obra')
      .addTag('liquidations', 'Liquidación final de contratos')
      .addTag('secop',        'Búsqueda en SECOP II (Colombia Compra Eficiente)')
      .addTag('pdf',          'Generación de reportes PDF')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
      customSiteTitle: 'ERP Ingeniería Civil — API Docs',
    });
    console.log(`Swagger docs: http://localhost:${process.env.PORT ?? 3000}/docs`);
  }

  // ── Health endpoint ──────────────────────────────────────────────────────
  const httpAdapter = app.getHttpAdapter();
  httpAdapter.get('/health', (_req: any, res: any) => res.send({ status: 'ok', ts: new Date() }));

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`API running on http://localhost:${port}/api/v1`);
}

bootstrap();

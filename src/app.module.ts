import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { UsersModule } from './modules/users/users.module';
import { RolesModule } from './modules/roles/roles.module';
import { AccountsModule } from './modules/accounts/accounts.module';
import { JournalEntriesModule } from './modules/journal-entries/journal-entries.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { DatabaseModule } from './infrastructure/database/database.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    DatabaseModule,
    // Auth must come before domain modules so the JWT strategy is registered first
    AuthModule,
    TenantsModule,
    UsersModule,
    RolesModule,
    AccountsModule,
    JournalEntriesModule,
    InventoryModule,
  ],
  providers: [
    // 1. Validate JWT on every request (skip @Public() routes)
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // 2. Enforce RBAC + cross-tenant isolation on every authenticated request
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}

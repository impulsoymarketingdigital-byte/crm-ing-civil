import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './modules/auth/auth.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { UsersModule } from './modules/users/users.module';
import { RolesModule } from './modules/roles/roles.module';
import { AccountsModule } from './modules/accounts/accounts.module';
import { JournalEntriesModule } from './modules/journal-entries/journal-entries.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { LedgerModule } from './modules/ledger/ledger.module';
import { SalesModule } from './modules/sales/sales.module';
import { AiAutomationModule } from './modules/ai-automation/ai-automation.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { PayrollModule } from './modules/payroll/payroll.module';
import { ApuModule } from './modules/apu/apu.module';
import { BudgetModule } from './modules/budget/budget.module';
import { CertificatesModule } from './modules/certificates/certificates.module';
import { LiquidationModule } from './modules/liquidation/liquidation.module';
import { PdfModule } from './modules/pdf/pdf.module';
import { SecopModule } from './modules/secop/secop.module';
import { AccountingModule } from './modules/accounting/accounting.module';
import { PayablesModule } from './modules/payables/payables.module';
import { PettyCashModule } from './modules/petty-cash/petty-cash.module';
import { TaxesModule } from './modules/taxes/taxes.module';
import { BillingModule } from './modules/billing/billing.module';
import { SuperAdminModule } from './modules/super-admin/super-admin.module';
import { SubscriptionModule } from './modules/subscription/subscription.module';
import { DatabaseModule } from './infrastructure/database/database.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { TrialGuard } from './common/guards/trial.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    ScheduleModule.forRoot(),   // enables @Cron decorators
    DatabaseModule,
    AuthModule,
    TenantsModule,
    UsersModule,
    RolesModule,
    AccountsModule,
    JournalEntriesModule,
    InventoryModule,
    LedgerModule,
    SalesModule,
    AiAutomationModule,
    ProjectsModule,
    PayrollModule,
    ApuModule,
    BudgetModule,
    CertificatesModule,
    LiquidationModule,
    PdfModule,
    SecopModule,
    AccountingModule,
    PayablesModule,
    PettyCashModule,
    TaxesModule,
    BillingModule,
    SuperAdminModule,
    SubscriptionModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    // TrialGuard runs AFTER JwtAuthGuard — checks trial/subscription status
    { provide: APP_GUARD, useClass: TrialGuard },
  ],
})
export class AppModule {}

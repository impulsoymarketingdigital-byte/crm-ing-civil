import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TenantsModule } from './modules/tenants/tenants.module';
import { UsersModule } from './modules/users/users.module';
import { RolesModule } from './modules/roles/roles.module';
import { AccountsModule } from './modules/accounts/accounts.module';
import { JournalEntriesModule } from './modules/journal-entries/journal-entries.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { DatabaseModule } from './infrastructure/database/database.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    DatabaseModule,
    TenantsModule,
    UsersModule,
    RolesModule,
    AccountsModule,
    JournalEntriesModule,
    InventoryModule,
  ],
})
export class AppModule {}

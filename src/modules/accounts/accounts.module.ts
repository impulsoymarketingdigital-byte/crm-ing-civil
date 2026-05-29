import { Module } from '@nestjs/common';
import { AccountsService } from './application/accounts.service';
import { AccountsController } from './presentation/accounts.controller';
import { AccountsRepository } from './infrastructure/accounts.repository';

@Module({
  controllers: [AccountsController],
  providers: [AccountsService, AccountsRepository],
  exports: [AccountsService],
})
export class AccountsModule {}

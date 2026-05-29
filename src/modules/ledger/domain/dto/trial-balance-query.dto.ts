import { IsDateString, IsEnum, IsOptional } from 'class-validator';
import { AccountType } from '@prisma/client';

export class TrialBalanceQueryDto {
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  /** Filter trial balance to a specific account type */
  @IsOptional()
  @IsEnum(AccountType)
  accountType?: AccountType;
}

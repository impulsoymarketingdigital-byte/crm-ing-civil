import { IsString, IsNotEmpty, IsUUID, IsEnum, IsOptional } from 'class-validator';
import { AccountType } from '@prisma/client';

export class CreateAccountDto {
  @IsUUID() tenantId: string;
  @IsString() @IsNotEmpty() code: string;
  @IsString() @IsNotEmpty() name: string;
  @IsEnum(AccountType) type: AccountType;
  @IsOptional() @IsUUID() parentId?: string;
  @IsOptional() @IsString() description?: string;
}

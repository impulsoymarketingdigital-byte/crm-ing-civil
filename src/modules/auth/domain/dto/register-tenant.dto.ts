import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class TenantInfoDto {
  @IsString() @IsNotEmpty() name: string;

  @IsString()
  @Matches(/^[a-z0-9-]+$/, { message: 'slug must be lowercase alphanumeric with hyphens' })
  @MinLength(3)
  slug: string;

  @IsOptional() @IsString() plan?: string;
}

export class AdminUserDto {
  @IsEmail() email: string;
  @IsString() @MinLength(8) password: string;
  @IsString() @IsNotEmpty() firstName: string;
  @IsString() @IsNotEmpty() lastName: string;
}

export class RegisterTenantDto {
  @ValidateNested() @Type(() => TenantInfoDto) tenant: TenantInfoDto;
  @ValidateNested() @Type(() => AdminUserDto)  admin: AdminUserDto;
}

import { IsEmail, IsString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class LoginDto {
  /** Company slug (preferred) — e.g. "constructora-demo" */
  @IsOptional()
  @IsString()
  slug?: string;

  /** Legacy: direct tenant UUID (kept for backward-compat / API clients) */
  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}

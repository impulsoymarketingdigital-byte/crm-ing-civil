import { IsEmail, IsString, IsNotEmpty, IsUUID } from 'class-validator';

export class LoginDto {
  @IsUUID()
  tenantId: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}

import { IsEmail, IsString, IsNotEmpty, MinLength, IsOptional, IsUUID } from 'class-validator';

export class CreateUserDto {
  @IsUUID() tenantId: string;
  @IsOptional() @IsUUID() roleId?: string;
  @IsEmail() email: string;
  @IsString() @MinLength(8) password: string;
  @IsString() @IsNotEmpty() firstName: string;
  @IsString() @IsNotEmpty() lastName: string;
}

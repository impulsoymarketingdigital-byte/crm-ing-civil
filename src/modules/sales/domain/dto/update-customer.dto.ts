import { IsBoolean, IsEmail, IsOptional, IsString } from 'class-validator';

export class UpdateCustomerDto {
  @IsOptional() @IsString()  name?: string;
  @IsOptional() @IsEmail()   email?: string;
  @IsOptional() @IsString()  phone?: string;
  @IsOptional() @IsString()  address?: string;
  @IsOptional() @IsString()  taxId?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

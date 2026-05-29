import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateCustomerDto {
  @IsString() @IsNotEmpty() @MinLength(2) code: string;
  @IsString() @IsNotEmpty() name: string;
  @IsOptional() @IsEmail()   email?: string;
  @IsOptional() @IsString()  phone?: string;
  @IsOptional() @IsString()  address?: string;
  @IsOptional() @IsString()  taxId?: string;
}

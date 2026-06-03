import {
  IsString, IsOptional, IsEnum, IsBoolean,
  IsNumber, Min, IsDateString,
} from 'class-validator';
import { ContractType, ArlRiskLevel } from '@prisma/client';

export class CreateEmployeeDto {
  @IsString() code: string;
  @IsString() firstName: string;
  @IsString() lastName: string;
  @IsString() document: string;
  @IsString() position: string;
  @IsOptional() @IsString() department?: string;
  @IsOptional() @IsEnum(ContractType) contractType?: ContractType;
  @IsNumber() @Min(0) baseSalary: number;
  @IsOptional() @IsBoolean() transportAllowance?: boolean;
  @IsOptional() @IsEnum(ArlRiskLevel) riskLevel?: ArlRiskLevel;
  @IsOptional() @IsString() eps?: string;
  @IsOptional() @IsString() pensionFund?: string;
  @IsOptional() @IsString() compensationBox?: string;
  @IsDateString() startDate: string;
  @IsOptional() @IsDateString() endDate?: string;
  @IsOptional() @IsString() bankAccount?: string;
  @IsOptional() @IsString() bankAccountType?: string;
  @IsOptional() @IsString() bankName?: string;
}

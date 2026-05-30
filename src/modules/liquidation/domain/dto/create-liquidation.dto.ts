import {
  IsString, IsDateString, IsOptional, IsNumber, Min,
  IsArray, ValidateNested, IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DeductionType } from '@prisma/client';

export class LiquidationDeductionDto {
  @IsEnum(DeductionType) type: DeductionType;
  @IsString() description: string;
  @IsNumber() @Min(0) amount: number;
}

export class CreateLiquidationDto {
  @IsString() projectId: string;
  @IsString() budgetId: string;
  @IsDateString() liquidationDate: string;
  @IsNumber() @Min(0) contractValue: number;
  @IsOptional() @IsNumber() @Min(0) additionsValue?: number;
  @IsOptional() @IsString() notes?: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => LiquidationDeductionDto)
  deductions: LiquidationDeductionDto[];
}

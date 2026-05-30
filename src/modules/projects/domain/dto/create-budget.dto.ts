import { IsString, IsEnum, IsNumber, Min, IsOptional } from 'class-validator';
import { BudgetCategory } from '@prisma/client';

export class CreateBudgetDto {
  @IsEnum(BudgetCategory) category: BudgetCategory;
  @IsString() description: string;
  @IsOptional() @IsString() unit?: string;
  @IsNumber() @Min(0) quantity: number;
  @IsNumber() @Min(0) unitCost: number;
}

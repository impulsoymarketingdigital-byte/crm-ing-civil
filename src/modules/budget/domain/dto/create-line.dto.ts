import { IsString, IsOptional, IsNumber, Min, IsInt } from 'class-validator';

export class CreateBudgetLineDto {
  @IsString() chapterId: string;
  @IsOptional() @IsString() apuItemId?: string;
  @IsOptional() @IsString() code?: string;
  @IsString() description: string;
  @IsOptional() @IsString() unit?: string;
  @IsNumber() @Min(0) quantity: number;
  @IsNumber() @Min(0) unitCost: number;
  @IsOptional() @IsInt() @Min(0) order?: number;
}

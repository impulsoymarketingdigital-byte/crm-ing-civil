import { IsString, IsDateString, IsOptional, IsNumber, Min, Max, ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

export class CertificateLineDto {
  @IsString() budgetLineId: string;
  @IsString() description: string;
  @IsOptional() @IsString() unit?: string;
  @IsNumber() @Min(0) totalQuantityBudgeted: number;
  @IsNumber() @Min(0) previousQuantity: number;
  @IsNumber() @Min(0) currentQuantity: number;
  @IsNumber() @Min(0) unitCost: number;
}

export class CreateCertificateDto {
  @IsString() projectId: string;
  @IsString() budgetId: string;
  @IsOptional() @IsString() name?: string;
  @IsDateString() certDate: string;
  @IsOptional() @IsNumber() @Min(0) @Max(1) retentionPct?: number;
  @IsOptional() @IsString() notes?: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => CertificateLineDto)
  lines: CertificateLineDto[];
}

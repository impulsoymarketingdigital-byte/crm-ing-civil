import { IsString, IsOptional, IsNumber, Min, Max } from 'class-validator';

export class CreateOfficialBudgetDto {
  @IsString() projectId: string;
  @IsString() name: string;
  @IsOptional() @IsNumber() @Min(0) @Max(1) adminPct?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(1) riskPct?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(1) profitPct?: number;
}

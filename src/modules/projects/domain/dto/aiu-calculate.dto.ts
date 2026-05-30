import { IsNumber, Min, Max } from 'class-validator';

export class AiuCalculateDto {
  @IsNumber() @Min(0) contractValue: number;
  /** 0–1, e.g. 0.10 = 10% */
  @IsNumber() @Min(0) @Max(1) adminPct: number;
  @IsNumber() @Min(0) @Max(1) riskPct: number;
  @IsNumber() @Min(0) @Max(1) profitPct: number;
}

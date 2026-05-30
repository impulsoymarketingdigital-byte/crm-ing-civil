import {
  IsString, IsOptional, IsEnum, IsDateString,
  IsNumber, Min, Max,
} from 'class-validator';
import { ProjectStatus } from '@prisma/client';

export class CreateProjectDto {
  @IsString() code: string;
  @IsString() name: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsEnum(ProjectStatus) status?: ProjectStatus;
  @IsOptional() @IsString() clientName?: string;
  @IsOptional() @IsString() location?: string;

  @IsOptional() @IsNumber() @Min(0) contractValue?: number;

  /** AIU percentages as decimals (0–1). e.g. 0.10 = 10% */
  @IsOptional() @IsNumber() @Min(0) @Max(1) adminPct?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(1) riskPct?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(1) profitPct?: number;

  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() endDate?: string;
}

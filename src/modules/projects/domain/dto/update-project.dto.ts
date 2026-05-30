import {
  IsString, IsOptional, IsEnum, IsDateString,
  IsNumber, Min, Max,
} from 'class-validator';
import { ProjectStatus } from '@prisma/client';

export class UpdateProjectDto {
  @IsOptional() @IsString() code?: string;
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsEnum(ProjectStatus) status?: ProjectStatus;
  @IsOptional() @IsString() clientName?: string;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsNumber() @Min(0) contractValue?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(1) adminPct?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(1) riskPct?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(1) profitPct?: number;
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() endDate?: string;
}

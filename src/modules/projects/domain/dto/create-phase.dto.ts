import { IsString, IsOptional, IsNumber, Min, Max, IsDateString } from 'class-validator';

export class CreatePhaseDto {
  @IsString() name: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsNumber() @Min(0) order?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(100) plannedPct?: number;
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() endDate?: string;
}

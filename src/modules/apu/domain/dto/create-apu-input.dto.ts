import { IsString, IsEnum, IsNumber, Min, IsOptional } from 'class-validator';
import { ApuInputType } from '@prisma/client';

export class CreateApuInputDto {
  @IsEnum(ApuInputType) type: ApuInputType;
  @IsString() description: string;
  @IsOptional() @IsString() unit?: string;
  @IsNumber() @Min(0) quantity: number;
  @IsNumber() @Min(0) unitCost: number;
}

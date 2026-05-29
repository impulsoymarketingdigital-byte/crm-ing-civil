import { IsString, IsNotEmpty, IsUUID, IsDateString, IsArray, ValidateNested, IsNumber, Min, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class JournalLineDto {
  @IsUUID() accountId: string;
  @IsOptional() @IsString() description?: string;
  @IsNumber({ maxDecimalPlaces: 4 }) @Min(0) debit: number;
  @IsNumber({ maxDecimalPlaces: 4 }) @Min(0) credit: number;
}

export class CreateJournalEntryDto {
  @IsUUID() tenantId: string;
  @IsString() @IsNotEmpty() reference: string;
  @IsOptional() @IsString() description?: string;
  @IsDateString() date: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => JournalLineDto) lines: JournalLineDto[];
}

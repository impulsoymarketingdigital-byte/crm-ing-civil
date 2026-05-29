import {
  ArrayMinSize,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class LedgerLineDto {
  @IsUUID()
  accountId: string;

  @IsOptional()
  @IsString()
  description?: string;

  /** Must be >= 0. Exactly one of debit / credit should be non-zero per line. */
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  debit: number;

  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  credit: number;
}

export class CreateLedgerEntryDto {
  /** Unique human-readable reference (e.g. "JE-2024-0001") */
  @IsString()
  @IsNotEmpty()
  reference: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDateString()
  date: string;

  @IsOptional()
  @IsUUID()
  createdBy?: string;

  /**
   * Minimum 2 lines required to form a valid double-entry.
   * The service will enforce Σ debit === Σ credit via Decimal arithmetic.
   */
  @ValidateNested({ each: true })
  @Type(() => LedgerLineDto)
  @ArrayMinSize(2)
  lines: LedgerLineDto[];
}

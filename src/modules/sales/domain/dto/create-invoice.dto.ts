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

export class CreateInvoiceLineDto {
  /** Link to a physical inventory item (optional — service lines have no SKU) */
  @IsOptional() @IsUUID() inventoryItemId?: string;

  @IsString() @IsNotEmpty() description: string;

  @IsNumber({ maxDecimalPlaces: 4 }) @Min(0.0001) quantity: number;

  @IsNumber({ maxDecimalPlaces: 4 }) @Min(0) unitPrice: number;
}

export class CreateInvoiceDto {
  @IsUUID() customerId: string;

  /** Human-readable invoice number, e.g. "FAC-2024-001" */
  @IsString() @IsNotEmpty() number: string;

  @IsOptional() @IsDateString() dueDate?: string;

  /**
   * Tax rate as a decimal fraction — e.g. 0.19 for 19%.
   * Defaults to 0 (no tax).
   */
  @IsOptional() @IsNumber({ maxDecimalPlaces: 6 }) @Min(0) @Max(1) taxRate?: number;

  @IsOptional() @IsString() notes?: string;

  @ValidateNested({ each: true })
  @Type(() => CreateInvoiceLineDto)
  @ArrayMinSize(1)
  lines: CreateInvoiceLineDto[];
}

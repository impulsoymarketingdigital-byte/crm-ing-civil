import { IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class StockEntryDto {
  /** Units received */
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.0001)
  quantity: number;

  /** Purchase price per unit — used to recalculate the Weighted Average Cost */
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  unitCost: number;

  @IsOptional() @IsString() reference?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsUUID()   createdBy?: string;
}

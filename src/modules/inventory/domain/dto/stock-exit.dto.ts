import { IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class StockExitDto {
  /** Units dispatched */
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.0001)
  quantity: number;

  @IsOptional() @IsString() reference?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsUUID()   createdBy?: string;
}

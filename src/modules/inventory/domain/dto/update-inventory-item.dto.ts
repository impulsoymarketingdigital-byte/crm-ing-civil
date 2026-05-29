import { IsBoolean, IsNumber, IsOptional, IsString, Min } from 'class-validator';

/** PATCH — all fields optional, costPrice and quantityOnHand managed by stock transactions */
export class UpdateInventoryItemDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() unitOfMeasure?: string;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 4 }) @Min(0) sellingPrice?: number;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 4 }) @Min(0) reorderPoint?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

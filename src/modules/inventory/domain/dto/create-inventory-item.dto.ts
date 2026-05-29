import { IsString, IsNotEmpty, IsUUID, IsEnum, IsOptional, IsNumber, Min } from 'class-validator';
import { InventoryItemType } from '@prisma/client';

export class CreateInventoryItemDto {
  @IsUUID() tenantId: string;
  @IsString() @IsNotEmpty() sku: string;
  @IsString() @IsNotEmpty() name: string;
  @IsOptional() @IsString() description?: string;
  @IsEnum(InventoryItemType) type: InventoryItemType;
  @IsOptional() @IsString() unitOfMeasure?: string;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 4 }) @Min(0) costPrice?: number;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 4 }) @Min(0) sellingPrice?: number;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 4 }) @Min(0) reorderPoint?: number;
}

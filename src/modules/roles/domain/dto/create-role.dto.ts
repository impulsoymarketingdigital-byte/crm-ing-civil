import { IsString, IsNotEmpty, IsUUID, IsArray, IsOptional } from 'class-validator';

export class CreateRoleDto {
  @IsUUID() tenantId: string;
  @IsString() @IsNotEmpty() name: string;
  @IsOptional() @IsArray() permissions?: string[];
}

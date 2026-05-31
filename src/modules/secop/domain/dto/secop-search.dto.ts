import { IsString, IsOptional, IsInt, Min, Max } from 'class-validator';

export class SecopSearchDto {
  @IsString() keyword: string;
  @IsOptional() @IsInt() @Min(1) @Max(100) page?: number;
  @IsOptional() @IsInt() @Min(1) @Max(50) limit?: number;
  /** Filter by entity name */
  @IsOptional() @IsString() entity?: string;
  /** Filter: CONVOCADO, ADJUDICADO, CELEBRADO, LIQUIDADO, etc. */
  @IsOptional() @IsString() status?: string;
}

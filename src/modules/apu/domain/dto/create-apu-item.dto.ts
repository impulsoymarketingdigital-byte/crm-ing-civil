import { IsString, IsOptional, IsNumber, Min } from 'class-validator';

export class CreateApuItemDto {
  @IsString() chapterId: string;
  @IsString() code: string;
  @IsString() name: string;
  @IsOptional() @IsString() unit?: string;
  /** Factor prestacional sobre mano de obra. Default 1.6 (Colombia) */
  @IsOptional() @IsNumber() @Min(1) laborFactor?: number;
}

import { IsString, IsOptional, IsInt, Min } from 'class-validator';

export class CreateBudgetChapterDto {
  @IsString() code: string;
  @IsString() name: string;
  @IsOptional() @IsInt() @Min(0) order?: number;
}

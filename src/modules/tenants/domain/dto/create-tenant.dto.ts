import { IsString, IsNotEmpty, Matches, MinLength } from 'class-validator';

export class CreateTenantDto {
  @IsString() @IsNotEmpty() name: string;

  @IsString()
  @Matches(/^[a-z0-9-]+$/, { message: 'slug must be lowercase alphanumeric with hyphens' })
  @MinLength(3)
  slug: string;

  @IsString() plan?: string;
}

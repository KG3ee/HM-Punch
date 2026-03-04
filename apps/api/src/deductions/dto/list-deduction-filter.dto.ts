import { DeductionCategory } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class ListDeductionFilterDto {
  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;

  @IsOptional()
  @IsString()
  periodMonth?: string;

  @IsOptional()
  @IsString()
  teamId?: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsEnum(DeductionCategory)
  category?: DeductionCategory;
}

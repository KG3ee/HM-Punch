import { ViolationSource, ViolationStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class ListViolationsDto {
  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;

  @IsOptional()
  @IsEnum(ViolationStatus)
  status?: ViolationStatus;

  @IsOptional()
  @IsEnum(ViolationSource)
  source?: ViolationSource;

  @IsOptional()
  @IsString()
  accusedUserId?: string;

  @IsOptional()
  @IsString()
  limit?: string;

  @IsOptional()
  @IsString()
  offset?: string;
}

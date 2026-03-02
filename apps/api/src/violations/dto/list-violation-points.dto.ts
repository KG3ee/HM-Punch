import { ViolationLedgerReason, ViolationLedgerType } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class ListViolationPointsDto {
  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsEnum(ViolationLedgerType)
  type?: ViolationLedgerType;

  @IsOptional()
  @IsEnum(ViolationLedgerReason)
  reason?: ViolationLedgerReason;

  @IsOptional()
  @IsString()
  limit?: string;

  @IsOptional()
  @IsString()
  offset?: string;
}

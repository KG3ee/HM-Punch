import { ViolationReason } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateObservedViolationDto {
  @IsString()
  accusedUserId!: string;

  @IsEnum(ViolationReason)
  reason!: ViolationReason;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;

  @IsOptional()
  @IsString()
  occurredAt?: string;
}

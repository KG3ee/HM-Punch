import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export enum FinalizeViolationDecision {
  CONFIRMED = 'CONFIRMED',
  REJECTED = 'REJECTED',
}

export class FinalizeViolationDto {
  @IsEnum(FinalizeViolationDecision)
  decision!: FinalizeViolationDecision;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10000)
  accusedDeductionPoints?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10000)
  reporterRewardPoints?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10000)
  collectiveDeductionPoints?: number;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;
}

import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export enum LeaderTriageDecision {
  LEADER_VALID = 'LEADER_VALID',
  LEADER_INVALID = 'LEADER_INVALID',
}

export class TriageViolationDto {
  @IsEnum(LeaderTriageDecision)
  decision!: LeaderTriageDecision;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;
}

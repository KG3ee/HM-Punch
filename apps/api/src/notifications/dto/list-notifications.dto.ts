import { IsOptional, IsString } from 'class-validator';

export class ListNotificationsDto {
  @IsOptional()
  @IsString()
  limit?: string;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @IsString()
  unreadOnly?: string;
}

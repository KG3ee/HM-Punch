import { IsOptional, IsString } from 'class-validator';
import { ListDeductionFilterDto } from './list-deduction-filter.dto';

export class ListDeductionEntriesDto extends ListDeductionFilterDto {
  @IsOptional()
  @IsString()
  limit?: string;

  @IsOptional()
  @IsString()
  offset?: string;
}

import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateStrategyVersionDtoBody {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;
}

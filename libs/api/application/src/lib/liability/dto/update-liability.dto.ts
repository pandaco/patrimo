import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';
import { LIABILITY_KINDS, LiabilityKindDto } from '@patrimo/contracts';

export class UpdateLiabilityDtoBody {
  @IsOptional()
  @IsString()
  @Length(1, 128)
  label?: string;

  @IsOptional()
  @IsIn(LIABILITY_KINDS)
  kind?: LiabilityKindDto;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  initialAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  currentBalance?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  ratePct?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  monthlyPayment?: number;

  @IsOptional()
  @IsDateString({ strict: true })
  startDate?: string;

  @IsOptional()
  @IsDateString({ strict: true })
  endDate?: string | null;
}

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

export class CreateLiabilityDtoBody {
  @IsString()
  @Length(1, 128)
  label!: string;

  @IsIn(LIABILITY_KINDS)
  kind!: LiabilityKindDto;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  initialAmount!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  currentBalance!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  ratePct!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  monthlyPayment!: number;

  /** ISO date YYYY-MM-DD. */
  @IsDateString({ strict: true })
  startDate!: string;

  @IsOptional()
  @IsDateString({ strict: true })
  endDate?: string | null;
}

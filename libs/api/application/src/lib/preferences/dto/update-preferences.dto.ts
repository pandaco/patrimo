import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';

export class UpdatePreferencesDtoBody {
  @IsOptional()
  @IsString()
  @Length(1, 64)
  riskProfile?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  horizonYears?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  monthlyTarget?: number;

  @IsOptional()
  @IsString()
  @IsIn(['EUR', 'USD', 'GBP', 'CHF'])
  displayCurrency?: string;

  @IsOptional()
  @IsString()
  @IsIn(['simple', 'expert'])
  uiMode?: 'simple' | 'expert';

  @IsOptional()
  @IsBoolean()
  onboardingDone?: boolean;

  @IsOptional()
  @IsString()
  @Length(12, 12)
  benchmarkIsin?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(20)
  livretRatePct?: number;

  // The shape of `allocationTargets` is enforced at the service / domain
  // boundary; class-validator only confirms the field is a plain object so
  // a malformed string / array / scalar is rejected at the controller.
  @IsOptional()
  @IsObject()
  allocationTargets?: Record<string, unknown> | null;
}

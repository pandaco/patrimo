import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';
import { ENVELOPE_GLYPHS } from '@patrimo/contracts';

export class UpdateEnvelopeDtoBody {
  @IsOptional()
  @IsString()
  @Length(1, 32)
  code?: string;

  @IsOptional()
  @IsIn(ENVELOPE_GLYPHS)
  glyph?: string;

  @IsOptional()
  @IsString()
  @Length(1, 64)
  label?: string;

  @IsOptional()
  @IsString()
  @Length(1, 128)
  broker?: string;

  @IsOptional()
  @IsDateString({ strict: true })
  openedAt?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  plafond?: number | null;
}

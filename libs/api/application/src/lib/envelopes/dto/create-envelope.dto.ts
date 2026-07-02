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

export class CreateEnvelopeDtoBody {
  @IsString()
  @Length(1, 32)
  code!: string;

  @IsIn(ENVELOPE_GLYPHS)
  glyph!: string;

  @IsString()
  @Length(1, 64)
  label!: string;

  @IsString()
  @Length(1, 128)
  broker!: string;

  /** ISO date YYYY-MM-DD. */
  @IsDateString({ strict: true })
  openedAt!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  plafond?: number | null;
}

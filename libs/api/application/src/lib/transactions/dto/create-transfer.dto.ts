import { Type } from 'class-transformer';
import { IsDateString, IsNumber, IsUUID, Min } from 'class-validator';

export class CreateTransferDtoBody {
  @IsUUID()
  fromEnvelopeId!: string;

  @IsUUID()
  toEnvelopeId!: string;

  /** ISO date YYYY-MM-DD. */
  @IsDateString({ strict: true })
  date!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount!: number;
}

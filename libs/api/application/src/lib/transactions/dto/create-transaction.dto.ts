import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateIf,
} from 'class-validator';
import { TransactionTypeDto } from '@patrimo/contracts';

const TRANSACTION_TYPES: TransactionTypeDto[] = ['BUY', 'SELL', 'DEPOSIT', 'WITHDRAWAL', 'DIVIDEND', 'INTEREST'];
const ETF_TRANSACTION_TYPES: TransactionTypeDto[] = ['BUY', 'SELL'];

export class CreateTransactionDtoBody {
  @IsUUID()
  envelopeId!: string;

  // A BUY/SELL without an ISIN can't be replayed into a position — it would
  // silently show up as an untracked position elsewhere (see the CTO/orphan
  // SELL that surfaced this: an envelope with no live holding kept displaying
  // a stale stored value instead of falling through to the derived zero).
  @ValidateIf(o => ETF_TRANSACTION_TYPES.includes(o.type))
  @IsString()
  @IsNotEmpty()
  etfIsin?: string | null;

  @IsIn(TRANSACTION_TYPES)
  type!: TransactionTypeDto;

  /** ISO date YYYY-MM-DD. */
  @IsDateString({ strict: true })
  date!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  quantity!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  price?: number | null;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  fees!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  taxes?: number;

  @Type(() => Number)
  @IsNumber()
  amount!: number;
}

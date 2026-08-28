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

export class UpdateTransactionDtoBody {
  @IsOptional()
  @IsUUID()
  envelopeId?: string;

  // Only enforced when `type` is part of the same patch — a patch that
  // retypes to BUY/SELL must carry an ISIN with it. A patch that omits
  // `type` leaves the stored value (and its existing etfIsin) untouched, so
  // there's nothing to cross-validate against here.
  @ValidateIf(o => ETF_TRANSACTION_TYPES.includes(o.type))
  @IsString()
  @IsNotEmpty()
  etfIsin?: string | null;

  @IsOptional()
  @IsIn(TRANSACTION_TYPES)
  type?: TransactionTypeDto;

  @IsOptional()
  @IsDateString({ strict: true })
  date?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  quantity?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  price?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  fees?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  taxes?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  amount?: number;
}

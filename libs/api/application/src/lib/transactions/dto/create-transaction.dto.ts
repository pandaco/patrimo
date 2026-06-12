import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { TransactionTypeDto } from '@patrimo/contracts';

const TRANSACTION_TYPES: TransactionTypeDto[] = ['BUY', 'SELL', 'DEPOSIT', 'WITHDRAWAL', 'DIVIDEND', 'INTEREST'];

export class CreateTransactionDtoBody {
  @IsUUID()
  envelopeId!: string;

  @IsOptional()
  @IsString()
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

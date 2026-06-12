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

export class UpdateTransactionDtoBody {
  @IsOptional()
  @IsUUID()
  envelopeId?: string;

  @IsOptional()
  @IsString()
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
  amount?: number;
}

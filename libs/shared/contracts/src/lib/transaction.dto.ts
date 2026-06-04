export type TxTypeDto = 'BUY' | 'SELL' | 'DEPOSIT' | 'WITHDRAWAL' | 'DIVIDEND' | 'INTEREST';

export interface TransactionDto {
  id: string;
  envelopeId: string;
  etfIsin: string | null;
  type: TxTypeDto;
  /** ISO date (YYYY-MM-DD). */
  date: string;
  quantity: number;
  price: number | null;
  fees: number;
  amount: number;
}

export interface CreateTransactionDto {
  envelopeId: string;
  etfIsin?: string | null;
  type: TxTypeDto;
  /** ISO date (YYYY-MM-DD). */
  date: string;
  quantity: number;
  price?: number | null;
  fees: number;
  amount: number;
}

export type UpdateTransactionDto = Partial<CreateTransactionDto>;

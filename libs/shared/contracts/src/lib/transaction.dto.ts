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
  /** Taxes withheld (PFU, social levies) — separate from broker fees. */
  taxes: number;
  amount: number;
  /** Set on both legs of an inter-envelope transfer; null otherwise. */
  transferId: string | null;
}

export interface CreateTransferDto {
  fromEnvelopeId: string;
  toEnvelopeId: string;
  /** ISO date (YYYY-MM-DD). */
  date: string;
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
  /** Taxes withheld — defaults to 0 when omitted. */
  taxes?: number;
  amount: number;
}

export type UpdateTransactionDto = Partial<CreateTransactionDto>;

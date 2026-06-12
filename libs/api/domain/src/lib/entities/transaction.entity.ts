import { TransactionType } from '../value-objects/tx-type';

export interface Transaction {
  id: string;
  userId: string;
  envelopeId: string;
  etfIsin: string | null;
  type: TransactionType;
  date: Date;
  quantity: number;
  price: number | null;
  fees: number;
  /** Taxes withheld (PFU, social levies) — separate from broker fees. */
  taxes: number;
  amount: number;
  /** Set on both legs of an inter-envelope transfer; null otherwise. */
  transferId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type TransactionSeed = Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>;

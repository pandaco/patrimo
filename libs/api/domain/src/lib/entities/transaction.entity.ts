import { TxType } from '../value-objects/tx-type';

export interface Transaction {
  id: string;
  userId: string;
  envelopeId: string;
  etfIsin: string | null;
  type: TxType;
  date: Date;
  quantity: number;
  price: number | null;
  fees: number;
  amount: number;
  createdAt: Date;
  updatedAt: Date;
}

export type TransactionSeed = Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>;

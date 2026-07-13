export type TransactionType = 'BUY' | 'SELL' | 'DEPOSIT' | 'WITHDRAWAL' | 'DIVIDEND' | 'INTEREST';

export const TRANSACTION_TYPES: readonly TransactionType[] = [
  'BUY',
  'SELL',
  'DEPOSIT',
  'WITHDRAWAL',
  'DIVIDEND',
  'INTEREST',
] as const;

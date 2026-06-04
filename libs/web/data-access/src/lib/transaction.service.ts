import { Injectable, signal } from '@angular/core';
import { Transaction, TxLabel, TxType } from './models';
import { MOCK_TRANSACTIONS, TX_LABELS } from './mock-data';

@Injectable({ providedIn: 'root' })
export class TransactionService {
  readonly all    = signal<Transaction[]>(MOCK_TRANSACTIONS);
  readonly labels: Record<TxType, TxLabel> = TX_LABELS;
}

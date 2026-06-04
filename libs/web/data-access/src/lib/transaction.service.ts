import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { TransactionDto } from 'contracts';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from './api-base-url';
import { TX_LABELS } from './mock-data';
import { Transaction, TxLabel, TxType } from './models';

function fromDto(d: TransactionDto): Transaction {
  return {
    id: d.id,
    date: d.date,
    type: d.type as TxType,
    envelope: d.envelopeId,
    etf: d.etfIsin,
    qty: d.quantity,
    price: d.price,
    fees: d.fees,
    amount: d.amount,
  };
}

@Injectable({ providedIn: 'root' })
export class TransactionService {
  private readonly http    = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  private readonly _all = signal<Transaction[]>([]);
  readonly all = this._all.asReadonly();
  readonly labels: Record<TxType, TxLabel> = TX_LABELS;

  async reload(): Promise<void> {
    const list = await firstValueFrom(
      this.http.get<TransactionDto[]>(`${this.baseUrl}/transactions`, { withCredentials: true }),
    );
    this._all.set(list.map(fromDto));
  }
}

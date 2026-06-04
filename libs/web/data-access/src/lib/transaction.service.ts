import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { CreateTransactionDto, TransactionDto, UpdateTransactionDto } from 'contracts';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from './api-base-url';
import { EtfService } from './etf.service';
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
  private readonly etfs    = inject(EtfService);

  private readonly _all = signal<Transaction[]>([]);
  readonly all = this._all.asReadonly();
  readonly labels: Record<TxType, TxLabel> = TX_LABELS;

  /**
   * Fire-and-forget refresh of the ETF / position signal. Every mutation
   * to a transaction can change the user's qty, PRU and current valuation,
   * so the dashboard's portfolio cards need to follow. We deliberately do
   * not `await` it — the local signal update is instant, and a slow Yahoo
   * round-trip should not block the dialog from closing.
   */
  private refreshPositions(): void {
    this.etfs.reload().catch(() => undefined);
  }

  async reload(): Promise<void> {
    const list = await firstValueFrom(
      this.http.get<TransactionDto[]>(`${this.baseUrl}/transactions`, { withCredentials: true }),
    );
    this._all.set(list.map(fromDto));
  }

  async create(input: CreateTransactionDto): Promise<Transaction> {
    const dto = await firstValueFrom(
      this.http.post<TransactionDto>(`${this.baseUrl}/transactions`, input, {
        withCredentials: true,
      }),
    );
    const tx = fromDto(dto);
    this._all.update(list => [tx, ...list]);
    this.refreshPositions();
    return tx;
  }

  async update(id: string, input: UpdateTransactionDto): Promise<Transaction> {
    const dto = await firstValueFrom(
      this.http.patch<TransactionDto>(`${this.baseUrl}/transactions/${id}`, input, {
        withCredentials: true,
      }),
    );
    const tx = fromDto(dto);
    this._all.update(list => list.map(x => x.id === id ? tx : x));
    this.refreshPositions();
    return tx;
  }

  async remove(id: string): Promise<void> {
    await firstValueFrom(
      this.http.delete<void>(`${this.baseUrl}/transactions/${id}`, { withCredentials: true }),
    );
    this._all.update(list => list.filter(x => x.id !== id));
    this.refreshPositions();
  }
}

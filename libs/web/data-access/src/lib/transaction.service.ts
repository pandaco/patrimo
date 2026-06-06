import { HttpClient, httpResource } from '@angular/common/http';
import { Injectable, computed, inject } from '@angular/core';
import { CreateTransactionDto, TransactionDto, UpdateTransactionDto } from '@patrimo/contracts';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from './api-base-url';
import { AuthService } from './auth.service';
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
  private readonly auth    = inject(AuthService);
  private readonly etfs    = inject(EtfService);

  private readonly resource = httpResource<TransactionDto[]>(
    () => (this.auth.isAuthenticated() ? `${this.baseUrl}/transactions` : undefined),
    { defaultValue: [] },
  );

  readonly all     = computed(() => this.resource.value().map(fromDto));
  readonly loading = this.resource.isLoading;
  readonly error   = this.resource.error;
  readonly labels: Record<TxType, TxLabel> = TX_LABELS;

  reload(): void { this.resource.reload(); }

  /**
   * Fire-and-forget refresh of the ETF / position signal. Every mutation
   * to a transaction can change the user's qty, PRU and current valuation,
   * so the dashboard's portfolio cards need to follow. The local resource
   * update is instant, and a slow Yahoo round-trip should not block the
   * dialog from closing.
   */
  private refreshPositions(): void {
    this.etfs.reload();
  }

  async create(input: CreateTransactionDto): Promise<Transaction> {
    const dto = await firstValueFrom(
      this.http.post<TransactionDto>(`${this.baseUrl}/transactions`, input),
    );
    this.resource.update(list => [dto, ...list]);
    this.refreshPositions();
    return fromDto(dto);
  }

  async update(id: string, input: UpdateTransactionDto): Promise<Transaction> {
    const dto = await firstValueFrom(
      this.http.patch<TransactionDto>(`${this.baseUrl}/transactions/${id}`, input),
    );
    this.resource.update(list => list.map(x => (x.id === id ? dto : x)));
    this.refreshPositions();
    return fromDto(dto);
  }

  async remove(id: string): Promise<void> {
    await firstValueFrom(this.http.delete<void>(`${this.baseUrl}/transactions/${id}`));
    this.resource.update(list => list.filter(x => x.id !== id));
    this.refreshPositions();
  }

  async importCsv(file: File): Promise<{ count: number; skipped: number }> {
    const formData = new FormData();
    formData.append('file', file);
    const result = await firstValueFrom(
      this.http.post<{ count: number; skipped: number }>(`${this.baseUrl}/transactions/import`, formData),
    );
    this.reload();
    this.refreshPositions();
    return result;
  }
}

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { API_BASE_URL, EnvelopeService, EtfService, TauxChangeService, ToastService, Transaction, TransactionService, TransactionType } from '@patrimo/data-access';
import { EnvGlyphComponent, fmtDate, fmtNum, TipDirective, TransactionDialogComponent } from '@patrimo/ui';
import { firstValueFrom } from 'rxjs';

type FilterType = TransactionType | 'ALL';

const FILTER_OPTIONS: { id: FilterType; label: string }[] = [
  { id: 'ALL',        label: 'Toutes' },
  { id: 'BUY',        label: 'Achats' },
  { id: 'SELL',       label: 'Ventes' },
  { id: 'DEPOSIT',    label: 'Dépôts' },
  { id: 'WITHDRAWAL', label: 'Retraits' },
  { id: 'DIVIDEND',   label: 'Dividendes' },
  { id: 'INTEREST',   label: 'Intérêts' },
];

export interface TxGroup {
  month: string;
  label: string;
  total: number;
  transactions: Transaction[];
}

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [EnvGlyphComponent, TipDirective],
  templateUrl: './transactions.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransactionsComponent {
  protected readonly transactionService  = inject(TransactionService);
  private readonly envelopeService  = inject(EnvelopeService);
  private readonly etfService  = inject(EtfService);
  private readonly dialog  = inject(MatDialog);
  private readonly http    = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  protected readonly filters   = FILTER_OPTIONS;
  protected readonly activeFilter = signal<FilterType>('ALL');
  protected readonly envelopeFilter = signal('');
  protected readonly etfFilter      = signal('');
  protected readonly searchQuery    = signal('');

  protected readonly loading   = this.transactionService.loading;
  protected readonly envelopes = this.envelopeService.all;
  protected readonly etfs      = this.etfService.all;
  protected readonly labels    = this.transactionService.labels;

  protected readonly totalCount = computed(() => this.transactionService.all().length);

  // Seuls les ETFs réellement présents dans le journal sont proposés en filtre.
  protected readonly tradedEtfs = computed(() => {
    const isins = new Set(this.transactionService.all().map(t => t.etf).filter(Boolean));
    return this.etfs().filter(e => isins.has(e.isin));
  });

  protected readonly filtered = computed<Transaction[]>(() => {
    const type  = this.activeFilter();
    const envId = this.envelopeFilter();
    const isin  = this.etfFilter();
    const query = this.searchQuery().trim().toLowerCase();
    return this.transactionService.all().filter(transaction => {
      if (type !== 'ALL' && transaction.type !== type) return false;
      if (envId && transaction.envelope !== envId) return false;
      if (isin && transaction.etf !== isin) return false;
      if (query) {
        const etf = this.getEtf(transaction.etf);
        const env = this.getEnv(transaction.envelope);
        const haystack = [
          etf?.ticker, etf?.name, etf?.isin,
          env?.label, env?.code, env?.broker,
          this.labels[transaction.type].label, transaction.date,
        ].filter(Boolean).join(' ').toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  });

  protected readonly filteredCount = computed(() => this.filtered().length);
  protected readonly hasActiveFilters = computed(() =>
    this.activeFilter() !== 'ALL' || !!this.envelopeFilter() || !!this.etfFilter() || !!this.searchQuery().trim(),
  );

  protected resetFilters(): void {
    this.activeFilter.set('ALL');
    this.envelopeFilter.set('');
    this.etfFilter.set('');
    this.searchQuery.set('');
  }

  protected readonly groups = computed<TxGroup[]>(() => {
    const lbls = this.labels;
    const filtered = this.filtered();

    const map = new Map<string, Transaction[]>();
    for (const transaction of filtered) {
      const key = transaction.date.slice(0, 7);
      let bucket = map.get(key);
      if (!bucket) { bucket = []; map.set(key, bucket); }
      bucket.push(transaction);
    }

    return Array.from(map.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([month, transactions]) => {
        const d = new Date(month + '-01');
        const label = d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
        const sorted = [...transactions].sort((a, b) => b.date.localeCompare(a.date));
        const total = sorted.reduce((a, t) => a + (lbls[t.type].dir === '+' ? 1 : -1) * t.amount, 0);
        return { month, label, total, transactions: sorted };
      });
  });

  protected readonly displayCount = signal(30);

  protected readonly importing = signal(false);
  private readonly toasts = inject(ToastService);

  protected readonly pagedGroups = computed<TxGroup[]>(() => {
    let remaining = this.displayCount();
    const result: TxGroup[] = [];
    for (const g of this.groups()) {
      if (remaining <= 0) break;
      if (g.transactions.length <= remaining) {
        result.push(g);
        remaining -= g.transactions.length;
      } else {
        result.push({ ...g, transactions: g.transactions.slice(0, remaining) });
        remaining = 0;
      }
    }
    return result;
  });

  protected readonly hasMore = computed(() =>
    this.groups().reduce((a, g) => a + g.transactions.length, 0) > this.displayCount(),
  );

  protected loadMore(): void { this.displayCount.update(c => c + 30); }

  // Cash coherence details
  protected readonly showCashDetails = signal(false);

  protected readonly cashDetails = computed(() => {
    const envMap = new Map<string, { dep: number; wit: number; buy: number; sel: number; div: number }>();
    for (const transaction of this.transactionService.all()) {
      const e = envMap.get(transaction.envelope) ?? { dep: 0, wit: 0, buy: 0, sel: 0, div: 0 };
      if (transaction.type === 'DEPOSIT')    e.dep += transaction.amount;
      if (transaction.type === 'WITHDRAWAL') e.wit += transaction.amount;
      if (transaction.type === 'BUY')        e.buy += transaction.amount;
      if (transaction.type === 'SELL')       e.sel += transaction.amount;
      if (transaction.type === 'DIVIDEND' || transaction.type === 'INTEREST') e.div += transaction.amount;
      envMap.set(transaction.envelope, e);
    }
    return Array.from(envMap.entries()).map(([envId, f]) => ({
      envId,
      deposits:     f.dep,
      withdrawals:  f.wit,
      buys:         f.buy,
      sells:        f.sel,
      dividends:    f.div,
      cashBalance:  f.dep - f.wit - f.buy + f.sel + f.div,
    })).sort((a, b) => Math.abs(b.cashBalance) - Math.abs(a.cashBalance));
  });

  private readonly tauxChangeService = inject(TauxChangeService);
  // TAUXCHANGE-aware: converts EUR-base amounts into the display currency.
  protected readonly fmtEur = (n: number, d = 2): string => this.tauxChangeService.fmt(n, d);
  protected readonly fmtNum  = fmtNum;
  protected readonly fmtDate = fmtDate;
  protected readonly abs     = Math.abs;

  protected getEnv(id: string) {
    return this.envelopes().find(e => e.id === id);
  }

  protected getEtf(isin: string | null) {
    return isin ? this.etfs().find(e => e.isin === isin) : null;
  }

  protected typeSymBg(type: TransactionType): string {
    return ['BUY','SELL'].includes(type) ? 'var(--ink)'
      : this.labels[type].dir === '+' ? 'var(--gain)' : 'var(--loss)';
  }

  protected async openNewTx(): Promise<void> {
    this.dialog.open(TransactionDialogComponent, {
      panelClass: 'transaction-dialog-panel',
      maxWidth: '580px',
      width: '100%',
    });
  }

  protected async openDuplicateTx(transaction: Transaction): Promise<void> {
    this.dialog.open(TransactionDialogComponent, {
      data: { duplicateFrom: transaction },
      panelClass: 'transaction-dialog-panel',
      maxWidth: '580px',
      width: '100%',
    });
  }

  protected async openEditTx(transaction: Transaction): Promise<void> {
    this.dialog.open(TransactionDialogComponent, {
      data: { transaction: transaction },
      panelClass: 'transaction-dialog-panel',
      maxWidth: '580px',
      width: '100%',
    });
  }

  protected async deleteTx(transaction: Transaction): Promise<void> {
    const env  = this.getEnv(transaction.envelope);
    const typeLabel  = this.labels[transaction.type].label;
    const date = fmtDate(transaction.date);
    const target = env ? `${typeLabel} sur ${env.code} du ${date}` : `${typeLabel} du ${date}`;
    if (!confirm(`Supprimer l'opération « ${target} » ?`)) return;
    try {
      await this.transactionService.remove(transaction.id);
    } catch (err) {
      this.toasts.error(err instanceof Error ? err.message : 'Suppression impossible');
    }
  }

  protected async exportCsv(): Promise<void> {
    const blob = await firstValueFrom(
      this.http.get(`${this.baseUrl}/transactions/export`, { responseType: 'blob' }),
    );
    const url = URL.createObjectURL(blob);
    const a   = document.createElement('a');
    a.href = url; a.download = 'transactions.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  protected async importFile(event: Event): Promise<void> {
    const el   = event.target as HTMLInputElement;
    const file = el.files?.[0];
    if (!file || this.importing()) return;

    this.importing.set(true);
    try {
      const { count, skipped } = await this.transactionService.importCsv(file);
      const skipNote = skipped > 0 ? ` (${skipped} ligne${skipped > 1 ? 's' : ''} ignorée${skipped > 1 ? 's' : ''})` : '';
      this.toasts.success(`${count} transactions importées${skipNote}.`);
    } catch (err) {
      console.error('Import failed', err);
      this.toasts.error('Erreur lors de l\'import CSV. Vérifie le format.');
    } finally {
      this.importing.set(false);
      el.value = '';
    }
  }
}

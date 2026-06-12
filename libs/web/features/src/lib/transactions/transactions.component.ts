import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { API_BASE_URL, EnvelopeService, EtfService, FxService, ToastService, Transaction, TransactionService, TxType } from '@patrimo/data-access';
import { EnvGlyphComponent, fmtDate, fmtNum, TransactionDialogComponent } from '@patrimo/ui';
import { firstValueFrom } from 'rxjs';

type FilterType = TxType | 'ALL';

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
  txs: Transaction[];
}

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [EnvGlyphComponent],
  templateUrl: './transactions.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransactionsComponent {
  protected readonly txSvc  = inject(TransactionService);
  private readonly envSvc  = inject(EnvelopeService);
  private readonly etfSvc  = inject(EtfService);
  private readonly dialog  = inject(MatDialog);
  private readonly http    = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  protected readonly filters   = FILTER_OPTIONS;
  protected readonly activeFilter = signal<FilterType>('ALL');

  protected readonly loading   = this.txSvc.loading;
  protected readonly envelopes = this.envSvc.all;
  protected readonly etfs      = this.etfSvc.all;
  protected readonly labels    = this.txSvc.labels;

  protected readonly totalCount = computed(() => this.txSvc.all().length);
  protected readonly txCount    = computed(() => {
    const f = this.activeFilter();
    const all = this.txSvc.all();
    return f === 'ALL' ? all.length : all.filter(t => t.type === f).length;
  });

  protected readonly groups = computed<TxGroup[]>(() => {
    const f    = this.activeFilter();
    const all  = this.txSvc.all();
    const lbls = this.labels;
    const filtered = f === 'ALL' ? all : all.filter(t => t.type === f);

    const map = new Map<string, Transaction[]>();
    for (const tx of filtered) {
      const key = tx.date.slice(0, 7);
      let bucket = map.get(key);
      if (!bucket) { bucket = []; map.set(key, bucket); }
      bucket.push(tx);
    }

    return Array.from(map.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([month, txs]) => {
        const d = new Date(month + '-01');
        const label = d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
        const sorted = [...txs].sort((a, b) => b.date.localeCompare(a.date));
        const total = sorted.reduce((a, t) => a + (lbls[t.type].dir === '+' ? 1 : -1) * t.amount, 0);
        return { month, label, total, txs: sorted };
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
      if (g.txs.length <= remaining) {
        result.push(g);
        remaining -= g.txs.length;
      } else {
        result.push({ ...g, txs: g.txs.slice(0, remaining) });
        remaining = 0;
      }
    }
    return result;
  });

  protected readonly hasMore = computed(() =>
    this.groups().reduce((a, g) => a + g.txs.length, 0) > this.displayCount(),
  );

  protected loadMore(): void { this.displayCount.update(c => c + 30); }

  // Cash coherence details
  protected readonly showCashDetails = signal(false);

  protected readonly cashDetails = computed(() => {
    const envMap = new Map<string, { dep: number; wit: number; buy: number; sel: number; div: number }>();
    for (const tx of this.txSvc.all()) {
      const e = envMap.get(tx.envelope) ?? { dep: 0, wit: 0, buy: 0, sel: 0, div: 0 };
      if (tx.type === 'DEPOSIT')    e.dep += tx.amount;
      if (tx.type === 'WITHDRAWAL') e.wit += tx.amount;
      if (tx.type === 'BUY')        e.buy += tx.amount;
      if (tx.type === 'SELL')       e.sel += tx.amount;
      if (tx.type === 'DIVIDEND' || tx.type === 'INTEREST') e.div += tx.amount;
      envMap.set(tx.envelope, e);
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

  private readonly fxSvc = inject(FxService);
  // FX-aware: converts EUR-base amounts into the display currency.
  protected readonly fmtEur = (n: number, d = 2): string => this.fxSvc.fmt(n, d);
  protected readonly fmtNum  = fmtNum;
  protected readonly fmtDate = fmtDate;
  protected readonly abs     = Math.abs;

  protected getEnv(id: string) {
    return this.envelopes().find(e => e.id === id);
  }

  protected getEtf(isin: string | null) {
    return isin ? this.etfs().find(e => e.isin === isin) : null;
  }

  protected typeSymBg(type: TxType): string {
    return ['BUY','SELL'].includes(type) ? 'var(--ink)'
      : this.labels[type].dir === '+' ? 'var(--gain)' : 'var(--loss)';
  }

  protected async openNewTx(): Promise<void> {
    this.dialog.open(TransactionDialogComponent, {
      panelClass: 'tx-dialog-panel',
      maxWidth: '580px',
      width: '100%',
    });
  }

  protected async openEditTx(tx: Transaction): Promise<void> {
    this.dialog.open(TransactionDialogComponent, {
      data: { transaction: tx },
      panelClass: 'tx-dialog-panel',
      maxWidth: '580px',
      width: '100%',
    });
  }

  protected async deleteTx(tx: Transaction): Promise<void> {
    const env  = this.getEnv(tx.envelope);
    const lbl  = this.labels[tx.type].label;
    const date = fmtDate(tx.date);
    const target = env ? `${lbl} sur ${env.code} du ${date}` : `${lbl} du ${date}`;
    if (!confirm(`Supprimer la transaction « ${target} » ?`)) return;
    try {
      await this.txSvc.remove(tx.id);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Suppression impossible');
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
      const { count, skipped } = await this.txSvc.importCsv(file);
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

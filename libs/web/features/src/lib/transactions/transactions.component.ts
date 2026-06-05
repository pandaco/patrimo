import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { EnvelopeService, EtfService, TransactionService, Transaction, TxType } from '@patrimo/data-access';
import { EnvGlyphComponent, fmtDate, fmtEur, fmtNum } from '@patrimo/ui';

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
  private readonly envSvc = inject(EnvelopeService);
  private readonly etfSvc = inject(EtfService);
  private readonly dialog = inject(MatDialog);

  protected readonly filters   = FILTER_OPTIONS;
  protected readonly activeFilter = signal<FilterType>('ALL');

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
      if (!bucket) {
        bucket = [];
        map.set(key, bucket);
      }
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

  protected readonly fmtEur  = fmtEur;
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
    const { TransactionDialogComponent } = await import('../shared/transaction-dialog/transaction-dialog.component');
    this.dialog.open(TransactionDialogComponent, {
      panelClass: 'tx-dialog-panel',
      maxWidth: '580px',
      width: '100%',
    });
  }

  protected async openEditTx(tx: Transaction): Promise<void> {
    const { TransactionDialogComponent } = await import('../shared/transaction-dialog/transaction-dialog.component');
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

  protected async importFile(event: Event): Promise<void> {
    const el   = event.target as HTMLInputElement;
    const file = el.files?.[0];
    if (!file) return;

    try {
      const { count } = await this.txSvc.importCsv(file);
      alert(`${count} transactions importées avec succès.`);
      el.value = '';
    } catch (err) {
      console.error('Import failed', err);
      alert('Erreur lors de l\'import CSV. Vérifiez le format du fichier.');
    }
  }
}

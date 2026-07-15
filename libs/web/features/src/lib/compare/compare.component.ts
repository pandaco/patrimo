import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { EtfDto, EtfMetadataDto } from '@patrimo/contracts';
import { Etf, EtfService, TauxChangeService, PerformanceService, PreferencesService, ToastService } from '@patrimo/data-access';
import { EtfDialogComponent, TipDirective, TransactionDialogComponent, fmtNum, fmtPct, fmtPctRaw } from '@patrimo/ui';

const MAX_SELECTION = 4;

@Component({
  selector: 'app-compare',
  standalone: true,
  imports: [FormsModule, RouterLink, TipDirective],
  templateUrl: './compare.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompareComponent {
  private readonly etfService = inject(EtfService);
  private readonly toast      = inject(ToastService);
  private readonly performanceService = inject(PerformanceService);
  private readonly preferencesService = inject(PreferencesService);
  private readonly tauxChangeService  = inject(TauxChangeService);

  // Qualité de réplication + coût réel des fonds détenus — thématiquement à
  // leur place ici, à côté du comparatif TER du catalogue.
  protected readonly etfStats     = this.performanceService.etfStats;
  protected readonly fees         = this.performanceService.fees;
  protected readonly loadingStats = this.performanceService.loadingStats;
  protected readonly loadingFees  = this.performanceService.loadingFees;

  // Human label of the user-selected benchmark, e.g. "CW8 — Amundi MSCI World".
  protected readonly benchmarkLabel = computed(() => {
    const isin = this.preferencesService.current().benchmarkIsin;
    const etf  = this.etfService.all().find(e => e.isin === isin);
    return etf ? `${etf.ticker} — ${etf.name}` : 'CW8 — MSCI World';
  });

  // TAUXCHANGE-aware: converts EUR-base amounts into the display currency.
  protected readonly fmtEur = (n: number, d = 2): string => this.tauxChangeService.fmt(n, d);
  protected readonly fmtPct = fmtPct;

  private readonly dialog = inject(MatDialog);

  /** ISINs the user has put on the comparator. Capped at `MAX_SELECTION`. */
  protected readonly selectedIsins = signal<string[]>([]);

  protected readonly filterOpen    = signal(false);
  protected readonly filterPea     = signal<'all' | 'yes' | 'no'>('all');
  protected readonly filterDistrib = signal<'all' | 'Capitalisant' | 'Distribuant'>('all');
  protected readonly filterTerMax  = signal<number | null>(null);
  protected readonly filterAlloc   = signal<'all' | 'Core' | 'Satellite' | 'Obligations'>('all');

  protected readonly activeFilterCount = computed(() => {
    let n = 0;
    if (this.filterPea()     !== 'all') n++;
    if (this.filterDistrib() !== 'all') n++;
    if (this.filterTerMax()  !== null)  n++;
    if (this.filterAlloc()   !== 'all') n++;
    return n;
  });

  protected resetFilters(): void {
    this.filterPea.set('all');
    this.filterDistrib.set('all');
    this.filterTerMax.set(null);
    this.filterAlloc.set('all');
  }

  protected readonly catalog = computed(() => {
    const all = this.etfService.all();
    const pea  = this.filterPea();
    const dist = this.filterDistrib();
    const ter  = this.filterTerMax();
    const alloc = this.filterAlloc();
    return all.filter(e => {
      if (pea  === 'yes' && !e.pea)                    return false;
      if (pea  === 'no'  && e.pea)                     return false;
      if (dist !== 'all' && e.distrib !== dist)         return false;
      if (ter  !== null  && e.ter > ter)                return false;
      if (alloc !== 'all' && e.alloc !== alloc)         return false;
      return true;
    });
  });

  protected readonly candidates = computed(() => {
    const selected = new Set(this.selectedIsins());
    return this.etfService.all().filter(e => selected.has(e.isin));
  });

  protected readonly candidatesMetadata = signal<Record<string, EtfMetadataDto>>({});

  protected readonly canAddMore = computed(() => this.selectedIsins().length < MAX_SELECTION);

  private readonly seeded = signal(false);

  constructor() {
    const STORAGE_KEY = 'compare:selected';

    // Fetch dynamic metadata for selected candidates
    effect(() => {
      const isins = this.selectedIsins();
      if (isins.length === 0) return;
      
      const current = untracked(this.candidatesMetadata);
      const missing = isins.filter(i => !current[i]);
      if (missing.length === 0) return;

      Promise.all(missing.map(isin => this.etfService.metadata(isin).then(meta => ({ isin, meta })).catch(() => ({ isin, meta: null }))))
        .then(results => {
          this.candidatesMetadata.update(prev => {
            const next = { ...prev };
            for (const r of results) {
              if (r.meta) next[r.isin] = r.meta;
            }
            return next;
          });
        });
    });

    // Restore persisted selection before the catalog effect runs.
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      try { this.selectedIsins.set(JSON.parse(stored)); } catch { /* ignore */ }
      this.seeded.set(true);
    }

    // Seed with the first 3 catalog entries only on a genuine first visit.
    effect(() => {
      if (!this.seeded() && this.catalog().length > 0) {
        this.selectedIsins.set(this.catalog().slice(0, 3).map(e => e.isin));
        this.seeded.set(true);
      }
    });

    // Persist every selection change (including clearing to []).
    effect(() => {
      if (this.seeded()) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.selectedIsins()));
      }
    });

    // Prune ghost ISINs (e.g. if an ETF was deleted in another tab or directly in DB)
    effect(() => {
      if (this.etfService.loading()) return;
      const allIsins = new Set(this.etfService.all().map(e => e.isin));
      const current = this.selectedIsins();
      const valid = current.filter(isin => allIsins.has(isin));
      if (valid.length !== current.length) {
        // Use untracked to avoid cyclical effect triggers if we want, but since
        // the new length is equal, it's a stable state.
        this.selectedIsins.set(valid);
      }
    }, { allowSignalWrites: true });
  }

  protected isSelected(isin: string): boolean {
    return this.selectedIsins().includes(isin);
  }

  protected buy(etf: Etf): void {
    this.dialog.open(TransactionDialogComponent, {
      data: { presetEtfIsin: etf.isin, presetType: 'BUY' },
      panelClass: 'transaction-dialog-panel',
      maxWidth: 'min(580px, calc(100vw - 24px))',
      width: '100%',
    });
  }

  /** Open the add-ETF dialog; a created ETF joins the comparator selection right away. */
  protected addEtf(): void {
    const ref = this.dialog.open(EtfDialogComponent, { panelClass: 'transaction-dialog-panel', maxWidth: 'min(580px, calc(100vw - 24px))', width: '100%' });
    ref.afterClosed().subscribe((created?: EtfDto) => {
      if (!created) return;
      const current = this.selectedIsins();
      if (!current.includes(created.isin) && current.length < MAX_SELECTION) {
        this.selectedIsins.set([...current, created.isin]);
      }
    });
  }

  protected async deleteEtf(etf: EtfDto): Promise<void> {
    if (!confirm(`Supprimer ${etf.ticker} du catalogue ?`)) return;
    try {
      await this.etfService.remove(etf.isin);
      this.selectedIsins.update(list => list.filter(i => i !== etf.isin));
    } catch (err) {
      const msg = (err as { error?: { message?: string } })?.error?.message;
      this.toast.error(msg ?? `Impossible de supprimer ${etf.ticker}.`);
    }
  }

  protected editEtf(etf: EtfDto): void {
    this.dialog.open(EtfDialogComponent, {
      data: { etf },
      panelClass: 'transaction-dialog-panel',
      maxWidth: 'min(580px, calc(100vw - 24px))',
      width: '100%',
    });
  }

  protected toggle(etf: Etf): void {
    const current = this.selectedIsins();
    if (current.includes(etf.isin)) {
      this.selectedIsins.set(current.filter(i => i !== etf.isin));
    } else if (current.length < MAX_SELECTION) {
      this.selectedIsins.set([...current, etf.isin]);
    }
  }

  /**
   * Approximate 5-year total cost of ownership on a 500 €/month DCA, with the
   * usual 7 %/year market return assumption. The drag is the average CAPITALTOTAL each
   * year times the ETF TER:
   *
   *     avgAUM_y = invested(0..y-1) + invested(0..y) / 2
   *     drag     = Σ_{y=1..5} avgAUM_y × ter
   *
   * Brokerage / spread costs are intentionally left out — they are envelope-
   * and instrument-dependent, the user already sees the monthly fee in the
   * DCA helper, and Yahoo Finance does not provide them. The number stays a
   * directional cost-of-management comparator rather than a precise TCO.
   */
  protected tco5y(ter: number, monthly = 500, annualReturn = 0.07): number {
    let capitalTotal = 0;
    let drag = 0;
    for (let y = 1; y <= 5; y++) {
      const aumStart = capitalTotal;
      const yearContrib = monthly * 12;
      capitalTotal = (capitalTotal + yearContrib) * (1 + annualReturn);
      const aumEnd = capitalTotal;
      // `ter` is in percent points (0.15 = 0.15 %/yr) — convert to a fraction.
      drag += ((aumStart + aumEnd) / 2) * (ter / 100);
    }
    return drag;
  }

  protected readonly fmtNum    = fmtNum;
  protected readonly fmtPctRaw = fmtPctRaw;
}

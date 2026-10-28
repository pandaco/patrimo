import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import {
  Envelope,
  EnvelopeService,
  EtfService,
  etfValue,
  TauxChangeService,
  ToastService,
  TransactionService,
  unrealizedPlusValue,
  unrealizedPnlPct,
  unrealizedPlusValueMulti,
  unrealizedPnlPctMulti,
  capPct,
  PERIOD_OPTIONS,
  PerformanceService,
  PeriodService,
} from '@patrimo/data-access';
import { PerformancePeriod } from '@patrimo/contracts';
import { computeLivretInterest } from './livret-interest';
import { sortEnvelopeRows } from './envelope-variation-rows';
import { PositionSortKey, SortState, nextSort } from '../portfolio/sort-rows';
import { computeRealized, startOfYearISO } from '../portfolio/realized-plusValue';
import { DeltaComponent, EnvGlyphComponent, formatPercentRaw, EnvelopeDialogComponent, TipDirective, TransactionDialogComponent, VariationComponent } from '@patrimo/ui';

interface Family { label: string; glyphs: string[]; color: string }

// Families are matched by `glyph` (a stable, finite vocabulary) rather than
// the mock envelope ids that disappeared once envelopes started living in
// Postgres with UUID primary keys.
type WealthView = 'famille' | 'devise' | 'liquidité';

const LIQUIDITY_TIERS: { label: string; glyphs: string[]; color: string }[] = [
  { label: 'Disponible immédiat',      glyphs: ['livret', 'cto'],             color: '#16A34A' },
  { label: 'Bloquée temporairement',   glyphs: ['pea', 'peapme', 'pee'],      color: '#CA8A04' },
  { label: 'Bloquée long terme',       glyphs: ['per', 'av', 'crypto', 'immo', 'metal'], color: '#7C3AED' },
];

const FAMILIES: Family[] = [
  { label: 'Comptes boursiers',         glyphs: ['pea','peapme','cto'],  color: '#16A34A' },
  { label: 'Assurance-vie & retraite',  glyphs: ['av','per','pee'],      color: '#7C3AED' },
  { label: 'Épargne réglementée',       glyphs: ['livret'],              color: '#CA8A04' },
  { label: 'Autres placements',         glyphs: ['crypto','immo','metal'], color: '#DC2626' },
];

export interface FamilyRow {
  family: Family;
  envelopes: Envelope[];
  value: number;
  invested: number;
  plusValue: number;
  pnlPct: number;
  pct: number;
}

@Component({
  selector: 'app-wealth',
  standalone: true,
  imports: [RouterLink, DeltaComponent, EnvGlyphComponent, TipDirective, VariationComponent],
  templateUrl: './wealth.component.html',
  styleUrl: './wealth.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WealthComponent {
  private readonly envelopeService = inject(EnvelopeService);
  private readonly etfService = inject(EtfService);
  private readonly transactionService = inject(TransactionService);
  private readonly dialog = inject(MatDialog);
  private readonly toasts = inject(ToastService);
  private readonly performanceService = inject(PerformanceService);
  private readonly periodService = inject(PeriodService);

  protected readonly activeView = signal<WealthView>('famille');
  protected readonly total      = this.envelopeService.total;
  protected readonly allEnv     = this.envelopeService.all;

  /** Projected annual interest on regulated savings (Livret A, LDDS, …). */
  protected readonly livretInterest = computed(() => computeLivretInterest(this.allEnv()));

  protected readonly families = computed<FamilyRow[]>(() => {
    const all   = this.allEnv();
    const total = this.total();
    return FAMILIES.map(f => {
      const envelopes = all.filter(e => f.glyphs.includes(e.glyph));
      const value     = envelopes.reduce((a, e) => a + e.value, 0);
      const invested  = envelopes.reduce((a, e) => a + e.invested, 0);
      const plusValue = unrealizedPlusValueMulti(envelopes);
      return {
        family: f,
        envelopes,
        value,
        invested,
        plusValue,
        pnlPct: unrealizedPnlPctMulti(envelopes),
        pct:    total    ? (value / total) * 100 : 0,
      };
    });
  });

  // ─── Variation sur la période (partagée avec le dashboard et le Portefeuille) ─

  protected readonly periodOptions = PERIOD_OPTIONS;
  protected readonly period        = this.periodService.period;
  protected readonly periodCaption = computed(() => PERIOD_OPTIONS.find(o => o.id === this.period())?.label ?? this.period());
  protected readonly variationLoading = this.performanceService.variationLoading;
  protected setPeriod(id: PerformancePeriod): void { this.periodService.set(id); }

  /** Financial scope only (securities, fonds euros, livrets) — the service's own total. */
  protected readonly variationTotal = computed(() => this.performanceService.variationHeld().total);

  protected readonly variationSort = signal<SortState>({ key: 'value', direction: 'desc' });
  protected toggleVariationSort(key: PositionSortKey): void { this.variationSort.update(current => nextSort(current, key)); }
  protected ariaSort(key: PositionSortKey): 'ascending' | 'descending' | 'none' {
    const { key: active, direction } = this.variationSort();
    return active !== key ? 'none' : direction === 'asc' ? 'ascending' : 'descending';
  }
  protected sortArrow(key: PositionSortKey): string {
    const { key: active, direction } = this.variationSort();
    return active !== key ? '' : direction === 'asc' ? '▲' : '▼';
  }

  protected readonly variationRows = computed(() => {
    const envelopesById = new Map(this.allEnv().map(e => [e.id, e]));
    return sortEnvelopeRows(this.performanceService.variationHeld().envelopes, this.variationSort())
      .map(row => ({ row, envelope: envelopesById.get(row.id) }));
  });

  protected readonly currencyRows = computed(() => {
    const total = this.total();
    const byKey = new Map<string, number>();
    for (const e of this.etfService.positions()) {
      const v = etfValue(e);
      byKey.set(e.currency, (byKey.get(e.currency) ?? 0) + v);
    }
    const COLORS: Record<string, string> = {
      EUR: '#16A34A', USD: '#2563EB', GBP: '#DC2626', JPY: '#CA8A04', CHF: '#7C3AED',
    };
    return Array.from(byKey.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([currency, value]) => ({
        label: currency, value, color: COLORS[currency] ?? '#999',
        pct: total ? (value / total) * 100 : 0,
      }));
  });

  protected readonly liquidityRows = computed(() => {
    const all   = this.allEnv();
    const total = this.total();
    return LIQUIDITY_TIERS.map(tier => {
      const envelopes = all.filter(e => tier.glyphs.includes(e.glyph));
      const value     = envelopes.reduce((a, e) => a + e.value, 0);
      return {
        label: tier.label, color: tier.color,
        envelopes, value,
        pct: total ? (value / total) * 100 : 0,
      };
    });
  });

  private readonly tauxChangeService = inject(TauxChangeService);
  // TAUXCHANGE-aware: converts EUR-base amounts into the display currency.
  protected readonly formatEuro = (n: number, d = 2): string => this.tauxChangeService.format(n, d);
  protected readonly formatPercentRaw = formatPercentRaw;

  protected plusValue = unrealizedPlusValue;
  protected pnlPct = unrealizedPnlPct;
  protected capPct = capPct;

  // Realized P&L YTD per envelope, computed via FIFO walk on the envelope's own transactions.
  protected readonly ytdRealizedByEnvelope = computed(() => {
    const jan1Iso = startOfYearISO();
    const allTxs = this.transactionService.all();
    const result = new Map<string, number>();
    for (const env of this.allEnv()) {
      const envTxs = allTxs.filter(t => t.envelope === env.id);
      result.set(env.id, computeRealized(envTxs, jan1Iso).realizedSince);
    }
    return result;
  });
  protected ytdRealized(envId: string): number { return this.ytdRealizedByEnvelope().get(envId) ?? 0; }

  protected async openAddTx(env: Envelope): Promise<void> {
    this.dialog.open(TransactionDialogComponent, {
      data: { presetEnvelopeId: env.id },
      panelClass: 'transaction-dialog-panel',
      maxWidth: 'min(580px, calc(100vw - 24px))',
      width: '100%',
    });
  }

  protected async openNewEnvelope(presetGlyph?: string): Promise<void> {
    this.dialog.open(EnvelopeDialogComponent, {
      data: presetGlyph ? { presetGlyph } : undefined,
      panelClass: 'transaction-dialog-panel',
      maxWidth: 'min(580px, calc(100vw - 24px))',
      width: '100%',
    });
  }

  /**
   * Family-level "+ Ajouter": with at least one envelope it pre-fills a
   * transaction on the first one; on an empty family it opens the envelope
   * creation dialog pre-set on the family's first type — a disabled button
   * that silently does nothing is a dead end for a brand-new account.
   */
  protected async addForFamily(row: FamilyRow): Promise<void> {
    if (row.envelopes.length > 0) {
      await this.openAddTx(row.envelopes[0]);
    } else {
      await this.openNewEnvelope(row.family.glyphs[0]);
    }
  }

  protected async openEditEnvelope(env: Envelope): Promise<void> {
    this.dialog.open(EnvelopeDialogComponent, {
      data: { envelope: env },
      panelClass: 'transaction-dialog-panel',
      maxWidth: 'min(580px, calc(100vw - 24px))',
      width: '100%',
    });
  }

  protected async deleteEnvelope(env: Envelope): Promise<void> {
    if (!confirm(
      `Supprimer l'enveloppe « ${env.label} » ?\n\n` +
      `Cette action est irréversible et supprime AUSSI toutes les opérations ` +
      `enregistrées sur cette enveloppe.`,
    )) return;
    try {
      // EnvelopeService.remove() fans the cascade reload (transactions + positions)
      // out internally — the component does not need to chain them itself.
      await this.envelopeService.remove(env.id);
    } catch (err) {
      this.toasts.error(err instanceof Error ? err.message : 'Suppression impossible');
    }
  }
}

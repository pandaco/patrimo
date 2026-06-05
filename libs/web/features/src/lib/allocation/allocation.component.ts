import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { AllocationService, EtfService, etfValue } from 'data-access';
import { DeltaComponent, DonutComponent, fmtEur, fmtNum } from 'ui';

interface SliceRow { label: string; value: number; pct: number; color: string }

const ALLOC_BUCKETS = ['Core', 'Satellite', 'Obligations'] as const;
type AllocBucket = (typeof ALLOC_BUCKETS)[number];

const CURRENCY_COLORS: Record<string, string> = {
  EUR: '#16A34A',
  USD: '#0284C7',
  GBP: '#7C3AED',
};

@Component({
  selector: 'app-allocation',
  standalone: true,
  imports: [DeltaComponent, DonutComponent],
  templateUrl: './allocation.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AllocationComponent {
  private readonly allocSvc = inject(AllocationService);
  private readonly etfSvc   = inject(EtfService);

  protected readonly targets = this.allocSvc.targets;

  protected readonly total = computed(() =>
    this.etfSvc.all().reduce((a, e) => a + etfValue(e), 0),
  );

  protected readonly realPct = computed(() => {
    const total = this.total();
    const m: Record<string, number> = {};
    if (!total) return m;
    for (const e of this.etfSvc.all()) m[e.ticker] = (etfValue(e) / total) * 100;
    return m;
  });

  protected readonly tacticReal = computed<Record<AllocBucket, number>>(() => {
    const total = this.total();
    const acc: Record<AllocBucket, number> = { Core: 0, Satellite: 0, Obligations: 0 };
    if (!total) return acc;
    for (const e of this.etfSvc.all()) acc[e.alloc] += etfValue(e);
    return {
      Core:        (acc.Core        / total) * 100,
      Satellite:   (acc.Satellite   / total) * 100,
      Obligations: (acc.Obligations / total) * 100,
    };
  });

  protected readonly strategicReal = computed(() => {
    const t = this.tacticReal();
    return { stocks: t.Core + t.Satellite, bonds: t.Obligations };
  });

  protected readonly byCurrency = computed<SliceRow[]>(() => {
    const total = this.total();
    if (!total) return [];
    const acc = new Map<string, number>();
    for (const e of this.etfSvc.all()) {
      acc.set(e.currency, (acc.get(e.currency) ?? 0) + etfValue(e));
    }
    return Array.from(acc.entries())
      .map(([label, value]) => ({
        label,
        value,
        pct: (value / total) * 100,
        color: CURRENCY_COLORS[label] ?? '#5C5A53',
      }))
      .sort((a, b) => b.value - a.value);
  });

  protected readonly currencyDonut = computed(() =>
    this.byCurrency().map(s => ({ value: s.value, color: s.color })),
  );

  protected readonly etfsWithTargets = computed(() =>
    this.etfSvc.all().filter(e => this.targets().etf[e.ticker] != null),
  );

  protected readonly strategicDonut = computed(() => [
    { value: this.targets().strategic.stocks, color: 'var(--brand)' },
    { value: this.targets().strategic.bonds,  color: 'var(--ink-3)' },
  ]);

  protected readonly tacticDonut = computed(() => [
    { value: this.targets().tactic.core,      color: 'var(--brand)' },
    { value: this.targets().tactic.satellite, color: '#8C6E2A' },
    { value: this.targets().tactic.bonds,     color: 'var(--ink-3)' },
  ]);

  protected readonly fmtEur = fmtEur;
  protected readonly fmtNum = fmtNum;
  protected readonly abs    = Math.abs;

  protected drift(ticker: string): number {
    return (this.realPct()[ticker] ?? 0) - this.targets().etf[ticker];
  }

  protected driftSev(drift: number): string {
    return Math.abs(drift) <= 2 ? 'gain' : Math.abs(drift) <= 5 ? 'warn' : 'loss';
  }

  protected action(drift: number): string {
    return drift > 5 ? 'Vendre' : drift < -3 ? 'Acheter' : 'Tenir';
  }

  protected driftBarW(val: number, target: number, real: number): string {
    const max = Math.max(target, real, 30);
    return (val / max) * 100 + '%';
  }
}

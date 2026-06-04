import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { AllocationService, EtfService, etfValue } from 'data-access';
import { DeltaComponent, DonutComponent, fmtEur, fmtNum } from 'ui';

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

  protected readonly total   = computed(() =>
    this.etfSvc.all().reduce((a, e) => a + etfValue(e), 0)
  );

  protected readonly realPct = computed(() => {
    const t = this.total();
    const m: Record<string, number> = {};
    this.etfSvc.all().forEach(e => { m[e.ticker] = etfValue(e) / t * 100; });
    return m;
  });

  protected readonly etfsWithTargets = computed(() =>
    this.etfSvc.all().filter(e => this.targets().etf[e.ticker] != null)
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

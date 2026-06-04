import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { EnvelopeService, Envelope } from 'data-access';
import { DeltaComponent, EnvGlyphComponent, fmtEur, fmtPctRaw } from 'ui';

interface Family { label: string; ids: string[]; color: string }

const FAMILIES: Family[] = [
  { label: 'Comptes boursiers',         ids: ['pea','peapme','cto'],     color: '#16A34A' },
  { label: 'Assurance-vie & retraite',  ids: ['av','per','pee'],          color: '#7C3AED' },
  { label: 'Épargne réglementée',       ids: ['livreta','ldds'],          color: '#CA8A04' },
  { label: 'Autres placements',         ids: ['crypto','immo','metal'],   color: '#DC2626' },
];

export interface FamilyRow {
  family: Family;
  envelopes: Envelope[];
  value: number;
  invested: number;
  pnl: number;
  pnlPct: number;
  pct: number;
}

@Component({
  selector: 'app-wealth',
  standalone: true,
  imports: [DeltaComponent, EnvGlyphComponent],
  templateUrl: './wealth.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WealthComponent {
  private readonly envSvc = inject(EnvelopeService);

  protected readonly total    = this.envSvc.total;
  protected readonly allEnv   = this.envSvc.all;

  protected readonly families = computed<FamilyRow[]>(() => {
    const all   = this.allEnv();
    const total = this.total();
    return FAMILIES.map(f => {
      const envelopes = f.ids
        .map(id => all.find(e => e.id === id))
        .filter((e): e is Envelope => e !== undefined);
      const value    = envelopes.reduce((a, e) => a + e.value, 0);
      const invested = envelopes.reduce((a, e) => a + e.invested, 0);
      const pnl      = value - invested;
      return { family: f, envelopes, value, invested, pnl, pnlPct: (pnl / invested) * 100, pct: value / total * 100 };
    });
  });

  protected readonly fmtEur    = fmtEur;
  protected readonly fmtPctRaw = fmtPctRaw;

  protected pnl(env: Envelope)    { return env.value - env.invested; }
  protected pnlPct(env: Envelope) { return (env.value / env.invested - 1) * 100; }
  protected capPct(env: Envelope) { return env.plafond ? (env.value / env.plafond) * 100 : null; }
}

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { PeriodVariationDto } from '@patrimo/contracts';
import {
  AlertService, AuthService, Envelope, EnvelopeService, Etf, EtfService, PerformanceService, PeriodService,
  PreferencesService, TauxChangeService, TransactionService,
} from '@patrimo/data-access';
import { describe, expect, it } from 'vitest';
import { DashboardComponent } from './dashboard.component';
import { PerfChartComponent } from './perf-chart.component';
import { WealthChartComponent } from './wealth-chart.component';

function etf(price: number, prev: number, qty: number): Etf {
  return {
    isin: 'ISIN', ticker: 'ESE', name: 'ESE', issuer: '', index: '', ter: 0.2, currency: 'EUR', repli: '', distrib: '',
    pea: true, alloc: 'Core', qty, pru: prev, price, prev, perf1y: 0, perfYtd: 0,
  };
}

function variationWorth(value: number): PeriodVariationDto {
  const line = { value, pnl: 0, pnlPct: 0, variation: 0, variationPct: 0, capitalBase: value };
  return { period: 'YTD', total: line, positionsTotal: line, positions: [], envelopes: [] };
}

const emptyWealth = {
  period: 'YTD', labels: [], total: [], financial: [], flows: [], byCategory: {}, flowsByCategory: {},
  byEnvelope: {}, returns: {}, returnsByEnvelope: {},
};

/** Renders the dashboard with a securities day move of `dayMove` € against a financial wealth of `wealth` €. */
function render(dayMove: number, wealth: number) {
  const envelope = { id: 'env-1', glyph: 'pea', label: 'PEA' } as Envelope;
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: EnvelopeService, useValue: { all: signal([envelope]), total: signal(wealth), loading: signal(false) } },
      // One share: its price moved by `dayMove` since yesterday's close.
      { provide: EtfService, useValue: { positions: signal([etf(100 + dayMove, 100, 1)]), all: signal([]), sparks: signal({}) } },
      { provide: TransactionService, useValue: { all: signal([]) } },
      { provide: AlertService, useValue: { all: signal([]), dismiss: () => undefined } },
      { provide: PerformanceService, useValue: {
        variationHeld: signal(variationWorth(wealth)), variationLoading: signal(false), loading: signal(false),
        raw: signal(null), wealth: signal(emptyWealth), wealthLoading: signal(false),
      } },
      { provide: PeriodService, useValue: { period: signal('YTD'), set: () => undefined } },
      { provide: AuthService, useValue: { user: signal({ firstName: 'Alex' }), loaded: signal(true) } },
      { provide: PreferencesService, useValue: {
        loading: signal(false),
        current: signal({ onboardingDone: true, allocationTargets: null, monthlyTarget: 0, goalTarget: 0, goalName: '' }),
      } },
      { provide: TauxChangeService, useValue: { format: (n: number) => `${n} €`, symbol: () => '€', rate: signal(1), displayCurrency: signal('EUR') } },
    ],
  });
  TestBed.overrideComponent(DashboardComponent, { remove: { imports: [PerfChartComponent, WealthChartComponent] } });
  const fixture = TestBed.createComponent(DashboardComponent);
  fixture.detectChanges();
  return (fixture.nativeElement.querySelector('.page-sub') as HTMLElement).textContent?.replace(/\s+/g, ' ').trim() ?? '';
}

describe('DashboardComponent — greeting sentence', () => {
  it('rates a small day loss on the whole financial wealth, not on the tracked securities', () => {
    // −28 € against 44 238 €: −0,06 %. Rated on the 100 € of securities it would read −28 %.
    const sentence = render(-28, 44_238);
    expect(sentence).toContain('perd');
    expect(sentence).toContain('28 €');
    expect(sentence).toMatch(/-0[,.]06/);
    expect(sentence).not.toMatch(/28[,.]0/);
  });

  it('says the wealth gains on a positive day', () => {
    const sentence = render(50, 10_000);
    expect(sentence).toContain('gagne');
    expect(sentence).toContain('50 €');
  });
});

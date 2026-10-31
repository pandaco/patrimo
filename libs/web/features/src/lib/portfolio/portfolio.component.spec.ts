import { HttpClient } from '@angular/common/http';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import type { PeriodVariationDto, VariationDto } from '@patrimo/contracts';
import {
  API_BASE_URL, Etf, EtfService, EnvelopeService, ExposureService, PeriodService,
  PerformanceService, TauxChangeService, TransactionService,
} from '@patrimo/data-access';
import { PerfChartComponent } from '../dashboard/perf-chart.component';
import { of } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { PortfolioComponent } from './portfolio.component';

function etf(isin: string, ticker: string, alloc: Etf['alloc']): Etf {
  return {
    isin, ticker, name: ticker, issuer: '', index: '', ter: 0.2, currency: 'EUR', repli: '', distrib: '',
    pea: true, alloc, qty: 10, pru: 10, price: 10, prev: 10, perf1y: 0, perfYtd: 0,
  };
}

function row(variation: number, capitalBase: number): VariationDto {
  return { value: 100, pnl: 0, pnlPct: 0, variation, variationPct: (variation / capitalBase) * 100, capitalBase };
}

// Two positions: Core gains 10 on 100, Satellite loses 20 on 200. Unfiltered: −10 on 300.
const variation: PeriodVariationDto = {
  period: 'YTD',
  total: { ...row(-10, 300) },
  positionsTotal: { ...row(-10, 300), variationPct: -3.33 },
  positions: [
    { id: 'CORE', label: 'Core', ...row(10, 100), byEnvelope: [], series: [] },
    { id: 'SAT', label: 'Satellite', ...row(-20, 200), byEnvelope: [], series: [] },
  ],
  envelopes: [],
};

function render() {
  TestBed.configureTestingModule({
    providers: [
      { provide: EtfService, useValue: {
        all: signal([]), sparks: signal({}), loading: signal(false),
        positions: signal([etf('CORE', 'CORE', 'Core'), etf('SAT', 'SAT', 'Satellite')]),
      } },
      { provide: ExposureService, useValue: { geography: signal([]), sector: signal([]), curr: signal([]) } },
      { provide: PerformanceService, useValue: { variationHeld: signal(variation), variationLoading: signal(false) } },
      { provide: PeriodService, useValue: { period: signal('YTD'), set: () => undefined } },
      { provide: TransactionService, useValue: { all: signal([]) } },
      { provide: EnvelopeService, useValue: { all: signal([]) } },
      { provide: TauxChangeService, useValue: { format: (n: number) => `${n} €` } },
      { provide: Router, useValue: { navigate: () => Promise.resolve(true) } },
      { provide: ActivatedRoute, useValue: { queryParams: of({}), snapshot: { queryParams: {} } } },
      { provide: HttpClient, useValue: {} },
      { provide: API_BASE_URL, useValue: '/api' },
    ],
  });
  TestBed.overrideComponent(PortfolioComponent, { remove: { imports: [PerfChartComponent] } });
  const fixture = TestBed.createComponent(PortfolioComponent);
  fixture.detectChanges();
  return fixture;
}

describe('PortfolioComponent — total row under an allocation filter', () => {
  function totalText(fixture: ReturnType<typeof render>): string {
    return (fixture.nativeElement.querySelector('[data-testid="positions-total"] ui-variation') as HTMLElement).textContent ?? '';
  }

  function pick(fixture: ReturnType<typeof render>, tab: string): void {
    const button = Array.from(fixture.nativeElement.querySelectorAll('.tabs button') as NodeListOf<HTMLButtonElement>)
      .find(candidate => candidate.textContent?.trim() === tab);
    button?.click();
    fixture.detectChanges();
  }

  it('shows the figures of the whole table when no filter is active', () => {
    const text = totalText(render());
    expect(text).toContain('-10');
    expect(text).toContain('3,33');
  });

  it('rebuilds the percentage from the visible lines when Core is picked', () => {
    const fixture = render();
    pick(fixture, 'Core');
    const text = totalText(fixture);
    // 10 € gained on a 100 € base, not the −3,33 % of the whole table.
    expect(text).toContain('+10');
    expect(text).toContain('10,00');
    expect(text).not.toContain('3,33');
  });

  it('follows the filter to the other bucket', () => {
    const fixture = render();
    pick(fixture, 'Satellite');
    const text = totalText(fixture);
    expect(text).toContain('-20');
    expect(text).toContain('10,00');
  });
});

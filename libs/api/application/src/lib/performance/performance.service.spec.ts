import { Test } from '@nestjs/testing';
import type { Etf, Transaction, TransactionType, UserPreferences } from '@patrimo/api-domain';
import {
  ETF_REPOSITORY,
  TRANSACTION_REPOSITORY,
  USER_PREFERENCES_REPOSITORY,
} from '@patrimo/infrastructure';
import { PerformanceService } from './performance.service';
import { PriceService } from '../market/price.service';

const BENCHMARK_ISIN = 'FR0010261198';

function etf(overrides: Partial<Etf>): Etf {
  return {
    isin: overrides.isin ?? 'ISIN-ESE',
    ticker: overrides.ticker ?? 'ESE',
    name: overrides.name ?? 'Amundi S&P 500',
    issuer: 'Amundi',
    index: 'S&P 500',
    ter: overrides.ter ?? 0.15,
    currency: overrides.currency ?? 'EUR',
    repli: 'Synthétique',
    distrib: 'Capitalisant',
    pea: true,
    watchOnly: false,
    alloc: 'Core',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function tx(overrides: Partial<Transaction>): Transaction {
  return {
    id: overrides.id ?? 'tx-' + Math.random(),
    userId: 'user-1',
    envelopeId: overrides.envelopeId ?? 'env-1',
    etfIsin: overrides.etfIsin ?? 'ISIN-ESE',
    type: overrides.type ?? ('BUY' as TransactionType),
    date: overrides.date ?? new Date('2026-01-01'),
    quantity: overrides.quantity ?? 10,
    price: overrides.price ?? 40,
    fees: overrides.fees ?? 0,
    taxes: overrides.taxes ?? 0,
    transferId: overrides.transferId ?? null,
    amount: overrides.amount ?? 400,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('PerformanceService', () => {
  let service: PerformanceService;
  let transactionRepository: { findByUserId: jest.Mock };
  let etfRepository: { findAll: jest.Mock; findByIsin: jest.Mock };
  let preferencesRepository: { findByUserId: jest.Mock };
  let priceService: { getHistorical: jest.Mock; getQuote: jest.Mock };

  beforeEach(async () => {
    transactionRepository = { findByUserId: jest.fn().mockResolvedValue([]) };
    etfRepository = {
      findAll: jest.fn().mockResolvedValue([]),
      findByIsin: jest.fn().mockResolvedValue(null),
    };
    preferencesRepository = { findByUserId: jest.fn().mockResolvedValue(null) };
    priceService = {
      getHistorical: jest.fn().mockResolvedValue([]),
      getQuote: jest.fn().mockResolvedValue({ price: null }),
    };

    const mod = await Test.createTestingModule({
      providers: [
        PerformanceService,
        { provide: TRANSACTION_REPOSITORY, useValue: transactionRepository },
        { provide: ETF_REPOSITORY, useValue: etfRepository },
        { provide: USER_PREFERENCES_REPOSITORY, useValue: preferencesRepository },
        { provide: PriceService, useValue: priceService },
      ],
    }).compile();

    service = mod.get(PerformanceService);
  });

  /**
   * The service derives its date axis from `new Date()`, so label strings
   * depend on the day the suite runs. A first call with empty price history
   * returns the exact labels the service will use; tests then key their
   * mocked closes on those labels instead of hardcoding dates.
   */
  async function captureLabels(period: '1M' | '1Y' = '1M'): Promise<string[]> {
    const probe = await service.getSeries('user-1', period);
    priceService.getHistorical.mockClear();
    return probe.labels;
  }

  function mockHistory(byIsin: Record<string, { date: string; close: number }[]>): void {
    priceService.getHistorical.mockImplementation((isin: string) =>
      Promise.resolve(byIsin[isin] ?? []),
    );
  }

  describe('getSeries — portfolio replay', () => {
    it('returns an all-zero portfolio and no drawdowns without transactions', async () => {
      const series = await service.getSeries('user-1', '1M');
      expect(series.labels.length).toBeGreaterThan(0);
      expect(series.portfolio.every(v => v === 0)).toBe(true);
      expect(series.drawdowns).toEqual([]);
      expect(series.benchmark).toBeNull();
    });

    it('values the position as qty × close and applies SELLs from their date', async () => {
      const labels = await captureLabels();
      const sellLabel = labels[10];

      etfRepository.findAll.mockResolvedValue([etf({})]);
      transactionRepository.findByUserId.mockResolvedValue([
        tx({ type: 'BUY', quantity: 2, date: new Date(labels[0] + 'T00:00:00Z') }),
        tx({ type: 'SELL', quantity: 1, date: new Date(sellLabel + 'T00:00:00Z') }),
      ]);
      mockHistory({ 'ISIN-ESE': labels.map(date => ({ date, close: 100 })) });

      const series = await service.getSeries('user-1', '1M');
      expect(series.portfolio[0]).toBe(200);
      expect(series.portfolio[9]).toBe(200);
      expect(series.portfolio[10]).toBe(100);
      expect(series.portfolio[series.portfolio.length - 1]).toBe(100);
    });

    it('carries the last known close forward over gaps in the history', async () => {
      const labels = await captureLabels();

      etfRepository.findAll.mockResolvedValue([etf({})]);
      transactionRepository.findByUserId.mockResolvedValue([
        tx({ type: 'BUY', quantity: 1, date: new Date(labels[0] + 'T00:00:00Z') }),
      ]);
      mockHistory({ 'ISIN-ESE': [{ date: labels[0], close: 42 }] });

      const series = await service.getSeries('user-1', '1M');
      expect(series.portfolio.every(v => v === 42)).toBe(true);
    });

    it('returns null annualized for sub-year periods', async () => {
      const series = await service.getSeries('user-1', '1M');
      expect(series.annualized).toBeNull();
    });
  });

  describe('getSeries — drawdown walker', () => {
    it('detects a closed drawdown and an open one, sorted most negative first', async () => {
      const labels = await captureLabels();

      // Shape: peak 100 → trough 90 (idx 3) → recovery 100 (idx 4),
      // then a shallower dip to 98 from idx 11 that never recovers.
      const closes = labels.map((_, i) => {
        if (i === 2) return 95;
        if (i === 3) return 90;
        if (i >= 11) return 98;
        return 100;
      });

      etfRepository.findAll.mockResolvedValue([etf({})]);
      transactionRepository.findByUserId.mockResolvedValue([
        tx({ type: 'BUY', quantity: 1, date: new Date(labels[0] + 'T00:00:00Z') }),
      ]);
      mockHistory({ 'ISIN-ESE': labels.map((date, i) => ({ date, close: closes[i] })) });

      const series = await service.getSeries('user-1', '1M');
      expect(series.drawdowns).toHaveLength(2);

      const [deepest, open] = series.drawdowns;
      expect(deepest.pct).toBe(-10);
      // The walker keeps bumping the running peak on flat plateaus, so the
      // recorded peak is the *last* sample at the peak value (idx 1), not
      // the first.
      expect(deepest.peakDate).toBe(labels[1]);
      expect(deepest.troughDate).toBe(labels[3]);
      expect(deepest.recoveryDate).toBe(labels[4]);
      expect(deepest.durationDays).toBe(2);
      expect(deepest.recoveryDays).toBe(1);

      expect(open.pct).toBe(-2);
      expect(open.recoveryDate).toBeNull();
      expect(open.recoveryDays).toBeNull();
    });

    it('keeps only the top 3 drawdowns by depth', async () => {
      const labels = await captureLabels();

      // Four V-shaped dips of increasing depth: -5, -10, -15, -20.
      const closes = labels.map(() => 100);
      const dips = [
        { idx: 3, close: 95 },
        { idx: 8, close: 90 },
        { idx: 13, close: 85 },
        { idx: 18, close: 80 },
      ];
      for (const dip of dips) closes[dip.idx] = dip.close;

      etfRepository.findAll.mockResolvedValue([etf({})]);
      transactionRepository.findByUserId.mockResolvedValue([
        tx({ type: 'BUY', quantity: 1, date: new Date(labels[0] + 'T00:00:00Z') }),
      ]);
      mockHistory({ 'ISIN-ESE': labels.map((date, i) => ({ date, close: closes[i] })) });

      const series = await service.getSeries('user-1', '1M');
      expect(series.drawdowns).toHaveLength(3);
      expect(series.drawdowns.map(d => d.pct)).toEqual([-20, -15, -10]);
    });
  });

  describe('getSeries — benchmark', () => {
    it('scales the benchmark to the portfolio value at the anchor point', async () => {
      const labels = await captureLabels();

      etfRepository.findAll.mockResolvedValue([etf({})]);
      transactionRepository.findByUserId.mockResolvedValue([
        tx({ type: 'BUY', quantity: 2, date: new Date(labels[0] + 'T00:00:00Z') }),
      ]);
      mockHistory({
        'ISIN-ESE': labels.map(date => ({ date, close: 100 })),
        [BENCHMARK_ISIN]: labels.map((date, i) => ({ date, close: 50 * (i === 0 ? 1 : 1.1) })),
      });

      const series = await service.getSeries('user-1', '1M');
      expect(series.benchmark).not.toBeNull();
      // Anchor: benchmark equals the portfolio on the first non-zero sample.
      expect(series.benchmark?.[0]).toBe(series.portfolio[0]);
      // Then follows the benchmark's own relative move (+10 %).
      expect(series.benchmark?.[1]).toBeCloseTo(series.portfolio[0] * 1.1, 2);
    });

    it('uses the preferred benchmark ISIN when it exists in the catalog', async () => {
      preferencesRepository.findByUserId.mockResolvedValue({
        benchmarkIsin: 'ISIN-CUSTOM',
      } as Partial<UserPreferences>);
      etfRepository.findByIsin.mockResolvedValue(etf({ isin: 'ISIN-CUSTOM', ticker: 'CUST' }));

      await service.getSeries('user-1', '1M');
      expect(priceService.getHistorical).toHaveBeenCalledWith(
        'ISIN-CUSTOM', 'CUST', expect.any(Number), '1d',
      );
    });

    it('falls back to CW8 when the preferred ISIN left the catalog', async () => {
      preferencesRepository.findByUserId.mockResolvedValue({
        benchmarkIsin: 'ISIN-GONE',
      } as Partial<UserPreferences>);
      etfRepository.findByIsin.mockResolvedValue(null);

      await service.getSeries('user-1', '1M');
      expect(priceService.getHistorical).toHaveBeenCalledWith(
        BENCHMARK_ISIN, 'CW8', expect.any(Number), '1d',
      );
    });
  });

  describe('getFeesYtd', () => {
    it('sums YTD brokerage fees and computes the prorated TER drag per held ETF', async () => {
      const now = new Date();
      const todayThisYear = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const lastYear = new Date(now.getFullYear() - 1, 11, 1);

      etfRepository.findAll.mockResolvedValue([etf({ ter: 0.002 })]);
      transactionRepository.findByUserId.mockResolvedValue([
        tx({ type: 'BUY', quantity: 10, fees: 2.5, date: todayThisYear }),
        tx({ type: 'BUY', quantity: 5, fees: 1.5, date: todayThisYear }),
        tx({ type: 'BUY', quantity: 1, fees: 99, date: lastYear }), // outside YTD
      ]);
      priceService.getQuote.mockResolvedValue({ price: 100 });

      const fees = await service.getFeesYtd('user-1');
      expect(fees.brokerageYtd).toBe(4);
      expect(fees.byEtf).toHaveLength(1);

      const row = fees.byEtf[0];
      expect(row.ticker).toBe('ESE');
      expect(row.ter).toBeCloseTo(0.2, 5); // 0.002 → displayed in %
      expect(row.value).toBe(16 * 100); // 10 + 5 + 1 shares × 100 €
      // Drag is prorated on the elapsed fraction of the year; recompute with
      // the same formula rather than pinning a date-dependent constant.
      const elapsed = (Date.now() - new Date(now.getFullYear(), 0, 1).getTime()) / (365.25 * 24 * 60 * 60 * 1000);
      expect(row.terDragYtd).toBeCloseTo(Number((0.002 * 1600 * elapsed).toFixed(2)), 1);

      expect(fees.totalYtd).toBeCloseTo(fees.brokerageYtd + fees.terDragYtd, 5);
    });

    it('ignores ETFs whose position is fully sold', async () => {
      const now = new Date();
      const todayThisYear = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      etfRepository.findAll.mockResolvedValue([etf({})]);
      transactionRepository.findByUserId.mockResolvedValue([
        tx({ type: 'BUY', quantity: 10, fees: 1, date: todayThisYear }),
        tx({ type: 'SELL', quantity: 10, fees: 1, date: todayThisYear }),
      ]);

      const fees = await service.getFeesYtd('user-1');
      expect(fees.brokerageYtd).toBe(2);
      expect(fees.byEtf).toEqual([]);
      expect(fees.terDragYtd).toBe(0);
    });
  });
});

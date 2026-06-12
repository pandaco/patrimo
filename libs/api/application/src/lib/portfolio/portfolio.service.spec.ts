import { Test } from '@nestjs/testing';
import type { Etf, Transaction, TransactionType } from '@patrimo/api-domain';
import { ETF_REPOSITORY, TRANSACTION_REPOSITORY } from '@patrimo/infrastructure';
import { PriceService } from '../market/price.service';
import { PortfolioService } from './portfolio.service';
import { PreferencesService } from '../preferences/preferences.service';

function tx(overrides: Partial<Transaction>): Transaction {
  return {
    id: overrides.id ?? 'tx-' + Math.random(),
    userId: 'user-1',
    envelopeId: 'env-1',
    etfIsin: 'ISIN-ESE',
    type: 'BUY' as TransactionType,
    date: new Date('2026-01-01'),
    quantity: 0,
    price: 0,
    fees: 0,
    taxes: 0,
    transferId: null,
    amount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function etf(overrides: Partial<Etf>): Etf {
  return {
    isin: 'ISIN-ESE',
    ticker: 'ESE',
    name: 'Amundi S&P 500',
    issuer: 'Amundi',
    index: 'S&P 500',
    ter: 0.15,
    currency: 'EUR',
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

describe('PortfolioService', () => {
  let service: PortfolioService;
  let transactionRepository:  { findByUserId: jest.Mock };
  let etfRepository: { findAll:      jest.Mock; updateExposure: jest.Mock };
  let prices:  { getQuote:     jest.Mock; getMetadata: jest.Mock };
  let preferencesServiceMock:   { get:          jest.Mock };

  beforeEach(async () => {
    transactionRepository  = { findByUserId: jest.fn() };
    etfRepository = { findAll:      jest.fn(), updateExposure: jest.fn() };
    prices  = { getQuote:     jest.fn().mockResolvedValue({ price: null, prevClose: null }), getMetadata: jest.fn() };
    preferencesServiceMock   = { get:          jest.fn() };

    const mod = await Test.createTestingModule({
      providers: [
        PortfolioService,
        { provide: TRANSACTION_REPOSITORY, useValue: transactionRepository  },
        { provide: ETF_REPOSITORY,         useValue: etfRepository },
        { provide: PriceService,           useValue: prices  },
        { provide: PreferencesService,     useValue: preferencesServiceMock   },
      ],
    }).compile();

    service = mod.get(PortfolioService);
  });

  it('aggregates BUY transactions into qty + weighted-average PRU', async () => {
    etfRepository.findAll.mockResolvedValue([etf({})]);
    transactionRepository.findByUserId.mockResolvedValue([
      tx({ type: 'BUY', quantity: 10, price: 38.5, fees: 1 }),
      tx({ type: 'BUY', quantity: 12, price: 39.3, fees: 1 }),
    ]);

    const [pos] = await service.listForUser('user-1');

    expect(pos.qty).toBe(22);
    // PRU = (10*38.5 + 1 + 12*39.3 + 1) / 22 = 857.6 / 22 = 38.98...
    expect(pos.avgPrice).toBeCloseTo((10 * 38.5 + 1 + 12 * 39.3 + 1) / 22, 4);
    // Net invested = same as total BUY cost since there are no sells.
    expect(pos.invested).toBeCloseTo(10 * 38.5 + 1 + 12 * 39.3 + 1, 4);
  });

  it('reduces qty on SELL but leaves the PRU computed from BUYs only', async () => {
    etfRepository.findAll.mockResolvedValue([etf({})]);
    transactionRepository.findByUserId.mockResolvedValue([
      tx({ type: 'BUY',  quantity: 20, price: 40, fees: 0 }),
      tx({ type: 'SELL', quantity: 5,  price: 50, fees: 0 }),
    ]);

    const [pos] = await service.listForUser('user-1');

    expect(pos.qty).toBe(15);
    expect(pos.avgPrice).toBeCloseTo(40);            // PRU only from BUYs
    // invested = BUY 20*40 - SELL 5*50 = 800 - 250 = 550
    expect(pos.invested).toBeCloseTo(550);
  });

  it('ignores DEPOSIT / DIVIDEND / INTEREST rows', async () => {
    etfRepository.findAll.mockResolvedValue([etf({})]);
    transactionRepository.findByUserId.mockResolvedValue([
      tx({ type: 'BUY',      quantity: 10, price: 50 }),
      tx({ type: 'DIVIDEND', quantity: 1,  price: null, amount: 25 }),
      tx({ type: 'DEPOSIT',  quantity: 1,  price: null, amount: 500, etfIsin: null }),
      tx({ type: 'INTEREST', quantity: 1,  price: null, amount: 12,  etfIsin: null }),
    ]);

    const [pos] = await service.listForUser('user-1');

    expect(pos.qty).toBe(10);
    expect(pos.avgPrice).toBe(50);
    expect(pos.invested).toBe(500);
  });

  it('skips positions that are fully closed (qty <= 0)', async () => {
    etfRepository.findAll.mockResolvedValue([etf({})]);
    transactionRepository.findByUserId.mockResolvedValue([
      tx({ type: 'BUY',  quantity: 10, price: 30 }),
      tx({ type: 'SELL', quantity: 10, price: 35 }),
    ]);

    const result = await service.listForUser('user-1');
    expect(result).toHaveLength(0);
  });

  it('skips transactions referencing an ETF that does not exist in the catalog', async () => {
    etfRepository.findAll.mockResolvedValue([etf({ isin: 'ISIN-CW8', ticker: 'CW8', name: 'CW8' })]);
    transactionRepository.findByUserId.mockResolvedValue([
      tx({ etfIsin: 'ISIN-UNKNOWN', type: 'BUY', quantity: 5, price: 100 }),
    ]);

    const result = await service.listForUser('user-1');
    expect(result).toHaveLength(0);
  });

  it('enriches each position with the live quote returned by the price service', async () => {
    etfRepository.findAll.mockResolvedValue([etf({})]);
    transactionRepository.findByUserId.mockResolvedValue([
      tx({ type: 'BUY', quantity: 10, price: 30 }),
    ]);
    prices.getQuote.mockResolvedValue({ price: 42.5, prevClose: 41.8 });

    const [pos] = await service.listForUser('user-1');
    expect(pos.currentPrice).toBe(42.5);
    expect(pos.prevClose).toBe(41.8);
    expect(prices.getQuote).toHaveBeenCalledWith('ISIN-ESE', 'ESE');
  });

  it('sorts positions by net invested capital descending', async () => {
    etfRepository.findAll.mockResolvedValue([
      etf({ isin: 'ISIN-A', ticker: 'A' }),
      etf({ isin: 'ISIN-B', ticker: 'B' }),
    ]);
    transactionRepository.findByUserId.mockResolvedValue([
      tx({ etfIsin: 'ISIN-A', type: 'BUY', quantity: 1, price: 100 }),
      tx({ etfIsin: 'ISIN-B', type: 'BUY', quantity: 1, price: 500 }),
    ]);

    const result = await service.listForUser('user-1');
    expect(result.map(p => p.ticker)).toEqual(['B', 'A']);
  });
});

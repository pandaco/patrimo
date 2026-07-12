import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type {
  Envelope,
  Etf,
  Transaction,
  AlertRule,
  UserPreferences,
  TransactionType,
} from '@patrimo/api-domain';
import { ALERT_RULE_REPOSITORY } from '@patrimo/api-domain';
import {
  AlertReadOrmEntity,
  ENVELOPE_REPOSITORY,
  ETF_REPOSITORY,
  TRANSACTION_REPOSITORY,
  USER_PREFERENCES_REPOSITORY,
} from '@patrimo/infrastructure';
import { AlertService } from './alert.service';
import { PortfolioService } from '../portfolio/portfolio.service';

function envelope(overrides: Partial<Envelope>): Envelope {
  return {
    id: overrides.id ?? 'env-1',
    userId: 'user-1',
    code: overrides.code ?? 'PEA',
    label: overrides.label ?? 'Mon PEA',
    glyph: overrides.glyph ?? 'pea',
    broker: overrides.broker ?? 'Fortuneo',
    cash: overrides.cash ?? 0,
    invested: overrides.invested ?? 0,
    value: overrides.value ?? 0,
    plafond: overrides.plafond ?? null,
    openedAt: overrides.openedAt ?? new Date('2022-01-01'),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

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

function rule(overrides: Partial<AlertRule>): AlertRule {
  return {
    id: overrides.id ?? 'rule-' + Math.random(),
    userId: 'user-1',
    type: overrides.type ?? 'CASH_IDLE',
    threshold: overrides.threshold ?? 100,
    enabled: overrides.enabled ?? true,
    channels: overrides.channels ?? ['WEB'],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe('AlertService', () => {
  let service: AlertService;
  let envelopeRepository: { findByUserId: jest.Mock };
  let transactionRepository: { findByUserId: jest.Mock };
  let etfRepository: { findAll: jest.Mock };
  let alertRuleRepository: { findByUserId: jest.Mock };
  let preferencesRepository: { findByUserId: jest.Mock };
  let portfolio: { listForUser: jest.Mock };
  let alertReadRepository: { findBy: jest.Mock; upsert: jest.Mock };

  beforeEach(async () => {
    envelopeRepository = { findByUserId: jest.fn().mockResolvedValue([]) };
    transactionRepository = { findByUserId: jest.fn().mockResolvedValue([]) };
    etfRepository = { findAll: jest.fn().mockResolvedValue([]) };
    alertRuleRepository = { findByUserId: jest.fn().mockResolvedValue([]) };
    preferencesRepository = { findByUserId: jest.fn().mockResolvedValue(null) };
    portfolio = { listForUser: jest.fn().mockResolvedValue([]) };
    alertReadRepository = {
      findBy: jest.fn().mockResolvedValue([]),
      upsert: jest.fn().mockResolvedValue({}),
    };

    const mod = await Test.createTestingModule({
      providers: [
        AlertService,
        { provide: ENVELOPE_REPOSITORY, useValue: envelopeRepository },
        { provide: TRANSACTION_REPOSITORY, useValue: transactionRepository },
        { provide: ETF_REPOSITORY, useValue: etfRepository },
        { provide: ALERT_RULE_REPOSITORY, useValue: alertRuleRepository },
        { provide: USER_PREFERENCES_REPOSITORY, useValue: preferencesRepository },
        { provide: PortfolioService, useValue: portfolio },
        {
          provide: getRepositoryToken(AlertReadOrmEntity),
          useValue: alertReadRepository,
        },
      ],
    }).compile();

    service = mod.get(AlertService);
  });

  it('returns empty alerts when no conditions are met', async () => {
    const list = await service.listForUser('user-1');
    expect(list).toEqual([]);
  });

  describe('CASH_IDLE rule', () => {
    it('generates CASH_IDLE warning when envelope cash is above threshold and idle > 30 days', async () => {
      envelopeRepository.findByUserId.mockResolvedValue([
        envelope({ id: 'env-1', code: 'PEA', cash: 150 }),
      ]);
      transactionRepository.findByUserId.mockResolvedValue([
        tx({
          envelopeId: 'env-1',
          type: 'DEPOSIT',
          date: new Date(Date.now() - 40 * 24 * 3600 * 1000),
        }),
      ]);
      alertRuleRepository.findByUserId.mockResolvedValue([
        rule({ type: 'CASH_IDLE', threshold: 100 }),
      ]);

      const list = await service.listForUser('user-1');
      const cashIdle = list.find((a) => a.type === 'CASH_IDLE');
      expect(cashIdle).toBeDefined();
      expect(cashIdle?.severity).toBe('warn');
      expect(cashIdle?.title).toContain('Cash dormant');
    });

    it('does not generate CASH_IDLE when cash is below threshold', async () => {
      envelopeRepository.findByUserId.mockResolvedValue([
        envelope({ id: 'env-1', cash: 50 }),
      ]);
      transactionRepository.findByUserId.mockResolvedValue([
        tx({
          envelopeId: 'env-1',
          type: 'DEPOSIT',
          date: new Date(Date.now() - 40 * 24 * 3600 * 1000),
        }),
      ]);
      alertRuleRepository.findByUserId.mockResolvedValue([
        rule({ type: 'CASH_IDLE', threshold: 100 }),
      ]);

      const list = await service.listForUser('user-1');
      expect(list.find((a) => a.type === 'CASH_IDLE')).toBeUndefined();
    });
  });

  describe('PLAFOND_NEAR rule', () => {
    it('generates PLAFOND_NEAR alert when envelope value is near the plafond', async () => {
      envelopeRepository.findByUserId.mockResolvedValue([
        envelope({ id: 'env-1', code: 'PEA', value: 140000, plafond: 150000 }),
      ]);
      alertRuleRepository.findByUserId.mockResolvedValue([
        rule({ type: 'PLAFOND_NEAR', threshold: 0.8 }),
      ]);

      const list = await service.listForUser('user-1');
      const alert = list.find((a) => a.type === 'PLAFOND_NEAR');
      expect(alert).toBeDefined();
      expect(alert?.severity).toBe('info'); // ratio 140/150 = 93.3% < 95%
    });

    it('generates warn severity when ratio >= 95%', async () => {
      envelopeRepository.findByUserId.mockResolvedValue([
        envelope({ id: 'env-1', code: 'PEA', value: 145000, plafond: 150000 }),
      ]);
      alertRuleRepository.findByUserId.mockResolvedValue([
        rule({ type: 'PLAFOND_NEAR', threshold: 0.8 }),
      ]);

      const list = await service.listForUser('user-1');
      const alert = list.find((a) => a.type === 'PLAFOND_NEAR');
      expect(alert?.severity).toBe('warn');
    });
  });

  describe('DIVIDEND_RECENT rule', () => {
    it('generates DIVIDEND_RECENT alert for dividends received recently', async () => {
      transactionRepository.findByUserId.mockResolvedValue([
        tx({
          type: 'DIVIDEND',
          etfIsin: 'ISIN-ESE',
          amount: 50,
          date: new Date(Date.now() - 2 * 24 * 3600 * 1000),
        }),
      ]);
      etfRepository.findAll.mockResolvedValue([etf({ isin: 'ISIN-ESE', ticker: 'ESE' })]);
      alertRuleRepository.findByUserId.mockResolvedValue([
        rule({ type: 'DIVIDEND_RECENT', threshold: 7 }),
      ]);

      const list = await service.listForUser('user-1');
      const alert = list.find((a) => a.type === 'DIVIDEND_RECENT');
      expect(alert).toBeDefined();
      expect(alert?.severity).toBe('gain');
      expect(alert?.title).toContain('Dividende reçu — ESE');
    });
  });

  describe('PEA_AGE_NEAR rule', () => {
    it('generates PEA_AGE_NEAR alert when PEA age is close to 5 years', async () => {
      // 5 years in days: 1826. Let's make it 5 years in 10 days.
      const openedAt = new Date();
      openedAt.setFullYear(openedAt.getFullYear() - 5);
      openedAt.setDate(openedAt.getDate() + 10);

      envelopeRepository.findByUserId.mockResolvedValue([
        envelope({ code: 'PEA', openedAt }),
      ]);
      alertRuleRepository.findByUserId.mockResolvedValue([
        rule({ type: 'PEA_AGE_NEAR', threshold: 1 }),
      ]);

      const list = await service.listForUser('user-1');
      const alert = list.find((a) => a.type === 'PEA_AGE_NEAR');
      expect(alert).toBeDefined();
      expect(alert?.title).toContain('atteint 5 ans dans 10 j');
    });
  });

  describe('USD_CONCENTRATION rule', () => {
    it('generates USD_CONCENTRATION warning when USD holdings ratio is high', async () => {
      etfRepository.findAll.mockResolvedValue([
        etf({ isin: 'ISIN-USD', ticker: 'USDF', currency: 'USD' }),
        etf({ isin: 'ISIN-EUR', ticker: 'EURF', currency: 'EUR' }),
      ]);
      portfolio.listForUser.mockResolvedValue([
        { etfIsin: 'ISIN-USD', qty: 10, avgPrice: 100, currentPrice: 100 },
        { etfIsin: 'ISIN-EUR', qty: 10, avgPrice: 20, currentPrice: 20 },
      ]);
      alertRuleRepository.findByUserId.mockResolvedValue([
        rule({ type: 'USD_CONCENTRATION', threshold: 0.7 }),
      ]);

      const list = await service.listForUser('user-1');
      const alert = list.find((a) => a.type === 'USD_CONCENTRATION');
      expect(alert).toBeDefined();
      expect(alert?.severity).toBe('warn');
      // ratio: 1000 / 1200 = 83.3% > 70%
      expect(alert?.body).toContain('83 % de tes positions');
    });
  });

  describe('DCA_PENDING rule', () => {
    it('generates DCA_PENDING warning when monthly target is set and no BUY exists this month', async () => {
      preferencesRepository.findByUserId.mockResolvedValue({ monthlyTarget: 500 } as UserPreferences);
      transactionRepository.findByUserId.mockResolvedValue([]); // no txs this month

      const list = await service.listForUser('user-1');
      const alert = list.find((a) => a.type === 'DCA_PENDING');
      expect(alert).toBeDefined();
      expect(alert?.severity).toBe('warn');
      expect(alert?.title).toContain('Versement DCA en attente');
    });

    it('does not generate DCA_PENDING warning if a BUY exists this month', async () => {
      preferencesRepository.findByUserId.mockResolvedValue({ monthlyTarget: 500 } as UserPreferences);
      transactionRepository.findByUserId.mockResolvedValue([
        tx({ type: 'BUY', date: new Date() }), // buy today
      ]);

      const list = await service.listForUser('user-1');
      expect(list.find((a) => a.type === 'DCA_PENDING')).toBeUndefined();
    });
  });

  describe('ALLOCATION_DRIFT rule', () => {
    const strategicPrefs = {
      monthlyTarget: 0,
      allocationTargets: { strategic: { stocks: 60, bonds: 40 }, tactic: { core: 0, satellite: 0, bonds: 0 }, etf: {} },
    } as UserPreferences;

    it('alerts with a rebalancing CTA when the stocks share drifts past the threshold', async () => {
      preferencesRepository.findByUserId.mockResolvedValue(strategicPrefs);
      etfRepository.findAll.mockResolvedValue([
        etf({ isin: 'ISIN-STOCK', alloc: 'Core' }),
        etf({ isin: 'ISIN-BOND', alloc: 'Obligations' }),
      ]);
      // 100 % stocks vs a 60/40 target → 40 pts drift.
      portfolio.listForUser.mockResolvedValue([
        { etfIsin: 'ISIN-STOCK', qty: 10, avgPrice: 100, currentPrice: 100 },
      ]);

      const list = await service.listForUser('user-1');
      const alert = list.find((a) => a.type === 'ALLOCATION_DRIFT');
      expect(alert).toBeDefined();
      expect(alert?.severity).toBe('warn'); // ≥ 10 pts
      expect(alert?.body).toContain('40 pts');
      expect(alert?.cta).toBe('Voir le plan de rééquilibrage');
    });

    it('stays silent below the threshold and without a strategic target', async () => {
      // 62 % stocks vs 60 % target → 2 pts < 5 pts default threshold.
      preferencesRepository.findByUserId.mockResolvedValue(strategicPrefs);
      etfRepository.findAll.mockResolvedValue([
        etf({ isin: 'ISIN-STOCK', alloc: 'Core' }),
        etf({ isin: 'ISIN-BOND', alloc: 'Obligations' }),
      ]);
      portfolio.listForUser.mockResolvedValue([
        { etfIsin: 'ISIN-STOCK', qty: 62, avgPrice: 10, currentPrice: 10 },
        { etfIsin: 'ISIN-BOND', qty: 38, avgPrice: 10, currentPrice: 10 },
      ]);
      let list = await service.listForUser('user-1');
      expect(list.find((a) => a.type === 'ALLOCATION_DRIFT')).toBeUndefined();

      // No allocation target set → never fires, whatever the positions.
      preferencesRepository.findByUserId.mockResolvedValue({ monthlyTarget: 0, allocationTargets: null } as UserPreferences);
      list = await service.listForUser('user-1');
      expect(list.find((a) => a.type === 'ALLOCATION_DRIFT')).toBeUndefined();
    });

    it('respects a disabled rule', async () => {
      preferencesRepository.findByUserId.mockResolvedValue(strategicPrefs);
      etfRepository.findAll.mockResolvedValue([etf({ isin: 'ISIN-STOCK', alloc: 'Core' })]);
      portfolio.listForUser.mockResolvedValue([
        { etfIsin: 'ISIN-STOCK', qty: 10, avgPrice: 100, currentPrice: 100 },
      ]);
      alertRuleRepository.findByUserId.mockResolvedValue([
        rule({ type: 'ALLOCATION_DRIFT', enabled: false }),
      ]);

      const list = await service.listForUser('user-1');
      expect(list.find((a) => a.type === 'ALLOCATION_DRIFT')).toBeUndefined();
    });
  });

  describe('Marking read and dismiss', () => {
    it('markRead calls upsert on alertReadRepository', async () => {
      await service.markRead('user-1', 'hash-1');
      expect(alertReadRepository.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-1', alertHash: 'hash-1' }),
        expect.any(Object)
      );
    });

    it('dismiss calls upsert on alertReadRepository', async () => {
      await service.dismiss('user-1', 'hash-1');
      expect(alertReadRepository.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-1', alertHash: 'hash-1', dismissedAt: expect.any(Date) }),
        expect.any(Object)
      );
    });

    it('readAll marks all active alerts as read', async () => {
      preferencesRepository.findByUserId.mockResolvedValue({ monthlyTarget: 500 } as UserPreferences);
      transactionRepository.findByUserId.mockResolvedValue([]); // DCA_PENDING will trigger

      await service.readAll('user-1');
      expect(alertReadRepository.upsert).toHaveBeenCalled();
    });
  });
});

import { Test } from '@nestjs/testing';
import type { UserPreferences } from '@patrimo/api-domain';
import { USER_PREFERENCES_REPOSITORY } from '@patrimo/infrastructure';
import { PreferencesService } from './preferences.service';

function row(overrides: Partial<UserPreferences>): UserPreferences {
  return {
    userId: 'user-1',
    riskProfile: 'Prudent',
    horizonYears: 10,
    monthlyTarget: 500,
    displayCurrency: 'USD',
    uiMode: 'expert',
    onboardingDone: true,
    benchmarkIsin: 'ISIN-BENCH',
    livretRatePct: 3,
    allocationTargets: { etf: { 'ISIN-ESE': 60 } },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as UserPreferences;
}

describe('PreferencesService', () => {
  let service: PreferencesService;
  let repo: { findByUserId: jest.Mock; upsert: jest.Mock };

  beforeEach(async () => {
    repo = {
      findByUserId: jest.fn().mockResolvedValue(null),
      upsert: jest.fn(),
    };

    const mod = await Test.createTestingModule({
      providers: [
        PreferencesService,
        { provide: USER_PREFERENCES_REPOSITORY, useValue: repo },
      ],
    }).compile();

    service = mod.get(PreferencesService);
  });

  describe('get', () => {
    it('returns defaults when the user has no stored preferences', async () => {
      const preferences = await service.get('user-1');
      expect(preferences).toEqual({
        riskProfile: 'Équilibré dynamique',
        horizonYears: 25,
        monthlyTarget: 0,
        displayCurrency: 'EUR',
        uiMode: 'simple',
        onboardingDone: false,
        benchmarkIsin: 'FR0010261198',
        livretRatePct: 2.4,
        allocationTargets: null,
        goalName: 'Apport Maison',
        goalTarget: 50000,
      });
    });

    it('maps the stored row to the DTO', async () => {
      repo.findByUserId.mockResolvedValue(row({}));
      const preferences = await service.get('user-1');
      expect(preferences.riskProfile).toBe('Prudent');
      expect(preferences.horizonYears).toBe(10);
      expect(preferences.benchmarkIsin).toBe('ISIN-BENCH');
      expect(preferences.allocationTargets).toEqual({ etf: { 'ISIN-ESE': 60 } });
    });
  });

  describe('update', () => {
    it('passes the partial through and returns the upserted row as DTO', async () => {
      repo.upsert.mockResolvedValue(row({ monthlyTarget: 750 }));

      const preferences = await service.update('user-1', { monthlyTarget: 750 });

      expect(repo.upsert).toHaveBeenCalledWith('user-1', expect.objectContaining({
        monthlyTarget: 750,
      }));
      expect(preferences.monthlyTarget).toBe(750);
    });

    it('leaves allocationTargets undefined when the client did not send it', async () => {
      repo.upsert.mockResolvedValue(row({}));

      await service.update('user-1', { horizonYears: 30 });

      const partial = repo.upsert.mock.calls[0][1];
      expect(partial.allocationTargets).toBeUndefined();
    });

    it('clears allocationTargets when the client sends an explicit null', async () => {
      repo.upsert.mockResolvedValue(row({ allocationTargets: null }));

      const preferences = await service.update('user-1', { allocationTargets: null });

      expect(repo.upsert.mock.calls[0][1].allocationTargets).toBeNull();
      expect(preferences.allocationTargets).toBeNull();
    });
  });
});

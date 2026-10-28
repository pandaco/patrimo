import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PERIOD_OPTIONS, PeriodService } from './period.service';

const STORAGE_KEY = 'patrimo:period';

function createService(): PeriodService {
  TestBed.resetTestingModule();
  return TestBed.inject(PeriodService);
}

describe('PeriodService', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it('lands on YTD on a first visit', () => {
    expect(createService().period()).toBe('YTD');
  });

  it('remembers the chosen period across a reload', () => {
    createService().set('3M');
    expect(createService().period()).toBe('3M');
  });

  it('ignores a stored value that is not a known period', () => {
    localStorage.setItem(STORAGE_KEY, 'forever');
    expect(createService().period()).toBe('YTD');
  });

  it('keeps working when the storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });

    const service = createService();
    expect(service.period()).toBe('YTD');
    service.set('1M');
    expect(service.period()).toBe('1M');
  });

  it('offers every period the API serves, with French labels', () => {
    expect(PERIOD_OPTIONS.map(o => o.label)).toEqual(['1J', '1S', '1M', '3M', '6M', 'YTD', '1A', '3A', '5A', 'MAX']);
    expect(PERIOD_OPTIONS.map(o => o.id)).toEqual(['1D', '1W', '1M', '3M', '6M', 'YTD', '1Y', '3Y', '5Y', 'MAX']);
  });
});

import { describe, expect, it } from 'vitest';
import { headlineReturn } from './headline-return';

describe('headlineReturn', () => {
  it('puts the gain on money at work first, so the page agrees with the tables', () => {
    expect(headlineReturn({ twrPct: 0.93, investedReturnPct: 1.78 })).toEqual({ pct: 1.78, basis: 'invested' });
  });

  it('falls back to the time-weighted return when the invested base is too small', () => {
    expect(headlineReturn({ twrPct: 0.93, investedReturnPct: null })).toEqual({ pct: 0.93, basis: 'twr' });
  });

  it('keeps a legitimate 0 % as a figure, never as missing', () => {
    expect(headlineReturn({ twrPct: 0, investedReturnPct: 0 })).toEqual({ pct: 0, basis: 'invested' });
  });

  it('returns nothing when neither figure can be computed', () => {
    expect(headlineReturn({ twrPct: null, investedReturnPct: null })).toBeNull();
    expect(headlineReturn(null)).toBeNull();
  });
});

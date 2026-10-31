import { describe, expect, it } from 'vitest';
import { dayChangePercent, dayGreeting } from './day-greeting';

describe('dayChangePercent', () => {
  it('rates a small day loss on the financial wealth, not on the tracked securities alone', () => {
    // The mistake fixed earlier: -28 EUR over ~1.5k EUR of ETFs read -1.79 %;
    // over the 44 238 EUR financial wealth it is about -0.063 %.
    expect(dayChangePercent(-28, 44238)).toBeCloseTo(-0.0633, 3);
  });

  it('gives 0 rather than a misleading figure when the base is too small to divide by', () => {
    expect(dayChangePercent(10, 0)).toBe(0);
    expect(dayChangePercent(10, 0.5)).toBe(0);
  });

  it('never returns a non-finite number', () => {
    expect(dayChangePercent(Number.NaN, 1000)).toBe(0);
    expect(dayChangePercent(Number.POSITIVE_INFINITY, 1000)).toBe(0);
  });
});

describe('dayGreeting', () => {
  it('says the wealth gains, in the gain tone, with the amount and its percentage', () => {
    expect(dayGreeting(120, 10000)).toEqual({ verb: 'gagne', tone: 'gain', amount: 120, pct: 1.2 });
  });

  it('says the wealth loses, in the loss tone, with the absolute amount and a negative percentage', () => {
    const greeting = dayGreeting(-28, 44238);
    expect(greeting.verb).toBe('perd');
    expect(greeting.tone).toBe('loss');
    expect(greeting.amount).toBe(28);
    expect(greeting.pct).toBeCloseTo(-0.0633, 3);
  });

  it('keeps a flat day in the gain wording and tone, as the page always did', () => {
    expect(dayGreeting(0, 44238)).toEqual({ verb: 'gagne', tone: 'gain', amount: 0, pct: 0 });
  });
});

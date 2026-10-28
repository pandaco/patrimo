import { describe, expect, it } from 'vitest';
import { Envelope } from './models';
import { unrealizedPlusValue, unrealizedPlusValueMulti, unrealizedPnlPct, unrealizedPnlPctMulti } from './envelope.metrics';

function envelope(value: number, cash: number, invested: number): Envelope {
  return { value, cash, invested } as Envelope;
}

describe('unrealizedPlusValue', () => {
  it('measures securities against their cost, leaving idle cash out', () => {
    // 1 000 € of ETFs bought 800 €, 300 € still waiting to be invested.
    const pea = envelope(1_300, 300, 800);
    expect(unrealizedPlusValue(pea)).toBe(200);
    expect(unrealizedPnlPct(pea)).toBeCloseTo(25, 5);
  });

  it('measures a declared balance against the money put in', () => {
    // Livret A entered as 22 950 € (all cash) for 21 800 € deposited: +1 150 €, not −21 800 €.
    const livret = envelope(22_950, 22_950, 21_800);
    expect(unrealizedPlusValue(livret)).toBe(1_150);
    expect(unrealizedPnlPct(livret)).toBeCloseTo((1_150 / 21_800) * 100, 5);
  });

  it('reports no plus-value on an envelope whose positions were all sold', () => {
    const sold = envelope(1_200, 1_200, 0);
    expect(unrealizedPlusValue(sold)).toBe(0);
    expect(unrealizedPnlPct(sold)).toBe(0);
  });

  it('adds declared balances and securities in the family figures', () => {
    const family = [envelope(1_300, 300, 800), envelope(22_950, 22_950, 21_800)];
    expect(unrealizedPlusValueMulti(family)).toBe(1_350);
    expect(unrealizedPnlPctMulti(family)).toBeCloseTo((1_350 / 22_600) * 100, 5);
  });
});

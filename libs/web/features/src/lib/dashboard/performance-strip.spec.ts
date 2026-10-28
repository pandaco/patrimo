import { describe, expect, it } from 'vitest';
import { PositionVariationDto } from '@patrimo/contracts';
import { sortStripPositions } from './performance-strip';

function position(id: string, variation: number, variationPct: number | null): PositionVariationDto {
  return { id, label: id, value: 1_000, pnl: 0, pnlPct: null, variation, variationPct, byEnvelope: [] };
}

// A big line with a small % and a small line with a big %: € and % orders differ.
const world    = position('world', 300, 3);
const smallCap = position('small-cap', 80, 16);
const bonds    = position('bonds', -50, -2);
const fresh    = position('fresh', 0, null);

describe('sortStripPositions', () => {
  it('defaults to best-to-worst in euros', () => {
    expect(sortStripPositions([bonds, smallCap, world], 'eur', 'best').map(p => p.id))
      .toEqual(['world', 'small-cap', 'bonds']);
  });

  it('ranks by percentage when asked', () => {
    expect(sortStripPositions([bonds, world, smallCap], 'pct', 'best').map(p => p.id))
      .toEqual(['small-cap', 'world', 'bonds']);
  });

  it('puts the worst performer first in worst-to-best order', () => {
    expect(sortStripPositions([world, bonds, smallCap], 'eur', 'worst').map(p => p.id))
      .toEqual(['bonds', 'small-cap', 'world']);
    expect(sortStripPositions([world, bonds, smallCap], 'pct', 'worst').map(p => p.id))
      .toEqual(['bonds', 'world', 'small-cap']);
  });

  it('keeps a position whose period is not computable last, in every order', () => {
    for (const by of ['eur', 'pct'] as const) {
      for (const order of ['best', 'worst'] as const) {
        expect(sortStripPositions([fresh, world, bonds], by, order).at(-1)?.id).toBe('fresh');
      }
    }
  });
});

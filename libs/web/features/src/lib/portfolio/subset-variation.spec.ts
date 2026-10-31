import { describe, expect, it } from 'vitest';
import { subsetVariation } from './subset-variation';

describe('subsetVariation', () => {
  it('rebuilds the percentage of a two-position subset from the gains and the capital bases', () => {
    // (+40 − 50) ÷ (400 + 500) = −1.11 % — worked out by hand, not by the helper's own formula.
    expect(subsetVariation([
      { variation: 40,  capitalBase: 400 },
      { variation: -50, capitalBase: 500 },
    ])).toEqual({ variation: -10, variationPct: -1.11 });
  });

  it('gives a single position its own percentage', () => {
    expect(subsetVariation([{ variation: 25, capitalBase: 50 }])).toEqual({ variation: 25, variationPct: 50 });
  });

  it('keeps the euro gain but withholds the percentage when the combined base is too small to divide by', () => {
    expect(subsetVariation([{ variation: 0.2, capitalBase: 0.5 }])).toEqual({ variation: 0.2, variationPct: null });
  });

  it('ignores lines with nothing measurable, such as a declared value', () => {
    expect(subsetVariation([
      { variation: 40,   capitalBase: 400 },
      { variation: null, capitalBase: null },
    ])).toEqual({ variation: 40, variationPct: 10 });
  });

  it('returns nothing for an empty subset or one with nothing measurable', () => {
    expect(subsetVariation([])).toEqual({ variation: null, variationPct: null });
    expect(subsetVariation([{ variation: null, capitalBase: null }])).toEqual({ variation: null, variationPct: null });
  });
});

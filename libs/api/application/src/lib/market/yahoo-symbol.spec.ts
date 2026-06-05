import { toYahooSymbol } from './yahoo-symbol';

describe('toYahooSymbol', () => {
  it('maps the seeded ISINs to their hardcoded Yahoo symbol', () => {
    expect(toYahooSymbol('FR0010315770', 'ESE')).toBe('ESE.PA');
    expect(toYahooSymbol('IE00B4L5Y983', 'IWDA')).toBe('IWDA.AS');
    expect(toYahooSymbol('IE00BJZ2DD79', 'RS2K')).toBe('RS2K.L');
  });

  it('defaults to the Paris Euronext suffix for unknown ISINs', () => {
    expect(toYahooSymbol('FR-UNKNOWN', 'XYZ')).toBe('XYZ.PA');
  });

  it('prefers the override over the fallback even when ticker differs', () => {
    // The map is keyed by ISIN; the ticker arg should not override it.
    expect(toYahooSymbol('FR0010315770', 'WRONG')).toBe('ESE.PA');
  });
});

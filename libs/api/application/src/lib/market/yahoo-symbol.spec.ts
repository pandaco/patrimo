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

  it('keeps a ticker that already carries an exchange suffix as-is', () => {
    // User-added ETFs listed outside Paris pass the full Yahoo symbol in the
    // ticker field; appending .PA on top of it broke every such creation.
    expect(toYahooSymbol('IE00B5BMR087', 'SXR8.DE')).toBe('SXR8.DE');
    expect(toYahooSymbol('IE-UNKNOWN', 'VWCE.MI')).toBe('VWCE.MI');
  });

  it('prefers the override over the fallback even when ticker differs', () => {
    // The map is keyed by ISIN; the ticker arg should not override it.
    expect(toYahooSymbol('FR0010315770', 'WRONG')).toBe('ESE.PA');
  });
});

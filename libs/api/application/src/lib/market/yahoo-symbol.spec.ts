import { toYahooSymbol } from './yahoo-symbol';

describe('toYahooSymbol', () => {
  it('maps the seeded ISINs to their hardcoded Yahoo symbol', () => {
    expect(toYahooSymbol('FR0011550185', 'ESE')).toBe('ESE.PA');
    expect(toYahooSymbol('IE00B4L5Y983', 'IWDA')).toBe('IWDA.AS');
    expect(toYahooSymbol('IE00BJZ2DD79', 'RS2K')).toBe('RS2K.L');
  });

  it('adds .PA to suffix-less tickers when no override exists', () => {
    expect(toYahooSymbol('FR0000000000', 'TOTO')).toBe('TOTO.PA');
    expect(toYahooSymbol('US1234567890', 'AAPL')).toBe('AAPL.PA'); // Still defaults to .PA for now
  });

  it('keeps the existing suffix if the ticker already has one', () => {
    expect(toYahooSymbol('FR0000000000', 'TOTO.MI')).toBe('TOTO.MI');
    expect(toYahooSymbol('US1234567890', 'AAPL.US')).toBe('AAPL.US');
  });

  it('prefers the override over the fallback even when ticker differs', () => {
    // The map is keyed by ISIN; the ticker arg should not override it.
    expect(toYahooSymbol('FR0011550185', 'WRONG')).toBe('ESE.PA');
  });
});

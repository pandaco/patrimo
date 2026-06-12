// Yahoo Finance uses ticker symbols with an exchange suffix (.PA, .L, .AS …)
// rather than ISINs. Hardcode the mapping for the ETFs we seed; for any user-
// added ETF we fall back to `<ticker>.PA` (Paris Euronext is where most of
// the French retail ETFs are listed) — the caller silently degrades to a
// `null` quote when the symbol is rejected.
const YAHOO_OVERRIDES: Record<string, string> = {
  'FR0010315770': 'ESE.PA',
  'FR0010261198': 'CW8.PA',
  'LU1681043599': 'PCEU.PA',
  'LU1681045370': 'PAEEM.PA',
  'IE00BJZ2DD79': 'RS2K.L',
  'FR0011550185': 'EWLD.PA',
  'IE00B4L5Y983': 'IWDA.AS',
  'FR0013412020': 'OBLI.PA',
};

export function toYahooSymbol(isin: string, ticker: string): string {
  const override = YAHOO_OVERRIDES[isin];
  if (override) return override;
  // A ticker that already carries an exchange suffix (`SXR8.DE`, `IWDA.AS`)
  // is a complete Yahoo symbol — only suffix-less tickers default to Paris.
  return ticker.includes('.') ? ticker : `${ticker}.PA`;
}

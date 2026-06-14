export type EtfAllocationDto = 'Core' | 'Satellite' | 'Obligations' | 'Matières premières';

export interface EtfDto {
  isin: string;
  ticker: string;
  name: string;
  issuer: string;
  index: string;
  ter: number;
  currency: string;
  repli: string;
  distrib: string;
  pea: boolean;
  alloc: EtfAllocationDto;
  /** Followed without a position — excluded from portfolio analytics. */
  watchOnly: boolean;
}

/** One Yahoo Finance candidate returned by `GET /etfs/lookup?query=…`. */
export interface EtfLookupResultDto {
  /** Full Yahoo symbol with its exchange suffix, e.g. `SXR8.DE`. */
  symbol:   string;
  name:     string;
  exchange: string;
  /** Yahoo quote type, e.g. `ETF`, `EQUITY`. */
  type:     string;
  currency: string | null;
  price:    number | null;
  /** Annual fee in percent when Yahoo discloses it — pre-fills the form, always worth checking against the KID. */
  ter:      number | null;
}

/**
 * User-supplied ETF for the catalog. The backend validates the symbol
 * against Yahoo Finance before accepting it; metadata Yahoo cannot provide
 * reliably (TER, index, distribution policy) is entered manually.
 */
export interface CreateEtfDto {
  /** 12-character ISIN, e.g. `IE00B4L5Y983`. */
  isin: string;
  /** Exchange ticker used for the Yahoo lookup, e.g. `IWDA`. */
  ticker: string;
  name: string;
  issuer?: string;
  index?: string;
  /** Annual fee in percent, e.g. `0.20` for 0.20 %. */
  ter: number;
  currency: string;
  repli?: string;
  distrib: string;
  pea: boolean;
  alloc: EtfAllocationDto;
}

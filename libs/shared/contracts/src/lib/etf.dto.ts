export type EtfAllocationDto = 'Core' | 'Satellite' | 'Obligations';

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

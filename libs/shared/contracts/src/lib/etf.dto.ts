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

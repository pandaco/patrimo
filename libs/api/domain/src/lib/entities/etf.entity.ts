export type EtfAllocation = 'Core' | 'Satellite' | 'Obligations';

export interface Etf {
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
  alloc: EtfAllocation;
  createdAt: Date;
  updatedAt: Date;
}

export type EtfSeed = Omit<Etf, 'createdAt' | 'updatedAt'>;

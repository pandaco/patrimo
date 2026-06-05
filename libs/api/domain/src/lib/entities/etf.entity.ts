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
  exposure?: {
    geo: Record<string, number>;
    sector: Record<string, number>;
    currency: Record<string, number>;
  };
  createdAt: Date;
  updatedAt: Date;
}

export type EtfSeed = Omit<Etf, 'createdAt' | 'updatedAt'>;

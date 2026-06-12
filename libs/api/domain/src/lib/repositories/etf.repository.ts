import { Etf, EtfSeed } from '../entities/etf.entity';

export const ETF_REPOSITORY = 'ETF_REPOSITORY';

export interface EtfRepository {
  findAll(): Promise<Etf[]>;
  findByIsin(isin: string): Promise<Etf | null>;
  upsert(seed: EtfSeed): Promise<Etf>;
  updateExposure(isin: string, exposure: Etf['exposure']): Promise<void>;
  setWatchOnly(isin: string, watchOnly: boolean): Promise<void>;
  deleteByIsin(isin: string): Promise<void>;
}

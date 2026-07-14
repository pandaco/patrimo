import { DataSource } from 'typeorm';
import { TypeOrmEtfRepository } from './typeorm-etf.repository';
import { EtfOrmEntity } from '../orm-entities/etf.orm-entity';
import { createIntegrationDataSource, truncateAllTables } from '../testing/integration-harness';

const SEED = {
  isin: 'IE00B5BMR087',
  ticker: 'SXR8.DE',
  name: 'iShares Core S&P 500 UCITS',
  issuer: 'iShares',
  index: 'S&P 500',
  ter: 0.07,
  currency: 'EUR',
  repli: 'Physique',
  distrib: 'Capitalisant',
  pea: false,
  alloc: 'Core' as const,
};

describe('TypeOrmEtfRepository (integration)', () => {
  let dataSource: DataSource;
  let repository: TypeOrmEtfRepository;

  beforeAll(async () => {
    dataSource = await createIntegrationDataSource();
    repository = new TypeOrmEtfRepository(dataSource.getRepository(EtfOrmEntity));
  }, 30_000);

  afterAll(async () => {
    await dataSource.destroy();
  });

  beforeEach(async () => {
    await truncateAllTables(dataSource);
  });

  it('round-trips a full ETF row, TER included, through upsert', async () => {
    const created = await repository.upsert(SEED);

    expect(created.ter).toBe(0.07);

    const found = await repository.findByIsin(SEED.isin);
    expect(found?.ticker).toBe('SXR8.DE');
    expect(typeof found?.ter).toBe('number');
  });

  it('updates in place on ISIN conflict instead of duplicating', async () => {
    await repository.upsert(SEED);
    await repository.upsert({ ...SEED, name: 'Renamed', ter: 0.05 });

    const all = await repository.findAll();
    expect(all).toHaveLength(1);
    expect(all[0].name).toBe('Renamed');
    expect(all[0].ter).toBe(0.05);
  });

  it('orders findAll by ticker', async () => {
    await repository.upsert({ ...SEED, isin: 'IE00B4L5Y983', ticker: 'IWDA.AS' });
    await repository.upsert(SEED); // SXR8.DE
    await repository.upsert({ ...SEED, isin: 'FR0010315770', ticker: 'ESE' });

    const tickers = (await repository.findAll()).map(e => e.ticker);
    expect(tickers).toEqual(['ESE', 'IWDA.AS', 'SXR8.DE']);
  });

  it('deletes by ISIN', async () => {
    await repository.upsert(SEED);

    await repository.deleteByIsin(SEED.isin);
    await expect(repository.findByIsin(SEED.isin)).resolves.toBeNull();
  });
});

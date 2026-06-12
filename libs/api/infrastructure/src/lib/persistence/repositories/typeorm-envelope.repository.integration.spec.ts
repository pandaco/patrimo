import { DataSource } from 'typeorm';
import { TypeOrmEnvelopeRepository } from './typeorm-envelope.repository';
import { EnvelopeOrmEntity } from '../orm-entities/envelope.orm-entity';
import {
  createIntegrationDataSource,
  insertUser,
  truncateAllTables,
} from '../testing/integration-harness';

describe('TypeOrmEnvelopeRepository (integration)', () => {
  let dataSource: DataSource;
  let repository: TypeOrmEnvelopeRepository;
  let userA: string;
  let userB: string;

  beforeAll(async () => {
    dataSource = await createIntegrationDataSource();
    repository = new TypeOrmEnvelopeRepository(dataSource.getRepository(EnvelopeOrmEntity));
  }, 30_000);

  afterAll(async () => {
    await dataSource.destroy();
  });

  beforeEach(async () => {
    await truncateAllTables(dataSource);
    userA = (await insertUser(dataSource)).id;
    userB = (await insertUser(dataSource)).id;
  });

  function seed(userId: string, overrides: Partial<EnvelopeOrmEntity> = {}) {
    return {
      userId,
      code: 'PEA',
      glyph: 'pea',
      label: 'Mon PEA',
      broker: 'Fortuneo',
      value: 22145.4,
      invested: 19200,
      cash: 1145.78,
      openedAt: new Date('2021-08-12'),
      plafond: 150000,
      ...overrides,
    };
  }

  it('round-trips money columns and the plafond as numbers', async () => {
    const created = await repository.create(seed(userA));

    const found = await repository.findById(created.id);
    expect(found?.value).toBe(22145.4);
    expect(found?.invested).toBe(19200);
    expect(found?.cash).toBe(1145.78);
    expect(found?.plafond).toBe(150000);
    expect(typeof found?.cash).toBe('number');
  });

  it('scopes findByUserId to the owner', async () => {
    await repository.create(seed(userA));
    await repository.create(seed(userB, { code: 'CTO', label: 'Mon CTO' }));

    const forA = await repository.findByUserId(userA);
    expect(forA).toHaveLength(1);
    expect(forA[0].code).toBe('PEA');
  });

  it('refuses update and delete from another user', async () => {
    const created = await repository.create(seed(userA));

    await expect(repository.updateForUser(created.id, userB, { cash: 0 })).resolves.toBeNull();
    await expect(repository.deleteForUser(created.id, userB)).resolves.toBe(false);

    const untouched = await repository.findById(created.id);
    expect(untouched?.cash).toBe(1145.78);
  });

  it('updates only the patched fields for the owner', async () => {
    const created = await repository.create(seed(userA));

    const updated = await repository.updateForUser(created.id, userA, { cash: 2000 });
    expect(updated?.cash).toBe(2000);
    expect(updated?.value).toBe(22145.4);
  });
});

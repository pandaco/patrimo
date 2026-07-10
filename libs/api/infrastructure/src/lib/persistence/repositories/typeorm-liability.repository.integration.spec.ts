import { DataSource } from 'typeorm';
import type { LiabilitySeed } from '@patrimo/api-domain';
import { TypeOrmLiabilityRepository } from './typeorm-liability.repository';
import { LiabilityOrmEntity } from '../orm-entities/liability.orm-entity';
import {
  createIntegrationDataSource,
  insertUser,
  truncateAllTables,
} from '../testing/integration-harness';

describe('TypeOrmLiabilityRepository (integration)', () => {
  let dataSource: DataSource;
  let repository: TypeOrmLiabilityRepository;
  let userA: string;
  let userB: string;

  beforeAll(async () => {
    dataSource = await createIntegrationDataSource();
    repository = new TypeOrmLiabilityRepository(dataSource.getRepository(LiabilityOrmEntity));
  }, 30_000);

  afterAll(async () => {
    await dataSource.destroy();
  });

  beforeEach(async () => {
    await truncateAllTables(dataSource);
    userA = (await insertUser(dataSource)).id;
    userB = (await insertUser(dataSource)).id;
  });

  function seed(userId: string, overrides: Partial<LiabilitySeed> = {}): LiabilitySeed {
    return {
      userId,
      label: 'Prêt appartement',
      kind: 'mortgage',
      initialAmount: 200_000,
      currentBalance: 178_450.5,
      ratePct: 3.2,
      monthlyPayment: 950,
      startDate: new Date('2022-03-01'),
      endDate: null,
      ...overrides,
    };
  }

  it('round-trips money columns as numbers', async () => {
    const created = await repository.create(seed(userA));

    expect(created.currentBalance).toBe(178_450.5);
    expect(created.ratePct).toBe(3.2);
    expect(typeof created.monthlyPayment).toBe('number');
    expect(created.endDate).toBeNull();
  });

  it('scopes findByUserId to the owner', async () => {
    await repository.create(seed(userA));
    await repository.create(seed(userB, { label: 'Crédit auto', kind: 'consumer_loan' }));

    const forA = await repository.findByUserId(userA);
    expect(forA).toHaveLength(1);
    expect(forA[0].label).toBe('Prêt appartement');
  });

  it('refuses update and delete from another user', async () => {
    const created = await repository.create(seed(userA));

    await expect(repository.updateForUser(created.id, userB, { currentBalance: 0 })).resolves.toBeNull();
    await expect(repository.deleteForUser(created.id, userB)).resolves.toBe(false);

    const [untouched] = await repository.findByUserId(userA);
    expect(untouched.currentBalance).toBe(178_450.5);
  });

  it('updates only the patched fields for the owner', async () => {
    const created = await repository.create(seed(userA));

    const updated = await repository.updateForUser(created.id, userA, { currentBalance: 175_000 });
    expect(updated?.currentBalance).toBe(175_000);
    expect(updated?.monthlyPayment).toBe(950);
  });
});

import type { TransactionSeed } from '@patrimo/api-domain';
import { DataSource } from 'typeorm';
import { TypeOrmTransactionRepository } from './typeorm-transaction.repository';
import { TransactionOrmEntity } from '../orm-entities/transaction.orm-entity';
import {
  createIntegrationDataSource,
  insertEnvelope,
  insertUser,
  truncateAllTables,
} from '../testing/integration-harness';

describe('TypeOrmTransactionRepository (integration)', () => {
  let dataSource: DataSource;
  let repository: TypeOrmTransactionRepository;
  let userA: string;
  let userB: string;
  let envelopeA: string;
  let envelopeB: string;

  beforeAll(async () => {
    dataSource = await createIntegrationDataSource();
    repository = new TypeOrmTransactionRepository(dataSource.getRepository(TransactionOrmEntity));
  }, 30_000);

  afterAll(async () => {
    await dataSource.destroy();
  });

  beforeEach(async () => {
    await truncateAllTables(dataSource);
    userA = (await insertUser(dataSource)).id;
    userB = (await insertUser(dataSource)).id;
    envelopeA = (await insertEnvelope(dataSource, userA)).id;
    envelopeB = (await insertEnvelope(dataSource, userB)).id;
  });

  function seed(userId: string, envelopeId: string, overrides: Partial<TransactionSeed> = {}): TransactionSeed {
    return {
      userId,
      envelopeId,
      etfIsin: null,
      type: 'DEPOSIT',
      date: new Date('2026-03-15'),
      quantity: 1,
      price: null,
      fees: 0,
      taxes: 0,
      amount: 500,
      transferId: null,
      ...overrides,
    };
  }

  it('round-trips money columns as exact numbers through the decimal transformer', async () => {
    const created = await repository.create(seed(userA, envelopeA, {
      type: 'BUY',
      quantity: 12.345678,
      price: 39.4242,
      fees: 1.99,
      taxes: 0.3,
      amount: 488.61,
    }));

    const found = await repository.findById(created.id);
    expect(found?.quantity).toBe(12.345678);
    expect(found?.price).toBe(39.4242);
    expect(found?.fees).toBe(1.99);
    expect(found?.taxes).toBe(0.3);
    expect(found?.amount).toBe(488.61);
    expect(typeof found?.amount).toBe('number');
  });

  it('returns the date column as a Date, newest first', async () => {
    await repository.create(seed(userA, envelopeA, { date: new Date('2026-01-10') }));
    await repository.create(seed(userA, envelopeA, { date: new Date('2026-04-20') }));

    const rows = await repository.findByUserId(userA);
    expect(rows).toHaveLength(2);
    expect(rows[0].date).toBeInstanceOf(Date);
    expect(rows[0].date.toISOString().slice(0, 10)).toBe('2026-04-20');
  });

  it('scopes findByUserId to the owner', async () => {
    await repository.create(seed(userA, envelopeA));

    await expect(repository.findByUserId(userB)).resolves.toEqual([]);
    await expect(repository.findByUserId(userA)).resolves.toHaveLength(1);
  });

  it('refuses update and delete from another user', async () => {
    const created = await repository.create(seed(userA, envelopeA, { amount: 500 }));

    await expect(repository.updateForUser(created.id, userB, { amount: 1 })).resolves.toBeNull();
    await expect(repository.deleteForUser(created.id, userB)).resolves.toBe(false);

    const untouched = await repository.findById(created.id);
    expect(untouched?.amount).toBe(500);
  });

  it('deletes both legs of a transfer for the owner only', async () => {
    const transferId = '11111111-1111-4111-8111-111111111111';
    await repository.create(seed(userA, envelopeA, { type: 'WITHDRAWAL', transferId }));
    await repository.create(seed(userA, envelopeA, { type: 'DEPOSIT', transferId }));
    await repository.create(seed(userB, envelopeB, { type: 'DEPOSIT', transferId }));

    await expect(repository.deleteByTransferId(transferId, userA)).resolves.toBe(2);
    await expect(repository.findByUserId(userB)).resolves.toHaveLength(1);
  });

  it('createMany persists all rows atomically', async () => {
    const created = await repository.createMany([
      seed(userA, envelopeA, { amount: 100 }),
      seed(userA, envelopeA, { amount: 200 }),
      seed(userA, envelopeA, { amount: 300 }),
    ]);

    expect(created).toHaveLength(3);
    await expect(repository.findByUserId(userA)).resolves.toHaveLength(3);
  });

  it('cascades transaction deletion when the envelope is removed', async () => {
    const created = await repository.create(seed(userA, envelopeA));
    await dataSource.query('DELETE FROM envelopes WHERE id = $1', [envelopeA]);

    await expect(repository.findById(created.id)).resolves.toBeNull();
  });
});

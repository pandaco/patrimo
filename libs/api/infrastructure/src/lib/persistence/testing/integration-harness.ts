import { DataSource } from 'typeorm';
import { buildDataSourceOptions } from '../data-source-options';
import { EnvelopeOrmEntity } from '../orm-entities/envelope.orm-entity';
import { UserOrmEntity } from '../orm-entities/user.orm-entity';

/**
 * Integration-test database harness. Runs against the docker-compose
 * Postgres (`npm run docker:up`), but in a dedicated `patrimo_integration`
 * database so the dev data is never touched. The database is created on
 * first run and migrated to head before every suite.
 */
const ADMIN_URL = process.env['DATABASE_URL'] ?? 'postgres://patrimo:patrimo@localhost:5432/patrimo';
const TEST_DATABASE = 'patrimo_integration';

export async function createIntegrationDataSource(): Promise<DataSource> {
  const admin = new DataSource({ type: 'postgres', url: ADMIN_URL });
  await admin.initialize();
  try {
    const found = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [TEST_DATABASE]);
    // CREATE DATABASE cannot be parameterized; TEST_DATABASE is a local constant.
    if (found.length === 0) await admin.query(`CREATE DATABASE ${TEST_DATABASE}`);
  } finally {
    await admin.destroy();
  }

  const testUrl = ADMIN_URL.replace(/\/[^/]+$/, `/${TEST_DATABASE}`);
  const dataSource = new DataSource({
    ...buildDataSourceOptions(testUrl),
    migrationsRun: true,
  });
  await dataSource.initialize();
  return dataSource;
}

/** Empty every mapped table between tests, FK-safe. */
export async function truncateAllTables(dataSource: DataSource): Promise<void> {
  const tables = dataSource.entityMetadatas.map(m => `"${m.tableName}"`).join(', ');
  await dataSource.query(`TRUNCATE TABLE ${tables} RESTART IDENTITY CASCADE`);
}

let userSequence = 0;

export async function insertUser(dataSource: DataSource, overrides: Partial<UserOrmEntity> = {}): Promise<UserOrmEntity> {
  userSequence++;
  return dataSource.getRepository(UserOrmEntity).save({
    googleId: `google-${userSequence}`,
    email: `user-${userSequence}@test.local`,
    name: `User ${userSequence}`,
    firstName: 'User',
    lastName: String(userSequence),
    initials: 'UT',
    picture: null,
    ...overrides,
  });
}

export async function insertEnvelope(
  dataSource: DataSource,
  userId: string,
  overrides: Partial<EnvelopeOrmEntity> = {},
): Promise<EnvelopeOrmEntity> {
  return dataSource.getRepository(EnvelopeOrmEntity).save({
    userId,
    code: 'PEA',
    glyph: 'pea',
    label: 'Mon PEA',
    broker: 'Fortuneo',
    value: 0,
    invested: 0,
    cash: 0,
    openedAt: new Date('2022-01-01'),
    plafond: null,
    ...overrides,
  });
}

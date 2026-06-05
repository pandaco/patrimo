import { DataSourceOptions } from 'typeorm';
import { AlertReadOrmEntity } from './orm-entities/alert-read.orm-entity';
import { EnvelopeOrmEntity } from './orm-entities/envelope.orm-entity';
import { EtfOrmEntity } from './orm-entities/etf.orm-entity';
import { TransactionOrmEntity } from './orm-entities/transaction.orm-entity';
import { UserOrmEntity } from './orm-entities/user.orm-entity';
import { UserPreferencesOrmEntity } from './orm-entities/user-preferences.orm-entity';
import { Init1780531200000 } from './migrations/1780531200000-Init';
import { UserPreferences1780617600000 } from './migrations/1780617600000-UserPreferences';
import { AlertRead1780704000000 } from './migrations/1780704000000-AlertRead';

export const ORM_ENTITIES = [
  UserOrmEntity,
  UserPreferencesOrmEntity,
  AlertReadOrmEntity,
  EnvelopeOrmEntity,
  EtfOrmEntity,
  TransactionOrmEntity,
] as const;

export const ORM_MIGRATIONS = [Init1780531200000, UserPreferences1780617600000, AlertRead1780704000000];

export function buildDataSourceOptions(databaseUrl: string): DataSourceOptions {
  return {
    type: 'postgres',
    url: databaseUrl,
    entities: [...ORM_ENTITIES],
    migrations: ORM_MIGRATIONS,
    migrationsRun: false,
    synchronize: false,
    logging: false,
  };
}

import { DataSourceOptions } from 'typeorm';
import { EnvelopeOrmEntity } from './orm-entities/envelope.orm-entity';
import { EtfOrmEntity } from './orm-entities/etf.orm-entity';
import { TransactionOrmEntity } from './orm-entities/transaction.orm-entity';
import { UserOrmEntity } from './orm-entities/user.orm-entity';
import { Init1780531200000 } from './migrations/1780531200000-Init';

export const ORM_ENTITIES = [
  UserOrmEntity,
  EnvelopeOrmEntity,
  EtfOrmEntity,
  TransactionOrmEntity,
] as const;

export const ORM_MIGRATIONS = [Init1780531200000];

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

import { DataSourceOptions } from 'typeorm';
import { AlertReadOrmEntity } from './orm-entities/alert-read.orm-entity';
import { AlertRuleOrmEntity } from './orm-entities/alert-rule.orm-entity';
import { EnvelopeOrmEntity } from './orm-entities/envelope.orm-entity';
import { EtfOrmEntity } from './orm-entities/etf.orm-entity';
import { TransactionOrmEntity } from './orm-entities/transaction.orm-entity';
import { UserOrmEntity } from './orm-entities/user.orm-entity';
import { UserPreferencesOrmEntity } from './orm-entities/user-preferences.orm-entity';
import { Init1780531200000 } from './migrations/1780531200000-Init';
import { UserPreferences1780617600000 } from './migrations/1780617600000-UserPreferences';
import { AlertRead1780704000000 } from './migrations/1780704000000-AlertRead';
import { AddEtfExposure1780657093906 } from './migrations/1780657093906-AddEtfExposure';
import { AddAlertRule1780670633581 } from './migrations/1780670633581-AddAlertRule';

export const ORM_ENTITIES = [
  UserOrmEntity,
  UserPreferencesOrmEntity,
  AlertReadOrmEntity,
  AlertRuleOrmEntity,
  EnvelopeOrmEntity,
  EtfOrmEntity,
  TransactionOrmEntity,
] as const;

export const ORM_MIGRATIONS = [
  Init1780531200000,
  UserPreferences1780617600000,
  AlertRead1780704000000,
  AddEtfExposure1780657093906,
  AddAlertRule1780670633581,
];

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

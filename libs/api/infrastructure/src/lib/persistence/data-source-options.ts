import { DataSourceOptions } from 'typeorm';
import { AlertReadOrmEntity } from './orm-entities/alert-read.orm-entity';
import { AlertRuleOrmEntity } from './orm-entities/alert-rule.orm-entity';
import { DcaPlanOrmEntity } from './orm-entities/dca-plan.orm-entity';
import { EnvelopeOrmEntity } from './orm-entities/envelope.orm-entity';
import { EtfOrmEntity } from './orm-entities/etf.orm-entity';
import { TransactionOrmEntity } from './orm-entities/transaction.orm-entity';
import { UserOrmEntity } from './orm-entities/user.orm-entity';
import { UserPreferencesOrmEntity } from './orm-entities/user-preferences.orm-entity';
import { StrategyVersionOrmEntity } from './orm-entities/strategy-version.orm-entity';
import { AuditLogOrmEntity } from './orm-entities/audit-log.orm-entity';
import { Init1780531200000 } from './migrations/1780531200000-Init';
import { UserPreferences1780617600000 } from './migrations/1780617600000-UserPreferences';
import { AlertRead1780640000000 } from './migrations/1780640000000-AlertRead';
import { AddEtfExposure1780657093906 } from './migrations/1780657093906-AddEtfExposure';
import { AddAlertRule1780670633581 } from './migrations/1780670633581-AddAlertRule';
import { AddDcaPlan1780677838544 } from './migrations/1780677838544-AddDcaPlan';
import { AddUiPrefs1781222400000 } from './migrations/1781222400000-AddUiPrefs';
import { AddTransactionTaxes1781308800000 } from './migrations/1781308800000-AddTransactionTaxes';
import { AddBenchmarkPref1781310000000 } from './migrations/1781310000000-AddBenchmarkPref';
import { AddEtfWatchOnly1781311000000 } from './migrations/1781311000000-AddEtfWatchOnly';
import { AddTransferId1781312000000 } from './migrations/1781312000000-AddTransferId';
import { AddStrategyVersion1781400000000 } from './migrations/1781400000000-AddStrategyVersion';
import { AddAuditLog1781500000000 } from './migrations/1781500000000-AddAuditLog';
import { WidenEtfTickerTo201781600000000 } from './migrations/1781600000000-Widen-etf-ticker-to-20';

export const ORM_ENTITIES = [
  UserOrmEntity,
  UserPreferencesOrmEntity,
  AlertReadOrmEntity,
  AlertRuleOrmEntity,
  DcaPlanOrmEntity,
  EnvelopeOrmEntity,
  EtfOrmEntity,
  TransactionOrmEntity,
  StrategyVersionOrmEntity,
  AuditLogOrmEntity,
] as const;

export const ORM_MIGRATIONS = [
  Init1780531200000,
  UserPreferences1780617600000,
  AlertRead1780640000000,
  AddEtfExposure1780657093906,
  AddAlertRule1780670633581,
  AddDcaPlan1780677838544,
  AddUiPrefs1781222400000,
  AddTransactionTaxes1781308800000,
  AddBenchmarkPref1781310000000,
  AddEtfWatchOnly1781311000000,
  AddTransferId1781312000000,
  AddStrategyVersion1781400000000,
  AddAuditLog1781500000000,
  WidenEtfTickerTo201781600000000,
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

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ORM_ENTITIES, buildDataSourceOptions } from './data-source-options';
import {
  ALERT_RULE_REPOSITORY,
  DCA_PLAN_REPOSITORY,
  ENVELOPE_REPOSITORY,
  ETF_REPOSITORY,
  STRATEGY_VERSION_REPOSITORY,
  TRANSACTION_REPOSITORY,
  USER_PREFERENCES_REPOSITORY,
  USER_REPOSITORY,
} from './repository-tokens';
import { TypeOrmAlertRuleRepository } from './repositories/typeorm-alert-rule.repository';
import { TypeOrmDcaPlanRepository } from './repositories/typeorm-dca-plan.repository';
import { TypeOrmStrategyVersionRepository } from './repositories/typeorm-strategy-version.repository';
import { TypeOrmEnvelopeRepository } from './repositories/typeorm-envelope.repository';
import { TypeOrmEtfRepository } from './repositories/typeorm-etf.repository';
import { TypeOrmTransactionRepository } from './repositories/typeorm-transaction.repository';
import { TypeOrmUserPreferencesRepository } from './repositories/typeorm-user-preferences.repository';
import { TypeOrmUserRepository } from './repositories/typeorm-user.repository';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        buildDataSourceOptions(config.getOrThrow<string>('DATABASE_URL')),
    }),
    TypeOrmModule.forFeature([...ORM_ENTITIES]),
  ],
  providers: [
    { provide: USER_REPOSITORY,             useClass: TypeOrmUserRepository },
    { provide: USER_PREFERENCES_REPOSITORY, useClass: TypeOrmUserPreferencesRepository },
    { provide: ENVELOPE_REPOSITORY,         useClass: TypeOrmEnvelopeRepository },
    { provide: ETF_REPOSITORY,              useClass: TypeOrmEtfRepository },
    { provide: TRANSACTION_REPOSITORY,      useClass: TypeOrmTransactionRepository },
    { provide: ALERT_RULE_REPOSITORY,       useClass: TypeOrmAlertRuleRepository },
    { provide: DCA_PLAN_REPOSITORY,         useClass: TypeOrmDcaPlanRepository },
    { provide: STRATEGY_VERSION_REPOSITORY, useClass: TypeOrmStrategyVersionRepository },
  ],
  exports: [
    USER_REPOSITORY,
    USER_PREFERENCES_REPOSITORY,
    ENVELOPE_REPOSITORY,
    ETF_REPOSITORY,
    TRANSACTION_REPOSITORY,
    ALERT_RULE_REPOSITORY,
    DCA_PLAN_REPOSITORY,
    STRATEGY_VERSION_REPOSITORY,
  ],
})
export class PersistenceModule {}

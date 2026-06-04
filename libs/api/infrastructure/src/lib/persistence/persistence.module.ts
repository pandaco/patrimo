import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  ENVELOPE_REPOSITORY,
  ETF_REPOSITORY,
  TRANSACTION_REPOSITORY,
  USER_REPOSITORY,
} from 'api-domain';
import { ORM_ENTITIES, buildDataSourceOptions } from './data-source-options';
import { TypeOrmEnvelopeRepository } from './repositories/typeorm-envelope.repository';
import { TypeOrmEtfRepository } from './repositories/typeorm-etf.repository';
import { TypeOrmTransactionRepository } from './repositories/typeorm-transaction.repository';
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
    { provide: USER_REPOSITORY,        useClass: TypeOrmUserRepository },
    { provide: ENVELOPE_REPOSITORY,    useClass: TypeOrmEnvelopeRepository },
    { provide: ETF_REPOSITORY,         useClass: TypeOrmEtfRepository },
    { provide: TRANSACTION_REPOSITORY, useClass: TypeOrmTransactionRepository },
  ],
  exports: [USER_REPOSITORY, ENVELOPE_REPOSITORY, ETF_REPOSITORY, TRANSACTION_REPOSITORY],
})
export class PersistenceModule {}

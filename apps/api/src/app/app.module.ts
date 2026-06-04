import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PersistenceModule } from 'infrastructure';
import { AlertModule } from './alerts/alert.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { EnvelopeModule } from './envelopes/envelope.module';
import { EtfModule } from './etfs/etf.module';
import { MarketModule } from './market/market.module';
import { PortfolioModule } from './portfolio/portfolio.module';
import { TransactionModule } from './transactions/transaction.module';
import { validateEnv } from './env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnv,
    }),
    ScheduleModule.forRoot(),
    PersistenceModule,
    AuthModule,
    EnvelopeModule,
    EtfModule,
    TransactionModule,
    MarketModule,
    PortfolioModule,
    AlertModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

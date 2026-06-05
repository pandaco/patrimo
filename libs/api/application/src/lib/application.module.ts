import { Module } from '@nestjs/common';
import { AlertModule } from './alerts/alert.module';
import { AuthModule } from './auth/auth.module';
import { EnvelopeModule } from './envelopes/envelope.module';
import { EtfModule } from './etfs/etf.module';
import { MarketModule } from './market/market.module';
import { PerformanceModule } from './performance/performance.module';
import { PortfolioModule } from './portfolio/portfolio.module';
import { PreferencesModule } from './preferences/preferences.module';
import { TransactionModule } from './transactions/transaction.module';

@Module({
  imports: [
    AuthModule,
    EnvelopeModule,
    EtfModule,
    TransactionModule,
    MarketModule,
    PortfolioModule,
    PerformanceModule,
    PreferencesModule,
    AlertModule,
  ],
  exports: [
    AuthModule,
    EnvelopeModule,
    EtfModule,
    TransactionModule,
    MarketModule,
    PortfolioModule,
    PerformanceModule,
    PreferencesModule,
    AlertModule,
  ],
})
export class ApplicationModule {}

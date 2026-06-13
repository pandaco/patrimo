import { Module } from '@nestjs/common';
import { AlertModule } from './alerts/alert.module';
import { AuthModule } from './auth/auth.module';
import { DcaModule } from './dca/dca.module';
import { EnvelopeModule } from './envelopes/envelope.module';
import { EtfModule } from './etfs/etf.module';
import { MarketModule } from './market/market.module';
import { PerformanceModule } from './performance/performance.module';
import { PortfolioModule } from './portfolio/portfolio.module';
import { PreferencesModule } from './preferences/preferences.module';
import { StrategyModule } from './strategy/strategy.module';
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
    DcaModule,
    StrategyModule,
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
    DcaModule,
    StrategyModule,
  ],
})
export class ApplicationModule {}

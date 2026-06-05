import { Module } from '@nestjs/common';
import { PersistenceModule } from '@patrimo/infrastructure';
import { AuthModule } from '../auth/auth.module';
import { MarketModule } from '../market/market.module';
import { PreferencesModule } from '../preferences/preferences.module';
import { PortfolioController } from './portfolio.controller';
import { PortfolioService } from './portfolio.service';

@Module({
  imports: [PersistenceModule, AuthModule, MarketModule, PreferencesModule],
  controllers: [PortfolioController],
  providers: [PortfolioService],
  exports: [PortfolioService],
})
export class PortfolioModule {}

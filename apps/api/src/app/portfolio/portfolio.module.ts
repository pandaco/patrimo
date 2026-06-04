import { Module } from '@nestjs/common';
import { PersistenceModule } from 'infrastructure';
import { AuthModule } from '../auth/auth.module';
import { MarketModule } from '../market/market.module';
import { PortfolioController } from './portfolio.controller';
import { PortfolioService } from './portfolio.service';

@Module({
  imports: [PersistenceModule, AuthModule, MarketModule],
  controllers: [PortfolioController],
  providers: [PortfolioService],
})
export class PortfolioModule {}

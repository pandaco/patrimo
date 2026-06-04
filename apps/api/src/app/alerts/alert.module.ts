import { Module } from '@nestjs/common';
import { PersistenceModule } from 'infrastructure';
import { AuthModule } from '../auth/auth.module';
import { MarketModule } from '../market/market.module';
import { PortfolioModule } from '../portfolio/portfolio.module';
import { AlertController } from './alert.controller';
import { AlertService } from './alert.service';

@Module({
  imports: [PersistenceModule, AuthModule, MarketModule, PortfolioModule],
  controllers: [AlertController],
  providers: [AlertService],
})
export class AlertModule {}

import { Module } from '@nestjs/common';
import { PersistenceModule } from 'infrastructure';
import { AuthModule } from '../auth/auth.module';
import { MarketModule } from '../market/market.module';
import { PerformanceController } from './performance.controller';
import { PerformanceService } from './performance.service';

@Module({
  imports: [PersistenceModule, AuthModule, MarketModule],
  controllers: [PerformanceController],
  providers: [PerformanceService],
})
export class PerformanceModule {}

import { Module } from '@nestjs/common';
import { PersistenceModule } from '@patrimo/infrastructure';
import { AuthModule } from '../auth/auth.module';
import { MarketModule } from '../market/market.module';
import { PerformanceController } from './performance.controller';
import { PerformanceService } from './performance.service';
import { WealthSnapshotCron } from './wealth-snapshot.cron';

@Module({
  imports: [PersistenceModule, AuthModule, MarketModule],
  controllers: [PerformanceController],
  providers: [PerformanceService, WealthSnapshotCron],
})
export class PerformanceModule {}

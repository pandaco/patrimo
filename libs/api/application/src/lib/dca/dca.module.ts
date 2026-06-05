import { Module } from '@nestjs/common';
import { PersistenceModule } from '@patrimo/infrastructure';
import { AuthModule } from '../auth/auth.module';
import { MarketModule } from '../market/market.module';
import { DcaController } from './dca.controller';
import { DcaService } from './dca.service';
import { DcaExecutorCron } from './dca-executor.cron';

@Module({
  imports: [PersistenceModule, AuthModule, MarketModule],
  controllers: [DcaController],
  providers: [DcaService, DcaExecutorCron],
})
export class DcaModule {}

import { Module } from '@nestjs/common';
import { PersistenceModule } from '@patrimo/infrastructure';
import { AuthModule } from '../auth/auth.module';
import { FxController } from './fx.controller';
import { FxService } from './fx.service';
import { PriceCacheService } from './price-cache.service';
import { PriceService } from './price.service';
import { PriceWarmerCron } from './price-warmer.cron';
import { YahooPriceProvider } from './yahoo-price.provider';

@Module({
  imports: [PersistenceModule, AuthModule],
  controllers: [FxController],
  providers: [PriceCacheService, YahooPriceProvider, PriceService, PriceWarmerCron, FxService],
  exports: [PriceService, FxService],
})
export class MarketModule {}

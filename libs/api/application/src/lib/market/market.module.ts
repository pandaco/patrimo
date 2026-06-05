import { Module } from '@nestjs/common';
import { PersistenceModule } from '@patrimo/infrastructure';
import { PriceCacheService } from './price-cache.service';
import { PriceService } from './price.service';
import { PriceWarmerCron } from './price-warmer.cron';
import { YahooPriceProvider } from './yahoo-price.provider';

@Module({
  imports: [PersistenceModule],
  providers: [PriceCacheService, YahooPriceProvider, PriceService, PriceWarmerCron],
  exports: [PriceService],
})
export class MarketModule {}

import { Module } from '@nestjs/common';
import { PriceCacheService } from './price-cache.service';
import { PriceService } from './price.service';
import { YahooPriceProvider } from './yahoo-price.provider';

@Module({
  providers: [PriceCacheService, YahooPriceProvider, PriceService],
  exports: [PriceService],
})
export class MarketModule {}

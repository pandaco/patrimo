import { Module } from '@nestjs/common';
import { PersistenceModule } from '@patrimo/infrastructure';
import { AuthModule } from '../auth/auth.module';
import { TauxChangeController } from './taux-change.controller';
import { TauxChangeService } from './taux-change.service';
import { PriceCacheService } from './price-cache.service';
import { PriceService } from './price.service';
import { PriceWarmerCron } from './price-warmer.cron';
import { YahooPriceProvider } from './yahoo-price.provider';
import { JustEtfProvider } from './justetf.provider';

@Module({
  imports: [PersistenceModule, AuthModule],
  controllers: [TauxChangeController],
  providers: [PriceCacheService, YahooPriceProvider, JustEtfProvider, PriceService, PriceWarmerCron, TauxChangeService],
  exports: [PriceService, TauxChangeService],
})
export class MarketModule {}

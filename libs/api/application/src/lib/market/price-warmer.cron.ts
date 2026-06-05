import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import type { EtfRepository } from 'api-domain';
import { ETF_REPOSITORY } from 'infrastructure';
import { PriceService } from './price.service';

/**
 * Refreshes the Redis-cached price for every catalog ETF once a day. Run
 * sequentially so a bulky catalog does not hammer Yahoo with parallel
 * requests (and risk rate-limiting), and so a single transient failure
 * does not abort the whole sweep.
 */
@Injectable()
export class PriceWarmerCron {
  private readonly logger = new Logger(PriceWarmerCron.name);

  constructor(
    @Inject(ETF_REPOSITORY) private readonly etfRepo: EtfRepository,
    private readonly priceService: PriceService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_9AM, { name: 'priceWarmer', timeZone: 'Europe/Paris' })
  async refreshAll(): Promise<void> {
    const etfs = await this.etfRepo.findAll();
    if (etfs.length === 0) return;

    this.logger.log(`Pre-warming Yahoo Finance prices for ${etfs.length} ETFs…`);
    let ok = 0;
    for (const etf of etfs) {
      try {
        await this.priceService.refreshQuote(etf.isin, etf.ticker);
        ok++;
      } catch (err) {
        this.logger.warn(`Pre-warm failed for ${etf.ticker}: ${(err as Error).message}`);
      }
    }
    this.logger.log(`Pre-warm done: ${ok}/${etfs.length} quotes refreshed`);
  }
}

import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import type { UserRepository } from '@patrimo/api-domain';
import { USER_REPOSITORY } from '@patrimo/infrastructure';
import { PerformanceService } from './performance.service';

/**
 * Persists one wealth snapshot per user per day (PP8). Runs at 09:15 Paris,
 * right after the 09:00 price pre-warm, so the valuation uses fresh quotes.
 * Delegates to getWealthSeries, whose piggybacked capture is the single
 * write path — interactive chart loads during the day cover any run the
 * server missed while offline.
 */
@Injectable()
export class WealthSnapshotCron {
  private readonly logger = new Logger(WealthSnapshotCron.name);

  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    private readonly performanceService: PerformanceService,
  ) {}

  @Cron('15 9 * * *', { name: 'wealthSnapshot', timeZone: 'Europe/Paris' })
  async captureAll(): Promise<void> {
    const users = await this.userRepository.findAll();
    if (users.length === 0) return;

    this.logger.log(`Capturing wealth snapshots for ${users.length} user(s)…`);
    let ok = 0;
    for (const user of users) {
      try {
        await this.performanceService.getWealthSeries(user.id, '1W');
        ok++;
      } catch (err) {
        this.logger.warn(`Snapshot failed for user ${user.id}: ${(err as Error).message}`);
      }
    }
    this.logger.log(`Wealth snapshots done: ${ok}/${users.length}`);
  }
}

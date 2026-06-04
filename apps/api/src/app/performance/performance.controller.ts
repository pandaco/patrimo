import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { PerformancePeriod, PerformanceSeriesDto } from 'contracts';
import { SessionGuard } from '../auth/session.guard';
import { SessionUser } from '../auth/session-user.decorator';
import { AuthUser } from '../auth/types';
import { PerformanceService } from './performance.service';

const ALLOWED: PerformancePeriod[] = ['1M', '3M', '6M', '1Y', 'YTD'];

@Controller('performance')
@UseGuards(SessionGuard)
export class PerformanceController {
  constructor(private readonly performance: PerformanceService) {}

  @Get('series')
  series(
    @SessionUser() user: AuthUser,
    @Query('period') period?: string,
  ): Promise<PerformanceSeriesDto> {
    const safe: PerformancePeriod = ALLOWED.includes(period as PerformancePeriod)
      ? (period as PerformancePeriod)
      : '6M';
    return this.performance.getSeries(user.id, safe);
  }
}

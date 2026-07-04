import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { EtfStatsDto, FeesYtdDto, PerformanceMetricsDto, PerformancePeriod, PerformanceSeriesDto, WealthSeriesDto, WealthSnapshotDto } from '@patrimo/contracts';
import { SessionGuard } from '../auth/session.guard';
import { SessionUser } from '../auth/session-user.decorator';
import { AuthUser } from '../auth/types';
import { PerformanceService } from './performance.service';

const ALLOWED: PerformancePeriod[] = ['1W', '1M', '3M', '6M', '1Y', 'YTD', '3Y', '5Y', 'MAX'];

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

  @Get('metrics')
  metrics(
    @SessionUser() user: AuthUser,
    @Query('period') period?: string,
  ): Promise<PerformanceMetricsDto> {
    const safe: PerformancePeriod = ALLOWED.includes(period as PerformancePeriod)
      ? (period as PerformancePeriod)
      : '6M';
    return this.performance.getMetrics(user.id, safe);
  }

  @Get('wealth-series')
  wealthSeries(
    @SessionUser() user: AuthUser,
    @Query('period') period?: string,
  ): Promise<WealthSeriesDto> {
    const safe: PerformancePeriod = ALLOWED.includes(period as PerformancePeriod)
      ? (period as PerformancePeriod)
      : '1M';
    return this.performance.getWealthSeries(user.id, safe);
  }

  @Get('wealth-snapshots')
  wealthSnapshots(
    @SessionUser() user: AuthUser,
    @Query('days') days?: string,
  ): Promise<WealthSnapshotDto[]> {
    const parsed = Number(days);
    const safe = Number.isInteger(parsed) && parsed >= 1 && parsed <= 3650 ? parsed : 365;
    return this.performance.getWealthSnapshots(user.id, safe);
  }

  @Get('etf-stats')
  etfStats(@SessionUser() user: AuthUser): Promise<EtfStatsDto[]> {
    return this.performance.getEtfStats(user.id);
  }

  @Get('fees')
  feesYtd(@SessionUser() user: AuthUser): Promise<FeesYtdDto> {
    return this.performance.getFeesYtd(user.id);
  }
}

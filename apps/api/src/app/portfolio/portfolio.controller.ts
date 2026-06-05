import { Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { PositionDto, PortfolioExposureDto, RebalancePlanDto } from 'contracts';
import { SessionGuard } from '../auth/session.guard';
import { SessionUser } from '../auth/session-user.decorator';
import { AuthUser } from '../auth/types';
import { PortfolioService } from './portfolio.service';

@Controller('portfolio')
@UseGuards(SessionGuard)
export class PortfolioController {
  constructor(private readonly portfolio: PortfolioService) {}

  @Get()
  list(@SessionUser() user: AuthUser): Promise<PositionDto[]> {
    return this.portfolio.listForUser(user.id);
  }

  /**
   * Bypass the Redis quote cache and re-fetch every held ETF's price from
   * Yahoo. Returns the refreshed `PositionDto[]` so the client only needs a
   * single round-trip to re-render the dashboard.
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@SessionUser() user: AuthUser): Promise<PositionDto[]> {
    return this.portfolio.refreshForUser(user.id);
  }

  @Get('exposure')
  getExposure(@SessionUser() user: AuthUser): Promise<PortfolioExposureDto> {
    return this.portfolio.calculateExposure(user.id);
  }

  @Get('rebalance')
  getRebalance(@SessionUser() user: AuthUser): Promise<RebalancePlanDto> {
    return this.portfolio.getRebalancePlan(user.id);
  }
}

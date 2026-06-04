import { Controller, Get, UseGuards } from '@nestjs/common';
import { PositionDto } from 'contracts';
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
}

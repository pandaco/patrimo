import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { StrategyVersionDto } from '@patrimo/contracts';
import { SessionGuard } from '../auth/session.guard';
import { SessionUser } from '../auth/session-user.decorator';
import { AuthUser } from '../auth/types';
import { CreateStrategyVersionDtoBody } from './dto/create-strategy-version.dto';
import { StrategyVersionService } from './strategy-version.service';

@Controller('strategy-versions')
@UseGuards(SessionGuard)
export class StrategyController {
  constructor(private readonly strategy: StrategyVersionService) {}

  @Get()
  list(@SessionUser() user: AuthUser): Promise<StrategyVersionDto[]> {
    return this.strategy.list(user.id);
  }

  @Post()
  create(
    @SessionUser() user: AuthUser,
    @Body() body: CreateStrategyVersionDtoBody,
  ): Promise<StrategyVersionDto> {
    return this.strategy.create(user.id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @SessionUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<void> {
    const deleted = await this.strategy.delete(id, user.id);
    if (!deleted) throw new NotFoundException('Strategy version not found');
  }
}

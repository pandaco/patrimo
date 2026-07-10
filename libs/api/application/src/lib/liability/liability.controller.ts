import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { LiabilityDto } from '@patrimo/contracts';
import { SessionGuard } from '../auth/session.guard';
import { SessionUser } from '../auth/session-user.decorator';
import { AuthUser } from '../auth/types';
import { CreateLiabilityDtoBody } from './dto/create-liability.dto';
import { UpdateLiabilityDtoBody } from './dto/update-liability.dto';
import { LiabilityService } from './liability.service';

@Controller('liabilities')
@UseGuards(SessionGuard)
export class LiabilityController {
  constructor(private readonly liabilities: LiabilityService) {}

  @Get()
  list(@SessionUser() user: AuthUser): Promise<LiabilityDto[]> {
    return this.liabilities.listForUser(user.id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @SessionUser() user: AuthUser,
    @Body() body: CreateLiabilityDtoBody,
  ): Promise<LiabilityDto> {
    return this.liabilities.create(user.id, body);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @SessionUser() user: AuthUser,
    @Body() body: UpdateLiabilityDtoBody,
  ): Promise<LiabilityDto> {
    const updated = await this.liabilities.update(id, user.id, body);
    if (!updated) throw new NotFoundException('Liability not found');
    return updated;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @SessionUser() user: AuthUser,
  ): Promise<void> {
    const removed = await this.liabilities.delete(id, user.id);
    if (!removed) throw new NotFoundException('Liability not found');
  }
}

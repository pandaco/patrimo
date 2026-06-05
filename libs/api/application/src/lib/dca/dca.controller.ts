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
  Patch,
  UseGuards,
} from '@nestjs/common';
import { DcaPlanDto, CreateDcaPlanDto, UpdateDcaPlanDto } from '@patrimo/contracts';
import { SessionGuard } from '../auth/session.guard';
import { SessionUser } from '../auth/session-user.decorator';
import { AuthUser } from '../auth/types';
import { DcaService } from './dca.service';

@Controller('dca-plans')
@UseGuards(SessionGuard)
export class DcaController {
  constructor(private readonly dca: DcaService) {}

  @Get()
  list(@SessionUser() user: AuthUser): Promise<DcaPlanDto[]> {
    return this.dca.list(user.id);
  }

  @Post()
  create(
    @SessionUser() user: AuthUser,
    @Body() body: CreateDcaPlanDto,
  ): Promise<DcaPlanDto> {
    return this.dca.create(user.id, body);
  }

  @Patch(':id')
  async update(
    @SessionUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: UpdateDcaPlanDto,
  ): Promise<DcaPlanDto> {
    const updated = await this.dca.update(id, user.id, body);
    if (!updated) throw new NotFoundException('DCA plan not found');
    return updated;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @SessionUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<void> {
    const deleted = await this.dca.delete(id, user.id);
    if (!deleted) throw new NotFoundException('DCA plan not found');
  }
}

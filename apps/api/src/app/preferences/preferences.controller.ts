import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { UpdateUserPreferencesDto, UserPreferencesDto } from 'contracts';
import { SessionGuard } from '../auth/session.guard';
import { SessionUser } from '../auth/session-user.decorator';
import { AuthUser } from '../auth/types';
import { UpdatePreferencesDtoBody } from './dto/update-preferences.dto';
import { PreferencesService } from './preferences.service';

@Controller('users/me/preferences')
@UseGuards(SessionGuard)
export class PreferencesController {
  constructor(private readonly preferences: PreferencesService) {}

  @Get()
  get(@SessionUser() user: AuthUser): Promise<UserPreferencesDto> {
    return this.preferences.get(user.id);
  }

  @Put()
  update(
    @SessionUser() user: AuthUser,
    @Body() body: UpdatePreferencesDtoBody,
  ): Promise<UserPreferencesDto> {
    return this.preferences.update(user.id, body as UpdateUserPreferencesDto);
  }
}

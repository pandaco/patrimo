import { IsBoolean } from 'class-validator';

export class SetWatchOnlyDtoBody {
  @IsBoolean()
  watchOnly!: boolean;
}

import { UserPreferences, UserPreferencesSeed } from '../entities/user-preferences.entity';

export const USER_PREFERENCES_REPOSITORY = 'USER_PREFERENCES_REPOSITORY';

export interface UserPreferencesRepository {
  findByUserId(userId: string): Promise<UserPreferences | null>;
  /** Insert if missing, patch the existing JSON otherwise. */
  upsert(userId: string, partial: Partial<UserPreferencesSeed>): Promise<UserPreferences>;
}

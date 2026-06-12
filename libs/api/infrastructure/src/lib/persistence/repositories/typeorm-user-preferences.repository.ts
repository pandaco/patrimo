import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type {
  AllocationTargets,
  UserPreferences,
  UserPreferencesRepository,
  UserPreferencesSeed,
} from '@patrimo/api-domain';
import { Repository } from 'typeorm';
import { UserPreferencesOrmEntity } from '../orm-entities/user-preferences.orm-entity';

function toDomain(row: UserPreferencesOrmEntity): UserPreferences {
  return {
    userId:          row.userId,
    riskProfile:     row.riskProfile,
    horizonYears:    row.horizonYears,
    monthlyTarget:   row.monthlyTarget,
    displayCurrency: row.displayCurrency,
    uiMode:          row.uiMode,
    onboardingDone:  row.onboardingDone,
    allocationTargets: row.allocationTargets ? (row.allocationTargets as AllocationTargets) : null,
    createdAt:       row.createdAt,
    updatedAt:       row.updatedAt,
  };
}

@Injectable()
export class TypeOrmUserPreferencesRepository implements UserPreferencesRepository {
  constructor(
    @InjectRepository(UserPreferencesOrmEntity)
    private readonly repo: Repository<UserPreferencesOrmEntity>,
  ) {}

  async findByUserId(userId: string): Promise<UserPreferences | null> {
    const row = await this.repo.findOne({ where: { userId } });
    return row ? toDomain(row) : null;
  }

  async upsert(userId: string, partial: Partial<UserPreferencesSeed>): Promise<UserPreferences> {
    let existing = await this.repo.findOne({ where: { userId } });
    if (!existing) {
      existing = this.repo.create({ userId });
    }
    if (partial.riskProfile     !== undefined) existing.riskProfile     = partial.riskProfile;
    if (partial.horizonYears    !== undefined) existing.horizonYears    = partial.horizonYears;
    if (partial.monthlyTarget   !== undefined) existing.monthlyTarget   = partial.monthlyTarget;
    if (partial.displayCurrency !== undefined) existing.displayCurrency = partial.displayCurrency;
    if (partial.uiMode          !== undefined) existing.uiMode          = partial.uiMode;
    if (partial.onboardingDone  !== undefined) existing.onboardingDone  = partial.onboardingDone;
    if (partial.allocationTargets !== undefined) existing.allocationTargets = partial.allocationTargets;
    const saved: UserPreferencesOrmEntity = await this.repo.save(existing);
    return toDomain(saved);
  }
}

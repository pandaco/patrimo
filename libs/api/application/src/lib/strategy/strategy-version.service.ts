import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import {
  STRATEGY_VERSION_REPOSITORY,
  StrategyVersion,
  StrategyVersionRepository,
  USER_PREFERENCES_REPOSITORY,
  UserPreferencesRepository,
} from '@patrimo/api-domain';
import { CreateStrategyVersionDto, StrategyVersionDto } from '@patrimo/contracts';

function toDto(version: StrategyVersion): StrategyVersionDto {
  return {
    id: version.id,
    label: version.label,
    note: version.note,
    targets: version.targets,
    createdAt: version.createdAt.toISOString(),
  };
}

/** 'v3' -> 3, anything unparseable -> 0. */
function labelToNumber(label: string): number {
  const n = Number.parseInt(label.replace(/^v/i, ''), 10);
  return Number.isFinite(n) ? n : 0;
}

@Injectable()
export class StrategyVersionService {
  constructor(
    @Inject(STRATEGY_VERSION_REPOSITORY)
    private readonly repo: StrategyVersionRepository,
    @Inject(USER_PREFERENCES_REPOSITORY)
    private readonly preferences: UserPreferencesRepository,
  ) {}

  async list(userId: string): Promise<StrategyVersionDto[]> {
    const versions = await this.repo.findByUserId(userId);
    return versions.map(toDto);
  }

  /**
   * Snapshot the user's *current* allocation targets as a new version. The
   * snapshot is read server-side from preferences — never trusted from the
   * client — so a version always reflects a state the user actually saved.
   */
  async create(userId: string, input: CreateStrategyVersionDto): Promise<StrategyVersionDto> {
    const prefs = await this.preferences.findByUserId(userId);
    if (!prefs?.allocationTargets) {
      throw new BadRequestException(
        'Aucune allocation cible définie : configurez vos cibles avant d’enregistrer une version.',
      );
    }

    const existing = await this.repo.findByUserId(userId);
    const nextNumber = existing.reduce((max, v) => Math.max(max, labelToNumber(v.label)), 0) + 1;

    const created = await this.repo.create({
      userId,
      label: `v${nextNumber}`,
      note: input.note?.trim() || null,
      targets: prefs.allocationTargets,
    });
    return toDto(created);
  }

  delete(id: string, userId: string): Promise<boolean> {
    return this.repo.delete(id, userId);
  }
}

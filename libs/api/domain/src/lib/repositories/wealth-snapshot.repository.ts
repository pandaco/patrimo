import { WealthSnapshot, WealthSnapshotSeed } from '../entities/wealth-snapshot.entity';

export const WEALTH_SNAPSHOT_REPOSITORY = 'WEALTH_SNAPSHOT_REPOSITORY';

export interface WealthSnapshotRepository {
  /** Snapshots for `userId` ordered by date ascending, optionally from `fromDate` (ISO, inclusive). */
  findByUserId(userId: string, fromDate?: string): Promise<WealthSnapshot[]>;
  /** ISO date of the most recent snapshot, or `null` when none exists yet. */
  findLatestDate(userId: string): Promise<string | null>;
  /** Insert or overwrite the snapshot for (`userId`, `date`) — capture is idempotent per day. */
  upsertForDate(seed: WealthSnapshotSeed): Promise<void>;
}

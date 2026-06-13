import { AllocationTargets } from './user-preferences.entity';

/**
 * An immutable snapshot of the user's allocation targets, captured at a point
 * in time. Lets the user keep a history of how their strategy evolved and read
 * back any past allocation. The snapshot is authoritative server-side: it is
 * taken from the user's current preferences, never supplied by the client.
 */
export interface StrategyVersion {
  id: string;
  userId: string;
  /** Sequential human label: 'v1', 'v2', … assigned at creation. */
  label: string;
  /** Optional free-text note describing the change. */
  note: string | null;
  /** Frozen copy of the allocation targets at capture time. */
  targets: AllocationTargets;
  createdAt: Date;
}

export type StrategyVersionSeed = Omit<StrategyVersion, 'id' | 'createdAt'>;

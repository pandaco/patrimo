import { AllocationTargetsDto } from './user-preferences.dto';

export interface StrategyVersionDto {
  id: string;
  /** Sequential human label: 'v1', 'v2', … */
  label: string;
  note: string | null;
  /** Frozen allocation snapshot at capture time. */
  targets: AllocationTargetsDto;
  /** ISO-8601 timestamp. */
  createdAt: string;
}

export interface CreateStrategyVersionDto {
  /** Optional free-text note describing the change. */
  note?: string;
}

/**
 * End-of-day valuation of a user's whole patrimoine, persisted once per day.
 * Unlike the recomputed wealth series (which replays transactions against
 * whatever price history Yahoo still serves), a snapshot is immutable history:
 * it survives transaction edits and price-source gaps, and gives long-range
 * charts an exact record of what the patrimoine was worth on that day.
 */
export interface WealthSnapshot {
  id: string;
  userId: string;
  /** ISO date (YYYY-MM-DD) — one snapshot per user per day. */
  date: string;
  /** Total patrimoine in EUR, all categories included. */
  total: number;
  /** Value split by wealth category (bourse, livret, immo, crypto, metal, cash). */
  byCategory: Record<string, number>;
  createdAt: Date;
}

export type WealthSnapshotSeed = Omit<WealthSnapshot, 'id' | 'createdAt'>;

/**
 * Canonical envelope glyph vocabulary. The UI (icons, family grouping,
 * bourse/livret totals) matches on these exact values, so the API rejects
 * anything else.
 */
export const ENVELOPE_GLYPHS = [
  'pea',
  'peapme',
  'cto',
  'av',
  'per',
  'pee',
  'livret',
  'crypto',
  'immo',
  'metal',
] as const;

export type EnvelopeGlyphDto = (typeof ENVELOPE_GLYPHS)[number];

export interface EnvelopeDto {
  id: string;
  code: string;
  glyph: string;
  label: string;
  broker: string;
  value: number;
  invested: number;
  cash: number;
  contributed: number;
  /** ISO date (YYYY-MM-DD). */
  openedAt: string;
  plafond: number | null;
}

export interface CreateEnvelopeDto {
  code: string;
  glyph: string;
  label: string;
  broker: string;
  /** ISO date (YYYY-MM-DD). */
  openedAt: string;
  plafond?: number | null;
}

export type UpdateEnvelopeDto = Partial<CreateEnvelopeDto>;

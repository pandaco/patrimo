export interface EnvelopeDto {
  id: string;
  code: string;
  glyph: string;
  label: string;
  broker: string;
  value: number;
  invested: number;
  cash: number;
  /** ISO date (YYYY-MM-DD). */
  openedAt: string;
  plafond: number | null;
}

import type { VariationRowDto } from '@patrimo/contracts';

/**
 * The per-envelope split of one position, for its expanded row. Only worth showing
 * when the instrument sits in several envelopes (a single holding is the row itself)
 * and while the table is not already scoped to one envelope. Biggest holding first;
 * an envelope that sold out during the window comes last with a value of 0.
 */
export function envelopeBreakdown(byEnvelope: readonly VariationRowDto[], scopedToEnvelope: boolean): VariationRowDto[] {
  if (scopedToEnvelope || byEnvelope.length < 2) return [];
  return [...byEnvelope].sort((a, b) => b.value - a.value);
}

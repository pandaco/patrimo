import type { VariationRowDto } from '@patrimo/contracts';
import { describe, expect, it } from 'vitest';
import { envelopeBreakdown } from './envelope-breakdown';

function row(id: string, value: number, variation = 0): VariationRowDto {
  return { id, label: id.toUpperCase(), value, pnl: 0, pnlPct: null, variation, variationPct: null, capitalBase: null };
}

describe('envelopeBreakdown', () => {
  it('lists the envelopes holding the instrument, biggest holding first', () => {
    const rows = envelopeBreakdown([row('cto', 300), row('pea', 700), row('av', 0)], false);
    expect(rows.map(r => r.id)).toEqual(['pea', 'cto', 'av']);
  });

  it('shows nothing for an instrument held in a single envelope: the row already says it all', () => {
    expect(envelopeBreakdown([row('pea', 700)], false)).toEqual([]);
  });

  it('shows nothing once the table is scoped to one envelope', () => {
    expect(envelopeBreakdown([row('pea', 700), row('cto', 300)], true)).toEqual([]);
  });

  it('does not mutate its input', () => {
    const input = [row('cto', 300), row('pea', 700)];
    envelopeBreakdown(input, false);
    expect(input.map(r => r.id)).toEqual(['cto', 'pea']);
  });
});

import { describe, expect, it } from 'vitest';
import { VariationRowDto } from '@patrimo/contracts';
import { sortEnvelopeRows } from './envelope-variation-rows';

function row(id: string, value: number, pnl: number, variation: number | null, variationPct: number | null = 1): VariationRowDto {
  return { id, label: id, value, pnl, pnlPct: null, variation, variationPct };
}

const pea    = row('pea', 10_000, 1_500, 400);
const livret = row('livret', 5_000, 0, 60);
const cto    = row('cto', 2_000, -300, -150);

describe('sortEnvelopeRows', () => {
  it('lists the biggest loser first when sorting by variation ascending', () => {
    const sorted = sortEnvelopeRows([pea, livret, cto], { key: 'variation', direction: 'asc' });
    expect(sorted.map(r => r.id)).toEqual(['cto', 'livret', 'pea']);
  });

  it('sorts by value and by plus-value latente', () => {
    expect(sortEnvelopeRows([cto, pea, livret], { key: 'value', direction: 'desc' }).map(r => r.id))
      .toEqual(['pea', 'livret', 'cto']);
    expect(sortEnvelopeRows([pea, livret, cto], { key: 'pnl', direction: 'asc' }).map(r => r.id))
      .toEqual(['cto', 'livret', 'pea']);
  });

  it('keeps an envelope whose period is not computable last in both directions', () => {
    const fresh = row('fresh', 1_000, 0, null, null);
    expect(sortEnvelopeRows([fresh, pea, cto], { key: 'variation', direction: 'desc' }).at(-1)?.id).toBe('fresh');
    expect(sortEnvelopeRows([fresh, pea, cto], { key: 'variation', direction: 'asc' }).at(-1)?.id).toBe('fresh');
  });

  it('does not mutate its input', () => {
    const rows = [pea, livret, cto];
    sortEnvelopeRows(rows, { key: 'variation', direction: 'asc' });
    expect(rows.map(r => r.id)).toEqual(['pea', 'livret', 'cto']);
  });
});

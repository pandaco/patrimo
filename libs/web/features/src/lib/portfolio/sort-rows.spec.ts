import { describe, expect, it } from 'vitest';
import { nextSort, sortRows } from './sort-rows';

const rows = [
  { name: 'A', variation: 10 },
  { name: 'B', variation: -30 },
  { name: 'C', variation: null },
  { name: 'D', variation: 50 },
];
const byVariation = (row: { variation: number | null }) => row.variation;

describe('sortRows', () => {
  it('puts the biggest gains first in descending order', () => {
    expect(sortRows(rows, byVariation, 'desc').map(r => r.name)).toEqual(['D', 'A', 'B', 'C']);
  });

  it('puts the biggest losers first in ascending order', () => {
    expect(sortRows(rows, byVariation, 'asc').map(r => r.name)).toEqual(['B', 'A', 'D', 'C']);
  });

  it('keeps rows without a value last in both directions', () => {
    expect(sortRows(rows, byVariation, 'desc').at(-1)?.name).toBe('C');
    expect(sortRows(rows, byVariation, 'asc').at(-1)?.name).toBe('C');
  });

  it('does not mutate the input', () => {
    const copy = [...rows];
    sortRows(rows, byVariation, 'asc');
    expect(rows).toEqual(copy);
  });
});

describe('nextSort', () => {
  it('starts a new column in descending order', () => {
    expect(nextSort({ key: 'value', direction: 'desc' }, 'variation')).toEqual({ key: 'variation', direction: 'desc' });
  });

  it('flips the direction when the same column is clicked again', () => {
    expect(nextSort({ key: 'variation', direction: 'desc' }, 'variation')).toEqual({ key: 'variation', direction: 'asc' });
    expect(nextSort({ key: 'variation', direction: 'asc' }, 'variation')).toEqual({ key: 'variation', direction: 'desc' });
  });
});

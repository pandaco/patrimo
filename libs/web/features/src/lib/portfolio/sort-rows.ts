export type SortDirection = 'asc' | 'desc';
export type PositionSortKey = 'value' | 'weight' | 'pnl' | 'variation';

export interface SortState {
  key: PositionSortKey;
  direction: SortDirection;
}

/**
 * Sorts a copy of `rows` by a numeric accessor. Rows whose value is unknown
 * (`null`) always land last, whichever the direction, so a dash never ranks as
 * the "best" or the "worst" line.
 */
export function sortRows<T>(rows: readonly T[], accessor: (row: T) => number | null, direction: SortDirection): T[] {
  const sign = direction === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const left  = accessor(a);
    const right = accessor(b);
    if (left === null && right === null) return 0;
    if (left === null) return 1;
    if (right === null) return -1;
    return sign * (left - right);
  });
}

/** Header click: a new column starts descending (biggest first), the same column flips. */
export function nextSort(current: SortState, key: PositionSortKey): SortState {
  if (current.key !== key) return { key, direction: 'desc' };
  return { key, direction: current.direction === 'desc' ? 'asc' : 'desc' };
}

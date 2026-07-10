import { describe, expect, it } from 'vitest';
import { computeProjection } from './projection';

describe('computeProjection', () => {
  it('returns one point per year plus year 0, starting at the initial value', () => {
    const points = computeProjection(10_000, 0, 0, 5);
    expect(points).toHaveLength(6);
    expect(points[0]).toMatchObject({ year: 0, value: 10_000, contributed: 10_000 });
  });

  it('keeps the value flat when rate is 0 and only contributions grow it', () => {
    const points = computeProjection(1_000, 100, 0, 2);
    expect(points[1].value).toBe(1_000 + 100 * 12);
    expect(points[2].value).toBe(1_000 + 100 * 24);
    expect(points[2].contributed).toBe(points[2].value);
  });

  it('grows the value above total contributions when rate is positive', () => {
    const points = computeProjection(10_000, 200, 7, 10);
    const last = points[points.length - 1];
    expect(last.value).toBeGreaterThan(last.contributed);
  });

  it('derives swrMonthly as 4%/yr of the projected value', () => {
    const points = computeProjection(100_000, 0, 0, 1);
    expect(points[0].swrMonthly).toBeCloseTo((100_000 * 0.04) / 12, 2);
  });
});

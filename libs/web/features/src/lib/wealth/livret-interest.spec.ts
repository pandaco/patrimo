import { describe, expect, it } from 'vitest';
import { computeLivretInterest } from './livret-interest';

describe('computeLivretInterest', () => {
  it('projects interest per regulated account and a blended rate', () => {
    const out = computeLivretInterest([
      { code: 'Livret A', label: 'Livret A', glyph: 'livret', cash: 10000 },
      { code: 'LDDS',     label: 'LDDS',     glyph: 'livret', cash: 5000 },
    ]);
    expect(out.totalAnnualInterest).toBeCloseTo(450); // 10000×3% + 5000×3%
    expect(out.totalCash).toBe(15000);
    expect(out.blendedRatePct).toBeCloseTo(3);
    expect(out.rows[0].code).toBe('Livret A'); // sorted by interest desc
  });

  it('ignores non-livret envelopes and zero-cash accounts', () => {
    const out = computeLivretInterest([
      { code: 'CTO',      label: 'CTO',      glyph: 'cto',    cash: 9999 },
      { code: 'Livret A', label: 'Livret A', glyph: 'livret', cash: 0 },
    ]);
    expect(out.rows).toHaveLength(0);
    expect(out.totalAnnualInterest).toBe(0);
    expect(out.blendedRatePct).toBe(0);
  });

  it('skips a livret-glyph account with an unknown code (no wrong rate)', () => {
    const out = computeLivretInterest([
      { code: 'Livret mystère', label: 'Livret mystère', glyph: 'livret', cash: 5000 },
    ]);
    expect(out.rows).toHaveLength(0);
  });
});

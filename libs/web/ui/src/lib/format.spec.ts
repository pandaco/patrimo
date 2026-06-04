import { describe, expect, it } from 'vitest';
import { fmtDate, fmtEur, fmtNum, fmtPct, fmtPctRaw } from './format';

// Intl.NumberFormat renders FR-locale separators with either NBSP (U+00A0)
// or narrow-NBSP (U+202F) depending on the Node ICU build. The helpers
// normalise both to a regular space, so the assertions below use plain
// spaces and regexes for the locale-variable bits.

describe('fmtEur', () => {
  it('renders a positive number with two decimals and a euro sign', () => {
    expect(fmtEur(1234.56)).toMatch(/^1 234,56\s?€$/);
  });

  it('respects the digits override', () => {
    expect(fmtEur(1000, 0)).toMatch(/^1 000\s?€$/);
  });

  it('handles negative amounts with the FR-locale minus sign', () => {
    expect(fmtEur(-50)).toMatch(/-50,00\s?€$/);
  });
});

describe('fmtNum', () => {
  it('renders a number with the FR-locale thousands and decimal separators', () => {
    expect(fmtNum(1234567.89)).toBe('1 234 567,89');
  });

  it('rounds to the requested digits', () => {
    expect(fmtNum(1.005, 2)).toBe('1,01');
  });
});

describe('fmtPct', () => {
  it('prefixes positive values with a + sign', () => {
    expect(fmtPct(12.3)).toBe('+12,30 %');
  });

  it('leaves negative values with the locale minus sign and no + prefix', () => {
    expect(fmtPct(-12.3)).toBe('-12,30 %');
  });

  it('renders zero as +0', () => {
    expect(fmtPct(0)).toBe('+0,00 %');
  });
});

describe('fmtPctRaw', () => {
  it('renders without the + sign for positive values', () => {
    expect(fmtPctRaw(12.3)).toBe('12,3 %');
  });

  it('defaults to one decimal place', () => {
    expect(fmtPctRaw(1.234)).toBe('1,2 %');
  });
});

describe('fmtDate', () => {
  it('renders an ISO date in the FR short-month format', () => {
    const out = fmtDate('2026-05-12');
    expect(out).toContain('12');
    expect(out).toContain('2026');
    expect(out).toMatch(/[a-zéû]+\.?/i);
  });
});

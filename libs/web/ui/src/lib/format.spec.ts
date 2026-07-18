import { describe, expect, it } from 'vitest';
import { formatDate, formatEuro, formatNumber, formatPercent, formatPercentRaw } from './format';

// Intl.NumberFormat renders FR-locale separators with either NBSP (U+00A0)
// or narrow-NBSP (U+202F) depending on the Node ICU build. The helpers
// normalise both to a regular space, so the assertions below use plain
// spaces and regexes for the locale-variable bits.

describe('formatEuro', () => {
  it('renders a positive number with two decimals and a euro sign', () => {
    expect(formatEuro(1234.56)).toMatch(/^1 234,56\s?€$/);
  });

  it('respects the digits override', () => {
    expect(formatEuro(1000, 0)).toMatch(/^1 000\s?€$/);
  });

  it('handles negative amounts with the FR-locale minus sign', () => {
    expect(formatEuro(-50)).toMatch(/-50,00\s?€$/);
  });
});

describe('formatNumber', () => {
  it('renders a number with the FR-locale thousands and decimal separators', () => {
    expect(formatNumber(1234567.89)).toBe('1 234 567,89');
  });

  it('rounds to the requested digits', () => {
    expect(formatNumber(1.005, 2)).toBe('1,01');
  });
});

describe('formatPercent', () => {
  it('prefixes positive values with a + sign', () => {
    expect(formatPercent(12.3)).toBe('+12,30 %');
  });

  it('leaves negative values with the locale minus sign and no + prefix', () => {
    expect(formatPercent(-12.3)).toBe('-12,30 %');
  });

  it('renders zero as +0', () => {
    expect(formatPercent(0)).toBe('+0,00 %');
  });
});

describe('formatPercentRaw', () => {
  it('renders without the + sign for positive values', () => {
    expect(formatPercentRaw(12.3)).toBe('12,3 %');
  });

  it('defaults to one decimal place', () => {
    expect(formatPercentRaw(1.234)).toBe('1,2 %');
  });
});

describe('formatDate', () => {
  it('renders an ISO date in the FR short-month format', () => {
    const out = formatDate('2026-05-12');
    expect(out).toContain('12');
    expect(out).toContain('2026');
    expect(out).toMatch(/[a-zéû]+\.?/i);
  });
});

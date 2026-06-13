/**
 * Projects the annual interest of French regulated savings accounts from the
 * cash they hold. Rates are the regulated 2026 levels; they are a display
 * estimate (not yet user-editable — a known limitation) and only applied to
 * accounts whose code is a known regulated product, so an unknown "livret"
 * never gets a wrong rate silently.
 */

const REGULATED_RATES: Record<string, number> = {
  'Livret A': 0.03,
  'LDDS':     0.03,
  'LEP':      0.05,
  'CEL':      0.02,
  'PEL':      0.0225,
};

export interface LivretInterestRow {
  code: string;
  label: string;
  cash: number;
  ratePct: number;
  annualInterest: number;
}

export interface LivretInterestSummary {
  rows: LivretInterestRow[];
  totalCash: number;
  totalAnnualInterest: number;
  /** Weighted average rate across the listed accounts, in %. */
  blendedRatePct: number;
}

interface EnvelopeLike { code: string; label: string; glyph: string; cash: number }

export function computeLivretInterest(envelopes: EnvelopeLike[]): LivretInterestSummary {
  const rows: LivretInterestRow[] = envelopes
    .filter(e => e.glyph === 'livret' && REGULATED_RATES[e.code] !== undefined && e.cash > 0)
    .map(e => {
      const rate = REGULATED_RATES[e.code];
      return {
        code: e.code,
        label: e.label,
        cash: e.cash,
        ratePct: Number((rate * 100).toFixed(2)),
        annualInterest: Number((e.cash * rate).toFixed(2)),
      };
    })
    .sort((a, b) => b.annualInterest - a.annualInterest);

  const totalCash = rows.reduce((a, r) => a + r.cash, 0);
  const totalAnnualInterest = Number(rows.reduce((a, r) => a + r.annualInterest, 0).toFixed(2));
  const blendedRatePct = totalCash > 0
    ? Number(((totalAnnualInterest / totalCash) * 100).toFixed(2))
    : 0;

  return { rows, totalCash, totalAnnualInterest, blendedRatePct };
}

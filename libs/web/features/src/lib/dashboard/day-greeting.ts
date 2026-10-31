export interface DayGreeting {
  /** « gagne » on a flat or positive day, « perd » otherwise. */
  verb: 'gagne' | 'perd';
  /** Colour of the amount and of its percentage. */
  tone: 'gain' | 'loss';
  /** Absolute euro move of the day. */
  amount: number;
  /** Signed day move in %, rated on the financial wealth. */
  pct: number;
}

/**
 * The day move rolled over the whole financial wealth. The euro move comes from
 * priced securities only (livrets and declared balances do not move intraday),
 * so dividing it by the securities alone overstated it ~30x: a −28 € day read
 * −1.79 % on €1.5k of tracked ETFs while the financial wealth is €44k. Under
 * 1 € of base the ratio is noise, and a non-finite result never reaches the page.
 */
export function dayChangePercent(dayValue: number, financialWealth: number): number {
  if (financialWealth < 1) return 0;
  const ratio = (dayValue / financialWealth) * 100;
  return Number.isFinite(ratio) ? ratio : 0;
}

/** What the dashboard greeting sentence says about today. */
export function dayGreeting(dayValue: number, financialWealth: number): DayGreeting {
  const isGain = dayValue >= 0;
  return {
    verb: isGain ? 'gagne' : 'perd',
    tone: isGain ? 'gain' : 'loss',
    amount: Math.abs(dayValue),
    pct: dayChangePercent(dayValue, financialWealth),
  };
}

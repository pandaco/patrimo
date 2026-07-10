export interface ProjectionPoint {
  year: number;
  value: number;
  contributed: number;
  /** Theoretical monthly income at the 4 %/yr safe withdrawal rate. */
  swrMonthly: number;
}

/**
 * Compound-growth projection: `startValue` grows monthly at `annualRatePct`,
 * with `monthlyContribution` added at the end of every month. Not a
 * guarantee — a straight-line assumption on a genuinely volatile return,
 * useful only as an order-of-magnitude "where am I headed" view.
 */
export function computeProjection(
  startValue: number,
  monthlyContribution: number,
  annualRatePct: number,
  years: number,
): ProjectionPoint[] {
  const monthlyRate = annualRatePct / 100 / 12;
  const round = (n: number) => Math.round(n * 100) / 100;

  let value = startValue;
  let contributed = startValue;
  const points: ProjectionPoint[] = [
    { year: 0, value: round(value), contributed: round(contributed), swrMonthly: round((value * 0.04) / 12) },
  ];

  for (let y = 1; y <= years; y++) {
    for (let m = 0; m < 12; m++) {
      value = value * (1 + monthlyRate) + monthlyContribution;
      contributed += monthlyContribution;
    }
    points.push({
      year: y,
      value: round(value),
      contributed: round(contributed),
      swrMonthly: round((value * 0.04) / 12),
    });
  }

  return points;
}

export interface PositionIncomeDto {
  etfIsin: string;
  ticker: string;
  name: string;
  qty: number;
  /** Cost basis (qty × PRU) of the held position. */
  costBasis: number;
  currentValue: number;
  /** Dividends actually received for this line over the trailing 12 months. */
  trailing12mDividends: number;
  /** Trailing 12m dividends ÷ cost basis, in %. */
  yieldOnCostPct: number;
  /** Projected next-12-months income: qty × the fund's annual distribution rate. 0 if capitalising / unknown. */
  forwardAnnualIncome: number;
  /** Forward income ÷ current value, in %. */
  forwardYieldPct: number;
}

export interface IncomeForecastDto {
  positions: PositionIncomeDto[];
  totalTrailing12m: number;
  totalForwardAnnual: number;
  /** Portfolio-level trailing 12m dividends ÷ total cost basis, in %. */
  portfolioYieldOnCostPct: number;
  /** Portfolio-level forward income ÷ total value, in %. */
  portfolioForwardYieldPct: number;
}

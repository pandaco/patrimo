export interface PositionDto {
  etfIsin: string;
  ticker: string;
  name: string;
  qty: number;
  /** PRU — weighted-average buy price. */
  avgPrice: number;
  /** Net invested capital (BUY costs + fees - SELL proceeds). */
  invested: number;
}

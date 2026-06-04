export interface PositionDto {
  etfIsin: string;
  ticker: string;
  name: string;
  qty: number;
  /** PRU — weighted-average buy price. */
  avgPrice: number;
  /** Net invested capital (BUY costs + fees - SELL proceeds). */
  invested: number;
  /** Latest regular-market price from the live provider, or `null` if unknown. */
  currentPrice: number | null;
  /** Previous regular-market close, or `null` if unknown. */
  prevClose: number | null;
}

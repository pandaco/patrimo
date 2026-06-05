export interface DividendDto {
  date: string;       // ISO YYYY-MM-DD (ex-date or pay-date)
  ticker: string;
  name: string;
  amount: number;
  currency: string;
  status: 'ESTIMATED' | 'CONFIRMED' | 'PAID';
}

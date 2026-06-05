import { PositionDto } from './position.dto';

export interface RebalanceTransactionDto {
  etfIsin: string;
  ticker: string;
  name: string;
  action: 'BUY' | 'SELL';
  qty: number;
  price: number;
  amount: number;
  currentWeight: number;
  targetWeight: number;
}

export interface RebalancePlanDto {
  totalValue: number;
  transactions: RebalanceTransactionDto[];
}

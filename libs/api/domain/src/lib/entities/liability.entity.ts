export type LiabilityKind = 'mortgage' | 'consumer_loan' | 'other';

export interface Liability {
  id: string;
  userId: string;
  label: string;
  kind: LiabilityKind;
  initialAmount: number;
  currentBalance: number;
  ratePct: number;
  monthlyPayment: number;
  startDate: Date;
  endDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type LiabilitySeed = Omit<Liability, 'id' | 'createdAt' | 'updatedAt'>;

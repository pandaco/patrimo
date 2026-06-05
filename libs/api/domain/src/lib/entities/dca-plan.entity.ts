export interface DcaPlan {
  id: string;
  userId: string;
  envelopeId: string;
  amount: number;
  frequency: 'MONTHLY'; // Could be expanded later (WEEKLY, etc.)
  dayOfMonth: number;   // 1-28
  allocations: Record<string, number>; // isin -> amount in EUR
  active: boolean;
  nextExecution: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type DcaPlanSeed = Omit<DcaPlan, 'id' | 'createdAt' | 'updatedAt' | 'nextExecution'>;

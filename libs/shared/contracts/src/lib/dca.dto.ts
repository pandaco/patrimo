export interface DcaPlanDto {
  id: string;
  envelopeId: string;
  amount: number;
  frequency: 'MONTHLY';
  dayOfMonth: number;
  allocations: Record<string, number>;
  active: boolean;
  nextExecution: string; // ISO date string (YYYY-MM-DD)
}

export interface CreateDcaPlanDto {
  envelopeId: string;
  amount: number;
  frequency: 'MONTHLY';
  dayOfMonth: number;
  allocations: Record<string, number>;
}

export interface UpdateDcaPlanDto {
  amount?: number;
  frequency?: 'MONTHLY';
  dayOfMonth?: number;
  allocations?: Record<string, number>;
  active?: boolean;
}

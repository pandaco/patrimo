export const LIABILITY_KINDS = ['mortgage', 'consumer_loan', 'other'] as const;

export type LiabilityKindDto = (typeof LIABILITY_KINDS)[number];

export interface LiabilityDto {
  id: string;
  label: string;
  kind: LiabilityKindDto;
  initialAmount: number;
  currentBalance: number;
  ratePct: number;
  monthlyPayment: number;
  /** ISO date (YYYY-MM-DD). */
  startDate: string;
  /** ISO date (YYYY-MM-DD), null if no fixed term. */
  endDate: string | null;
}

export interface CreateLiabilityDto {
  label: string;
  kind: LiabilityKindDto;
  initialAmount: number;
  currentBalance: number;
  ratePct: number;
  monthlyPayment: number;
  /** ISO date (YYYY-MM-DD). */
  startDate: string;
  endDate?: string | null;
}

export type UpdateLiabilityDto = Partial<CreateLiabilityDto>;

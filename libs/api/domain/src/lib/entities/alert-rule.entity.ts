import { AlertType } from '@patrimo/contracts';

export interface AlertRule {
  id: string;
  userId: string;
  type: AlertType;
  threshold: number;
  channels: string[]; // e.g. ['WEB', 'EMAIL']
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type AlertRuleSeed = Omit<AlertRule, 'id' | 'createdAt' | 'updatedAt'>;

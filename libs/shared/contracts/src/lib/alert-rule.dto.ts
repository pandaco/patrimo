import { AlertType } from './alert.dto';

export interface AlertRuleDto {
  id: string;
  type: AlertType;
  threshold: number;
  channels: string[];
  enabled: boolean;
}

export interface CreateAlertRuleDto {
  type: AlertType;
  threshold: number;
  channels: string[];
  enabled?: boolean;
}

export interface UpdateAlertRuleDto {
  threshold?: number;
  channels?: string[];
  enabled?: boolean;
}

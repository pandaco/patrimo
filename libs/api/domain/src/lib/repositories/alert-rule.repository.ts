import { AlertRule, AlertRuleSeed } from '../entities/alert-rule.entity';

export const ALERT_RULE_REPOSITORY = 'ALERT_RULE_REPOSITORY';

export interface AlertRuleRepository {
  findByUserId(userId: string): Promise<AlertRule[]>;
  findById(id: string): Promise<AlertRule | null>;
  create(seed: AlertRuleSeed): Promise<AlertRule>;
  update(id: string, patch: Partial<AlertRuleSeed>): Promise<AlertRule | null>;
  delete(id: string): Promise<boolean>;
}

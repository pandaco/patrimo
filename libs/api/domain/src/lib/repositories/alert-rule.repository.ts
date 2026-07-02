import { AlertRule, AlertRuleSeed } from '../entities/alert-rule.entity';

export const ALERT_RULE_REPOSITORY = 'ALERT_RULE_REPOSITORY';

export interface AlertRuleRepository {
  findByUserId(userId: string): Promise<AlertRule[]>;
  create(seed: AlertRuleSeed): Promise<AlertRule>;
  /** Apply `patch` to the rule iff it belongs to `userId`. */
  updateForUser(id: string, userId: string, patch: Partial<AlertRuleSeed>): Promise<AlertRule | null>;
  /** Delete the rule iff it belongs to `userId`. */
  deleteForUser(id: string, userId: string): Promise<boolean>;
}

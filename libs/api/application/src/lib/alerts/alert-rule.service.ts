import { Inject, Injectable } from '@nestjs/common';
import { AlertRule, AlertRuleRepository, ALERT_RULE_REPOSITORY } from '@patrimo/api-domain';
import { AlertRuleDto, CreateAlertRuleDto, UpdateAlertRuleDto } from '@patrimo/contracts';

function toDto(rule: AlertRule): AlertRuleDto {
  return {
    id: rule.id,
    type: rule.type,
    threshold: rule.threshold,
    channels: rule.channels,
    enabled: rule.enabled,
  };
}

@Injectable()
export class AlertRuleService {
  constructor(
    @Inject(ALERT_RULE_REPOSITORY)
    private readonly repo: AlertRuleRepository,
  ) {}

  async list(userId: string): Promise<AlertRuleDto[]> {
    const rules = await this.repo.findByUserId(userId);
    return rules.map(toDto);
  }

  async create(userId: string, input: CreateAlertRuleDto): Promise<AlertRuleDto> {
    const created = await this.repo.create({
      userId,
      type: input.type,
      threshold: input.threshold,
      channels: input.channels,
      enabled: input.enabled ?? true,
    });
    return toDto(created);
  }

  async update(id: string, userId: string, input: UpdateAlertRuleDto): Promise<AlertRuleDto | null> {
    const rule = await this.repo.findById(id);
    if (!rule || rule.userId !== userId) return null;

    const updated = await this.repo.update(id, input);
    return updated ? toDto(updated) : null;
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const rule = await this.repo.findById(id);
    if (!rule || rule.userId !== userId) return false;
    return this.repo.delete(id);
  }
}

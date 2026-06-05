import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { AlertService } from '@patrimo/data-access';
import { AlertRuleDto, AlertType } from '@patrimo/contracts';

type Tab = 'all' | 'unread' | 'archived';

interface RuleMeta {
  type: AlertType;
  label: string;
  desc: string;
  unit: string;
  defaultThreshold: number;
}

const METAS: RuleMeta[] = [
  { type: 'CASH_IDLE',         label: 'Cash dormant',       desc: 'Alerte si le cash dépasse ce montant', unit: '€', defaultThreshold: 100 },
  { type: 'PLAFOND_NEAR',      label: 'Plafond proche',     desc: 'Alerte si le plafond est atteint à X %', unit: '%', defaultThreshold: 80 },
  { type: 'DIVIDEND_RECENT',   label: 'Dividende reçu',     desc: 'Alerte si reçu il y a moins de X jours', unit: 'j', defaultThreshold: 7 },
  { type: 'PEA_AGE_NEAR',      label: 'Anniversaire PEA',   desc: 'Alerte 5 ans approche', unit: '', defaultThreshold: 1 },
  { type: 'USD_CONCENTRATION', label: 'Concentration USD',  desc: 'Alerte si exposition USD > X %', unit: '%', defaultThreshold: 70 },
];

@Component({
  selector: 'app-alerts',
  standalone: true,
  imports: [],
  templateUrl: './alerts.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlertsComponent {
  private readonly alertSvc = inject(AlertService);

  protected readonly activeTab = signal<Tab>('unread');

  protected readonly filteredAlerts = computed(() => {
    const tab = this.activeTab();
    return this.alertSvc.all().filter(a => {
      if (tab === 'archived') return a.dismissed;
      if (tab === 'unread')   return !a.read && !a.dismissed;
      return !a.dismissed;
    });
  });

  protected readonly tabCounts = computed(() => ({
    all:      this.alertSvc.all().filter(a => !a.dismissed).length,
    unread:   this.alertSvc.all().filter(a => !a.read && !a.dismissed).length,
    archived: this.alertSvc.all().filter(a => a.dismissed).length,
  }));

  protected readonly rulesWithMeta = computed(() => {
    const userRules = this.alertSvc.rules();
    return METAS.map(meta => {
      const rule = userRules.find(r => r.type === meta.type);
      return {
        meta,
        rule,
        id: rule?.id,
        enabled: rule?.enabled ?? false,
        threshold: rule?.threshold ?? meta.defaultThreshold,
      };
    });
  });

  protected setTab(tab: Tab): void {
    this.activeTab.set(tab);
  }

  protected async dismiss(id: string): Promise<void> {
    await this.alertSvc.dismiss(id);
  }

  protected async toggleRule(m: any): Promise<void> {
    if (m.id) {
      await this.alertSvc.updateRule(m.id, { enabled: !m.enabled });
    } else {
      await this.alertSvc.createRule({
        type: m.meta.type,
        threshold: m.meta.defaultThreshold,
        channels: ['WEB'],
        enabled: true,
      });
    }
  }

  protected async editThreshold(m: any): Promise<void> {
    const val = prompt(`Nouveau seuil pour ${m.meta.label} (${m.meta.unit}) ?`, String(m.threshold));
    if (val === null) return;
    const num = parseFloat(val);
    if (isNaN(num)) return;

    if (m.id) {
      await this.alertSvc.updateRule(m.id, { threshold: num });
    } else {
      await this.alertSvc.createRule({
        type: m.meta.type,
        threshold: num,
        channels: ['WEB'],
        enabled: true,
      });
    }
  }

  protected sevIcon(sev: string): string {
    return sev === 'warn' ? '!' : sev === 'gain' ? '✓' : sev === 'loss' ? '✗' : 'i';
  }

  protected sevClass(sev: string): string {
    return sev === 'warn' ? 'warn' : sev === 'gain' ? 'gain' : sev === 'loss' ? 'loss' : 'info';
  }
}

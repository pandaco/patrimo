import { ChangeDetectionStrategy, Component, computed, ElementRef, inject, signal, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AlertService } from '@patrimo/data-access';
import { AlertType } from '@patrimo/contracts';

type Tab = 'all' | 'unread' | 'archived';

interface RuleMeta {
  type: AlertType;
  label: string;
  desc: string;
  unit: string;
  defaultThreshold: number;
}

interface RuleWithMeta {
  meta: RuleMeta;
  id?: string;
  enabled: boolean;
  threshold: number;
}

const METAS: RuleMeta[] = [
  { type: 'CASH_IDLE',         label: 'Cash dormant',       desc: 'Alerte si le cash dépasse ce montant', unit: '€', defaultThreshold: 100 },
  { type: 'PLAFOND_NEAR',      label: 'Plafond proche',     desc: 'Alerte si le plafond est atteint à X %', unit: '%', defaultThreshold: 80 },
  { type: 'DIVIDEND_RECENT',   label: 'Dividende reçu',     desc: 'Alerte si reçu il y a moins de X jours', unit: 'j', defaultThreshold: 7 },
  { type: 'PEA_AGE_NEAR',      label: 'Anniversaire PEA',   desc: 'Alerte 5 ans approche', unit: '', defaultThreshold: 1 },
  { type: 'USD_CONCENTRATION', label: 'Concentration USD',  desc: 'Alerte si exposition USD > X %', unit: '%', defaultThreshold: 70 },
  { type: 'DCA_PENDING',       label: 'DCA mensuel',        desc: 'Alerte si aucun achat ce mois-ci (objectif mensuel configuré)', unit: '', defaultThreshold: 0 },
  { type: 'ALLOCATION_DRIFT',  label: 'Drift allocation',   desc: "Alerte si l'écart Actions/Obligations à ta cible dépasse X points — propose un plan de rééquilibrage", unit: 'pts', defaultThreshold: 5 },
];

@Component({
  selector: 'app-alerts',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './alerts.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlertsComponent {
  private readonly alertService = inject(AlertService);
  @ViewChild('rulesTable', { read: ElementRef }) private rulesTableRef?: ElementRef;

  protected readonly activeTab      = signal<Tab>('unread');
  protected readonly editingType    = signal<AlertType | null>(null);
  protected readonly editingValue   = signal<number>(0);

  protected readonly filteredAlerts = computed(() => {
    const tab = this.activeTab();
    return this.alertService.all().filter(a => {
      if (tab === 'archived') return a.dismissed;
      if (tab === 'unread')   return !a.read && !a.dismissed;
      return !a.dismissed;
    });
  });

  protected readonly tabCounts = computed(() => ({
    all:      this.alertService.all().filter(a => !a.dismissed).length,
    unread:   this.alertService.all().filter(a => !a.read && !a.dismissed).length,
    archived: this.alertService.all().filter(a => a.dismissed).length,
  }));

  protected readonly rulesWithMeta = computed(() => {
    const userRules = this.alertService.rules();
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
    await this.alertService.dismiss(id);
  }

  protected async toggleRule(m: RuleWithMeta): Promise<void> {
    if (m.id) {
      await this.alertService.updateRule(m.id, { enabled: !m.enabled });
    } else {
      await this.alertService.createRule({
        type: m.meta.type,
        threshold: m.meta.defaultThreshold,
        channels: ['WEB'],
        enabled: true,
      });
    }
  }

  protected startEditThreshold(m: RuleWithMeta): void {
    this.editingType.set(m.meta.type);
    this.editingValue.set(m.threshold);
  }

  protected cancelEdit(): void {
    this.editingType.set(null);
  }

  protected async commitEdit(m: RuleWithMeta): Promise<void> {
    const num = this.editingValue();
    if (isNaN(num) || num < 0) return;
    this.editingType.set(null);
    if (m.id) {
      await this.alertService.updateRule(m.id, { threshold: num });
    } else {
      await this.alertService.createRule({ type: m.meta.type, threshold: num, channels: ['WEB'], enabled: true });
    }
  }

  protected async editThreshold(m: RuleWithMeta): Promise<void> {
    this.startEditThreshold(m);
  }

  protected focusNewRule(): void {
    this.rulesTableRef?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const firstDisabled = this.rulesWithMeta().find(m => !m.enabled);
    if (firstDisabled) this.startEditThreshold(firstDisabled);
  }

  protected severityIcon(sev: string): string {
    return sev === 'warn' ? '!' : sev === 'gain' ? '✓' : sev === 'loss' ? '✗' : 'i';
  }

  protected severityClass(sev: string): string {
    return sev === 'warn' ? 'warn' : sev === 'gain' ? 'gain' : sev === 'loss' ? 'loss' : 'info';
  }
}

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { AlertService } from '@patrimo/data-access';

type Tab = 'all' | 'unread' | 'archived';

const RULES = [
  { type:'CASH_IDLE',      label:'Cash dormant',         threshold:'500 € / 30 j',  enabled: true,  channels:'In-app · Email' },
  { type:'DRIFT_ETF',      label:'Drift par ETF',        threshold:'> 5 pts',       enabled: true,  channels:'In-app' },
  { type:'DRIFT_CLASS',    label:'Drift Actions/Oblig',  threshold:'> 10 pts',      enabled: true,  channels:'In-app · Email' },
  { type:'DCA_MISSED',     label:'Mois sans DCA',        threshold:'35 jours',      enabled: true,  channels:'In-app' },
  { type:'PRICE_DROP',     label:'Baisse vs PRU',        threshold:'< −15 %',       enabled: true,  channels:'In-app' },
  { type:'PEA_AGE',        label:'Anniversaire PEA',     threshold:'5 ans, 8 ans',  enabled: true,  channels:'In-app' },
  { type:'CONCENTRATION',  label:'Concentration géo',    threshold:'> 70 %',        enabled: true,  channels:'In-app' },
  { type:'PEA_INELIGIBLE', label:'ETF inéligible PEA',   threshold:'changement',    enabled: true,  channels:'In-app · Email' },
  { type:'DIVIDEND',       label:'Dividende reçu',       threshold:'chaque',        enabled: false, channels:'In-app' },
  { type:'TER_INCREASE',   label:'Hausse de TER',        threshold:'chaque',        enabled: true,  channels:'Email' },
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

  protected readonly activeTab = signal<Tab>('all');
  protected readonly rules = RULES;

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

  protected setTab(tab: Tab): void {
    this.activeTab.set(tab);
  }

  protected async dismiss(id: string): Promise<void> {
    await this.alertSvc.dismiss(id);
  }

  protected sevIcon(sev: string): string {
    return sev === 'warn' ? '!' : sev === 'gain' ? '✓' : sev === 'loss' ? '✗' : 'i';
  }

  protected sevClass(sev: string): string {
    return sev === 'warn' ? 'warn' : sev === 'gain' ? 'gain' : sev === 'loss' ? 'loss' : 'info';
  }
}

import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { AuditLogEntryDto } from '@patrimo/contracts';
import { AuditLogService } from '@patrimo/data-access';

const RESOURCE_LABELS: Record<string, string> = {
  Envelope:    'Enveloppe',
  Transaction: 'Opération',
  Etf:         'ETF',
  Dca:         'Plan DCA',
  Alert:       "Règle d'alerte",
  Preferences: 'Préférences',
  Strategy:    'Version de stratégie',
  Portfolio:   'Portefeuille',
};

const ACTION_LABELS: Record<string, string> = {
  create:  'Création',
  update:  'Modification',
  delete:  'Suppression',
  refresh: 'Rafraîchissement',
};

const ACTIVITY_DATE_FMT = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
});

interface ActivityRow { id: string; label: string; when: string }

@Component({
  selector: 'app-audit-settings',
  standalone: true,
  templateUrl: './audit-settings.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuditSettingsComponent {
  private readonly auditLog = inject(AuditLogService);
  protected readonly activityLoading = this.auditLog.loading;

  protected readonly recentActivity = computed<ActivityRow[]>(() =>
    this.auditLog.all().map((entry: AuditLogEntryDto) => ({
      id:    entry.id,
      label: `${ACTION_LABELS[entry.action] ?? entry.method} · ${RESOURCE_LABELS[entry.resource] ?? entry.resource}`,
      when:  ACTIVITY_DATE_FMT.format(new Date(entry.createdAt)),
    })),
  );
}

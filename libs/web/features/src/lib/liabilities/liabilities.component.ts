import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TauxChangeService, Liability, LiabilityKind, LiabilityService, ToastService } from '@patrimo/data-access';
import { fmtNum } from '@patrimo/ui';

interface LiabilityKindOption { id: LiabilityKind; label: string }

const KIND_OPTIONS: LiabilityKindOption[] = [
  { id: 'mortgage',      label: 'Prêt immobilier' },
  { id: 'consumer_loan', label: 'Crédit conso' },
  { id: 'other',         label: 'Autre' },
];

interface LiabilityForm {
  label: string;
  kind: LiabilityKind;
  initialAmount: number | null;
  currentBalance: number | null;
  ratePct: number | null;
  monthlyPayment: number | null;
  startDate: string;
  endDate: string;
}

function emptyForm(): LiabilityForm {
  return {
    label: '',
    kind: 'mortgage',
    initialAmount: null,
    currentBalance: null,
    ratePct: null,
    monthlyPayment: null,
    startDate: new Date().toISOString().slice(0, 10),
    endDate: '',
  };
}

@Component({
  selector: 'app-liabilities',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './liabilities.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LiabilitiesComponent {
  private readonly liabilityService = inject(LiabilityService);
  private readonly toasts     = inject(ToastService);
  private readonly tauxChangeService  = inject(TauxChangeService);

  protected readonly kindOptions = KIND_OPTIONS;
  protected readonly all      = this.liabilityService.all;
  protected readonly loading  = this.liabilityService.loading;
  protected readonly total    = this.liabilityService.total;

  protected readonly formOpen  = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly form      = signal<LiabilityForm>(emptyForm());
  protected readonly saving    = signal(false);

  protected readonly isEmpty = computed(() => !this.loading() && this.all().length === 0);

  protected readonly fmtEur = (n: number, d = 0): string => this.tauxChangeService.fmt(n, d);
  protected readonly fmtNum = fmtNum;

  protected kindLabel(kind: LiabilityKind): string {
    return KIND_OPTIONS.find(k => k.id === kind)?.label ?? kind;
  }

  protected progressPct(l: Liability): number {
    if (l.initialAmount <= 0) return 0;
    const paid = l.initialAmount - l.currentBalance;
    return Math.max(0, Math.min(100, (paid / l.initialAmount) * 100));
  }

  protected openCreate(): void {
    this.editingId.set(null);
    this.form.set(emptyForm());
    this.formOpen.set(true);
  }

  protected openEdit(l: Liability): void {
    this.editingId.set(l.id);
    this.form.set({
      label: l.label,
      kind: l.kind,
      initialAmount: l.initialAmount,
      currentBalance: l.currentBalance,
      ratePct: l.ratePct,
      monthlyPayment: l.monthlyPayment,
      startDate: l.startDate,
      endDate: l.endDate ?? '',
    });
    this.formOpen.set(true);
  }

  protected cancel(): void {
    this.formOpen.set(false);
  }

  protected async save(): Promise<void> {
    const f = this.form();
    if (!f.label.trim() || f.initialAmount == null || f.currentBalance == null || f.ratePct == null || f.monthlyPayment == null) {
      this.toasts.error('Renseigne tous les champs obligatoires.');
      return;
    }
    this.saving.set(true);
    try {
      const payload = {
        label: f.label.trim(),
        kind: f.kind,
        initialAmount: f.initialAmount,
        currentBalance: f.currentBalance,
        ratePct: f.ratePct,
        monthlyPayment: f.monthlyPayment,
        startDate: f.startDate,
        endDate: f.endDate || null,
      };
      const id = this.editingId();
      if (id) {
        await this.liabilityService.update(id, payload);
        this.toasts.success('Crédit mis à jour.');
      } else {
        await this.liabilityService.create(payload);
        this.toasts.success('Crédit ajouté.');
      }
      this.formOpen.set(false);
    } catch {
      this.toasts.error('Échec de l\'enregistrement.');
    } finally {
      this.saving.set(false);
    }
  }

  protected async remove(l: Liability): Promise<void> {
    try {
      await this.liabilityService.remove(l.id);
      this.toasts.success('Crédit supprimé.');
    } catch {
      this.toasts.error('Échec de la suppression.');
    }
  }
}

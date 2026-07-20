import { ChangeDetectionStrategy, Component, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UpdateUserPreferencesDto } from '@patrimo/contracts';
import { PreferencesService } from '@patrimo/data-access';

@Component({
  selector: 'app-goals-settings',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './goals-settings.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GoalsSettingsComponent {
  protected readonly preferences  = inject(PreferencesService);

  protected goalName   = signal('');
  protected goalTarget = signal<number | null>(50000);

  protected readonly submitting = signal(false);
  protected readonly error      = signal<string | null>(null);
  protected readonly success    = signal(false);

  constructor() {
    const c = this.preferences.current();
    this.goalName.set(c.goalName || '');
    this.goalTarget.set(c.goalTarget || 50000);
  }

  protected async save(): Promise<void> {
    if (this.submitting()) return;
    this.error.set(null);
    this.success.set(false);

    const payload: UpdateUserPreferencesDto = {
      goalName:   this.goalName().trim() || null,
      goalTarget: Math.max(0, this.goalTarget() ?? 0) || null,
    };

    this.submitting.set(true);
    try {
      await this.preferences.update(payload);
      this.success.set(true);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde');
    } finally {
      this.submitting.set(false);
    }
  }

  protected async removeGoal(): Promise<void> {
    if (!confirm('Es-tu sûr de vouloir supprimer ce projet de vie ?')) return;
    this.goalName.set('');
    this.goalTarget.set(null);
    await this.save();
  }
}

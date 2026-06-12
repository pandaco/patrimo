import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PreferencesService, ToastService } from '@patrimo/data-access';

interface RiskChoice {
  value: string;
  label: string;
  desc: string;
  mix: string;
}

const RISK_CHOICES: RiskChoice[] = [
  {
    value: 'Prudent',
    label: 'Prudent',
    desc: 'Je veux éviter les pertes, quitte à gagner moins. Les baisses de marché me stressent.',
    mix: '≈ 30 % actions / 70 % fonds sécurisés',
  },
  {
    value: 'Équilibré',
    label: 'Équilibré',
    desc: 'Je cherche un compromis : de la croissance, mais sans montagnes russes.',
    mix: '≈ 60 % actions / 40 % fonds sécurisés',
  },
  {
    value: 'Dynamique',
    label: 'Dynamique',
    desc: 'J\'investis pour dans 10 ans ou plus. Une baisse temporaire ne me fait pas vendre.',
    mix: '≈ 90 % actions / 10 % fonds sécurisés',
  },
];

@Component({
  selector: 'app-welcome',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './welcome.component.html',
  styleUrl: './welcome.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WelcomeComponent {
  private readonly preferences  = inject(PreferencesService);
  private readonly router = inject(Router);
  private readonly toast  = inject(ToastService);

  protected readonly riskChoices = RISK_CHOICES;

  protected readonly step = signal<1 | 2>(1);

  protected readonly riskProfile   = signal('Équilibré');
  protected readonly horizonYears  = signal(15);
  protected readonly monthlyTarget = signal(200);

  protected readonly submitting = signal(false);

  protected readonly selectedRisk = computed(() =>
    RISK_CHOICES.find((c) => c.value === this.riskProfile()) ?? RISK_CHOICES[1],
  );

  protected next(): void {
    this.step.set(2);
  }

  protected backToStep1(): void {
    this.step.set(1);
  }

  /** Persist the answers, then land on the requested next action. */
  protected async finish(destination: '/wealth' | '/transactions' | '/dashboard'): Promise<void> {
    if (this.submitting()) return;
    this.submitting.set(true);
    try {
      await this.preferences.update({
        riskProfile:    this.riskProfile(),
        horizonYears:   Math.max(0, Math.min(100, Math.round(this.horizonYears()))),
        monthlyTarget:  Math.max(0, this.monthlyTarget()),
        onboardingDone: true,
      });
      this.router.navigateByUrl(destination);
    } catch {
      this.toast.error('Impossible d\'enregistrer tes réponses — réessaie.');
    } finally {
      this.submitting.set(false);
    }
  }

  /** Skip everything: just flag the onboarding as seen. */
  protected async skip(): Promise<void> {
    if (this.submitting()) return;
    this.submitting.set(true);
    try {
      await this.preferences.update({ onboardingDone: true });
    } catch {
      // Non-blocking: the dashboard zero-state still guides the user.
    } finally {
      this.submitting.set(false);
      this.router.navigateByUrl('/dashboard');
    }
  }
}

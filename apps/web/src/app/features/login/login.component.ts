import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from 'data-access';

@Component({
  selector: 'app-login',
  standalone: true,
  template: `
    <div style="display:grid;place-items:center;min-height:100vh;background:var(--paper)">
      <div class="card" style="max-width:400px;width:100%;text-align:center;padding:40px 32px">
        <div class="brand-mark" style="margin:0 auto 20px" aria-hidden="true">P</div>
        <h1 class="page-title" style="font-size:32px;margin-bottom:8px">Patrimo</h1>
        <p class="muted" style="margin-bottom:32px">Ton tracker patrimonial personnel</p>
        @if (errorMessage()) {
          <div role="alert"
               style="margin-bottom:20px;padding:10px 12px;border-radius:8px;background:var(--loss-soft);color:var(--loss);font-size:13px">
            {{ errorMessage() }}
          </div>
        }
        <button
          type="button"
          class="btn primary"
          style="width:100%;justify-content:center;padding:12px 24px;font-size:15px"
          (click)="login()"
        >
          Continuer avec Google
        </button>
        <p class="muted tiny" style="margin-top:16px">Connexion sécurisée OAuth2 · Aucun mot de passe</p>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  private readonly auth   = inject(AuthService);
  private readonly route  = inject(ActivatedRoute);

  private readonly params = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });

  protected readonly errorMessage = computed(() => {
    const error = this.params().get('error');
    if (!error) return null;
    switch (error) {
      case 'oauth_failed':
        return 'La connexion Google a échoué (code expiré ou réutilisé). Réessaye.';
      default:
        return 'Une erreur est survenue lors de la connexion.';
    }
  });

  protected login(): void {
    this.auth.loginWithGoogle();
  }
}

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
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
  private readonly auth = inject(AuthService);

  protected login(): void {
    this.auth.loginWithGoogle();
  }
}

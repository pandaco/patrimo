import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '@patrimo/data-access';

@Component({
  selector: 'app-login',
  standalone: true,
  template: `
    <div style="display:grid;place-items:center;min-height:100vh;background:var(--paper);padding:24px">
      <div class="card" style="max-width:460px;width:100%;padding:40px 32px">
        <div style="text-align:center">
          <div class="brand-mark" style="margin:0 auto 20px" aria-hidden="true">P</div>
          <h1 class="page-title" style="font-size:32px;margin-bottom:8px">Patrimo</h1>
          <p class="muted" style="margin-bottom:28px">
            Le tableau de bord patrimonial pour suivre toutes tes enveloppes
            (PEA, CTO, AV…), tes ETF et ton cash en un seul endroit.
          </p>
        </div>

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
        <p class="muted tiny" style="margin-top:12px;text-align:center">
          Connexion sécurisée OAuth2 · Aucun mot de passe
        </p>

        <div class="divider-soft" style="margin:28px 0 20px"></div>

        <h3 style="font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:var(--ink-3);margin:0 0 14px">
          Comment ça marche
        </h3>
        <ol style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:14px">
          <li style="display:flex;gap:14px;align-items:flex-start">
            <span class="step-num">1</span>
            <div>
              <div style="font-size:13.5px;font-weight:500;color:var(--ink)">Déclare tes enveloppes</div>
              <div class="muted tiny" style="margin-top:2px">
                Saisis tes comptes (PEA, CTO, AV, Livret A…) — nom du courtier
                et solde de départ. Tu peux modifier à tout moment.
              </div>
            </div>
          </li>
          <li style="display:flex;gap:14px;align-items:flex-start">
            <span class="step-num">2</span>
            <div>
              <div style="font-size:13.5px;font-weight:500;color:var(--ink)">Importe ou saisis tes opérations</div>
              <div class="muted tiny" style="margin-top:2px">
                CSV depuis ton broker ou saisie manuelle. Achats, ventes, dividendes,
                versements — chaque opération nourrit le calcul automatique.
              </div>
            </div>
          </li>
          <li style="display:flex;gap:14px;align-items:flex-start">
            <span class="step-num">3</span>
            <div>
              <div style="font-size:13.5px;font-weight:500;color:var(--ink)">Pilote en un coup d'œil</div>
              <div class="muted tiny" style="margin-top:2px">
                Performance vs benchmark, drift d'allocation, alertes de rééquilibrage,
                PV réalisée YTD pour la fiscalité… tout y passe.
              </div>
            </div>
          </li>
        </ol>

        <p class="muted tiny" style="margin-top:24px;text-align:center">
          Patrimo estimation un outil de suivi personnel — pas un conseil
          en investissement.
        </p>
      </div>
    </div>
  `,
  styles: `
    .step-num {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 26px; height: 26px;
      border-radius: 50%;
      background: var(--brand);
      color: #fff;
      font-size: 12.5px;
      font-weight: 600;
      flex-shrink: 0;
    }
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
        return 'Une erreur estimation survenue lors de la connexion.';
    }
  });

  protected login(): void {
    this.auth.loginWithGoogle();
  }
}

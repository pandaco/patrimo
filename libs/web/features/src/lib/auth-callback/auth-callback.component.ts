import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '@patrimo/data-access';

@Component({
  selector: 'app-auth-callback',
  standalone: true,
  template: `<div style="display:grid;place-items:center;min-height:100vh">
    <p class="muted">Connexion en cours…</p>
  </div>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthCallbackComponent implements OnInit {
  private readonly auth   = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route  = inject(ActivatedRoute);

  async ngOnInit(): Promise<void> {
    await this.auth.loadCurrentUser();
    const redirect = this.route.snapshot.queryParamMap.get('redirect') ?? '/dashboard';
    const target = this.auth.isAuthenticated() ? redirect : '/login';
    this.router.navigateByUrl(target, { replaceUrl: true });
  }
}

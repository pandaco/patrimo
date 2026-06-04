import { ChangeDetectionStrategy, Component } from '@angular/core';

// TODO Sprint 1: hydrate AuthService.user from /api/auth/me, then redirect to /dashboard.
@Component({
  selector: 'app-auth-callback',
  standalone: true,
  template: `<div style="display:grid;place-items:center;min-height:100vh">
    <p class="muted">Connexion en cours…</p>
  </div>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthCallbackComponent {}

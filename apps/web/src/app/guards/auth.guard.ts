import { CanActivateFn } from '@angular/router';

// TODO Sprint 1: inject AuthService.isAuthenticated(); redirect to /login otherwise.
export const authGuard: CanActivateFn = () => true;

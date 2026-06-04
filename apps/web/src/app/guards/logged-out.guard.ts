import { CanActivateFn } from '@angular/router';

// TODO Sprint 1: if authenticated, redirect to /dashboard via inject(Router).
export const loggedOutGuard: CanActivateFn = () => true;

import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { API_BASE_URL } from './api-base-url';
import { AuthService } from './auth.service';
import { catchError, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const baseUrl = inject(API_BASE_URL);
  const router  = inject(Router);
  const auth    = inject(AuthService);

  const sameApi = req.url.startsWith(baseUrl) || req.url.startsWith('/api');
  const next$   = sameApi ? next(req.clone({ withCredentials: true })) : next(req);

  return next$.pipe(
    catchError((err: HttpErrorResponse) => {
      if (sameApi && err.status === 401 && !req.url.endsWith('/auth/me')) {
        auth.clearLocal();
        router.navigate(['/login']);
      }
      return throwError(() => err);
    }),
  );
};

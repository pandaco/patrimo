import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from './api-base-url';
import { AuthUser } from './auth.models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http    = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  private readonly _user = signal<AuthUser | null>(null);
  private readonly _loaded = signal(false);

  readonly user            = this._user.asReadonly();
  readonly loaded          = this._loaded.asReadonly();
  readonly isAuthenticated = computed(() => this._user() !== null);

  async loadCurrentUser(): Promise<void> {
    try {
      const user = await firstValueFrom(
        this.http.get<AuthUser>(`${this.baseUrl}/auth/me`, { withCredentials: true }),
      );
      this._user.set(user);
    } catch {
      this._user.set(null);
    } finally {
      this._loaded.set(true);
    }
  }

  loginWithGoogle(): void {
    window.location.href = `${this.baseUrl}/auth/google`;
  }

  async logout(): Promise<void> {
    try {
      await firstValueFrom(
        this.http.post(`${this.baseUrl}/auth/logout`, null, { withCredentials: true }),
      );
    } finally {
      this._user.set(null);
    }
  }

  clearLocal(): void {
    this._user.set(null);
  }
}

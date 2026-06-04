import { Injectable, signal } from '@angular/core';
import { MOCK_USER } from './mock-data';
import { User } from './models';

@Injectable({ providedIn: 'root' })
export class UserService {
  // TODO Sprint 1: replace with computed signal derived from AuthService.user().
  readonly currentUser = signal<User | null>(MOCK_USER);
}

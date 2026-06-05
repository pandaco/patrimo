export interface AuthUser {
  id: string;
  googleId: string;
  email: string;
  name: string;
  firstName: string;
  lastName: string;
  initials: string;
  picture?: string;
}

export const SESSION_COOKIE_NAME = 'patrimo_sid';

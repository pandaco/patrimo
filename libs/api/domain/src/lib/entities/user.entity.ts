export interface User {
  id: string;
  googleId: string;
  email: string;
  name: string;
  firstName: string;
  lastName: string;
  initials: string;
  picture: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type UserSeed = Omit<User, 'id' | 'createdAt' | 'updatedAt'>;

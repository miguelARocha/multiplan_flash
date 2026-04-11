import type { AuthUserRole } from './auth.types';

export interface AuthenticatedUser {
  sub: string;
  email: string;
  role: AuthUserRole;
}

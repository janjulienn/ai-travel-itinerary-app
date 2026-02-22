// Application state types

import type { IUserProfile } from './dtos/auth';

export interface IApplicationState {
  token: string | null;
  refreshToken: string | null;
  user: IUserProfile | null;
  isGuest: boolean;
}

export type ApplicationAction =
  | { type: 'SET_TOKENS'; payload: { access: string; refresh: string } }
  | { type: 'SET_USER'; payload: IUserProfile }
  | { type: 'SET_GUEST'; payload: boolean }
  | { type: 'LOGOUT' };

// Application state types

import type { IUserProfile } from './dtos/auth';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface IApplicationState {
  token: string | null;
  refreshToken: string | null;
  user: IUserProfile | null;
  isGuest: boolean;
  themeMode: ThemeMode;
}

export type ApplicationAction =
  | { type: 'SET_TOKENS'; payload: { access: string; refresh: string } }
  | { type: 'SET_USER'; payload: IUserProfile }
  | { type: 'SET_GUEST'; payload: boolean }
  | { type: 'SET_THEME_MODE'; payload: ThemeMode }
  | { type: 'LOGOUT' };

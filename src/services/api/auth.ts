// Authentication API endpoints

import { apiClient } from './apiClient';
import type {
  IAuthResponse,
  ILoginRequest,
  ILogoutRequest,
  IProfileUpdateRequest,
  IRegisterRequest,
  ISocialLoginRequest,
  ITokenRefreshRequest,
  ITokenRefreshResponse,
  IUserProfile,
} from '../../types/dtos/auth';

export const authApi = {
  /**
   * Register a new user with email + password
   * POST /auth/register/
   */
  register: async (data: IRegisterRequest): Promise<IAuthResponse> => {
    return apiClient.post<IAuthResponse>('/auth/register/', data);
  },

  /**
   * Login with email + password
   * POST /auth/login/
   */
  login: async (data: ILoginRequest): Promise<IAuthResponse> => {
    return apiClient.post<IAuthResponse>('/auth/login/', data);
  },

  /**
   * Social authentication (Google, Facebook)
   * POST /auth/social/
   */
  socialLogin: async (data: ISocialLoginRequest): Promise<IAuthResponse> => {
    return apiClient.post<IAuthResponse>('/auth/social/', data);
  },

  /**
   * Logout - blacklist the refresh token
   * POST /auth/logout/
   */
  logout: async (data: ILogoutRequest): Promise<void> => {
    await apiClient.post<void>('/auth/logout/', data);
  },

  /**
   * Refresh access token using refresh token
   * POST /auth/token/refresh/
   */
  refreshToken: async (data: ITokenRefreshRequest): Promise<ITokenRefreshResponse> => {
    return apiClient.post<ITokenRefreshResponse>('/auth/token/refresh/', data);
  },

  /**
   * Get current user profile
   * GET /auth/me/
   */
  getProfile: async (): Promise<IUserProfile> => {
    return apiClient.get<IUserProfile>('/auth/me/');
  },

  /**
   * Update current user profile
   * PATCH /auth/me/
   */
  updateProfile: async (data: IProfileUpdateRequest): Promise<IUserProfile> => {
    return apiClient.patch<IUserProfile>('/auth/me/', data);
  },
};

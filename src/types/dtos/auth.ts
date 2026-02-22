// Authentication DTOs matching backend serializers

export interface IUserProfile {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  age_group: string;
  travel_style: string;
  social_provider: 'email' | 'google' | 'facebook';
  date_joined: string;
}

export interface IAuthResponse {
  access: string;
  refresh: string;
  user: IUserProfile;
}

export interface IRegisterRequest {
  email: string;
  password: string;
  confirm_password: string;
  first_name?: string;
  last_name?: string;
  age_group?: string;
  travel_style?: string;
}

export interface ILoginRequest {
  email: string;
  password: string;
}

export interface ISocialLoginRequest {
  provider: 'google' | 'facebook';
  id_token: string;
}

export interface ILogoutRequest {
  refresh: string;
}

export interface ITokenRefreshRequest {
  refresh: string;
}

export interface ITokenRefreshResponse {
  access: string;
  refresh: string;
}

export interface IProfileUpdateRequest {
  first_name?: string;
  last_name?: string;
  age_group?: string;
  travel_style?: string;
}

// Global application state management using Context + useReducer

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { IApplicationState, ApplicationAction } from '../types/application';
import type { ThemeMode } from '../types/application';
import type { IAuthResponse } from '../types/dtos/auth';
import { apiClient } from '../services/api/apiClient';
import { authApi } from '../services/api/auth';
import { clearPendingItineraries } from '../services/pendingItineraries';

const TOKEN_STORAGE_KEY = '@ai_travel_itinerary/token';
const REFRESH_TOKEN_STORAGE_KEY = '@ai_travel_itinerary/refresh_token';
const THEME_MODE_STORAGE_KEY = '@ai_travel_itinerary/theme_mode';

// Initial state
const initialState: IApplicationState = {
  token: null,
  refreshToken: null,
  user: null,
  isGuest: true,
  themeMode: 'system',
};

// Reducer
const appReducer = (state: IApplicationState, action: ApplicationAction): IApplicationState => {
  switch (action.type) {
    case 'SET_TOKENS':
      return {
        ...state,
        token: action.payload.access,
        refreshToken: action.payload.refresh,
        isGuest: false,
      };
    case 'SET_USER':
      return {
        ...state,
        user: action.payload,
      };
    case 'SET_GUEST':
      return {
        ...state,
        isGuest: action.payload,
      };
    case 'SET_THEME_MODE':
      return {
        ...state,
        themeMode: action.payload,
      };
    case 'LOGOUT':
      return {
        ...initialState,
        isGuest: true,
        themeMode: state.themeMode,
      };
    default:
      return state;
  }
};

// Context
interface AppContextType {
  state: IApplicationState;
  dispatch: React.Dispatch<ApplicationAction>;
  login: (authResponse: IAuthResponse) => Promise<void>;
  logout: () => Promise<void>;
  continueAsGuest: () => void;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Provider component
export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Load tokens from storage on mount
  useEffect(() => {
    loadTokens();
    loadThemeMode();
  }, []);

  // Save tokens to storage whenever they change
  useEffect(() => {
    if (state.token && state.refreshToken) {
      AsyncStorage.setItem(TOKEN_STORAGE_KEY, state.token);
      AsyncStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, state.refreshToken);
      
      // Set tokens in API client
      apiClient.setTokens(state.token, state.refreshToken);
    } else {
      AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
      AsyncStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
      
      // Clear tokens in API client
      apiClient.clearTokens();
    }
  }, [state.token, state.refreshToken]);

  const loadThemeMode = async () => {
    try {
      const storedThemeMode = await AsyncStorage.getItem(THEME_MODE_STORAGE_KEY);

      if (
        storedThemeMode === 'light' ||
        storedThemeMode === 'dark' ||
        storedThemeMode === 'system'
      ) {
        dispatch({ type: 'SET_THEME_MODE', payload: storedThemeMode });
      }
    } catch (error) {
      console.error('Error loading theme mode:', error);
    }
  };

  const loadTokens = async () => {
    try {
      const token = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
      const refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
      
      if (token && refreshToken) {
        dispatch({ type: 'SET_TOKENS', payload: { access: token, refresh: refreshToken } });
        apiClient.setTokens(token, refreshToken);
        
        // Fetch user profile
        try {
          const user = await authApi.getProfile();
          dispatch({ type: 'SET_USER', payload: user });
        } catch (error) {
          console.error('Error loading user profile:', error);
          // If profile fetch fails, tokens might be invalid - clear them
          await logout();
        }
      }
    } catch (error) {
      console.error('Error loading tokens:', error);
    }
  };

  const login = async (authResponse: IAuthResponse) => {
    const { access, refresh, user } = authResponse;
    
    dispatch({ type: 'SET_TOKENS', payload: { access, refresh } });
    dispatch({ type: 'SET_USER', payload: user });
    
    // Tokens will be saved to AsyncStorage by the useEffect
  };

  const logout = async () => {
    // Try to blacklist the refresh token on the backend
    if (state.refreshToken) {
      try {
        await authApi.logout({ refresh: state.refreshToken });
      } catch (error) {
        console.error('Error during logout:', error);
        // Continue with local logout even if backend call fails
      }
    }
    
    dispatch({ type: 'LOGOUT' });
    await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
    await AsyncStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
    await clearPendingItineraries();
  };

  const continueAsGuest = () => {
    dispatch({ type: 'SET_GUEST', payload: true });
  };

  const setThemeMode = async (mode: ThemeMode) => {
    dispatch({ type: 'SET_THEME_MODE', payload: mode });

    try {
      await AsyncStorage.setItem(THEME_MODE_STORAGE_KEY, mode);
    } catch (error) {
      console.error('Error saving theme mode:', error);
    }
  };

  return (
    <AppContext.Provider value={{ state, dispatch, login, logout, continueAsGuest, setThemeMode }}>
      {children}
    </AppContext.Provider>
  );
};

// Custom hook to use the context
export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

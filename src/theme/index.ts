// Theme configuration for elderly-friendly UX

import { MD3LightTheme, adaptNavigationTheme } from 'react-native-paper';
import { DefaultTheme as NavigationDefaultTheme } from '@react-navigation/native';

// Custom theme with larger fonts and friendly colors
export const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#00897B', // Warm teal
    secondary: '#FF6F00', // Vibrant orange
    tertiary: '#5E35B1', // Purple
    error: '#D32F2F',
    background: '#FAFAFA',
    surface: '#FFFFFF',
    surfaceVariant: '#F5F5F5',
  },
  fonts: {
    ...MD3LightTheme.fonts,
    bodyLarge: {
      ...MD3LightTheme.fonts.bodyLarge,
      fontSize: 18,
    },
    bodyMedium: {
      ...MD3LightTheme.fonts.bodyMedium,
      fontSize: 16,
    },
    bodySmall: {
      ...MD3LightTheme.fonts.bodySmall,
      fontSize: 14,
    },
    headlineSmall: {
      ...MD3LightTheme.fonts.headlineSmall,
      fontSize: 24,
    },
    headlineMedium: {
      ...MD3LightTheme.fonts.headlineMedium,
      fontSize: 28,
    },
    headlineLarge: {
      ...MD3LightTheme.fonts.headlineLarge,
      fontSize: 32,
    },
    titleLarge: {
      ...MD3LightTheme.fonts.titleLarge,
      fontSize: 22,
    },
    titleMedium: {
      ...MD3LightTheme.fonts.titleMedium,
      fontSize: 18,
    },
    labelLarge: {
      ...MD3LightTheme.fonts.labelLarge,
      fontSize: 16,
    },
  },
  roundness: 12,
};

// Adapted navigation theme
const { LightTheme } = adaptNavigationTheme({
  reactNavigationLight: NavigationDefaultTheme,
  materialLight: theme,
});

export const navigationTheme = LightTheme;

// Category colors for activities
export const categoryColors: Record<string, string> = {
  breakfast: '#FF9800', // Orange
  lunch: '#FF5722', // Deep orange
  dinner: '#F44336', // Red
  merienda: '#FFC107', // Amber
  food_trip: '#FFEB3B', // Yellow
  sightseeing: '#2196F3', // Blue
  activity: '#4CAF50', // Green
  nature: '#4CAF50', // Green
  cultural: '#9C27B0', // Purple
  beach: '#00BCD4', // Cyan
  travel: '#607D8B', // Blue grey
  check_in: '#795548', // Brown
  free_time: '#9E9E9E', // Grey
};

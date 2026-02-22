import type { MD3Theme } from 'react-native-paper';
import { MD3DarkTheme, MD3LightTheme, adaptNavigationTheme } from 'react-native-paper';
import {
  DarkTheme as NavigationDarkTheme,
  DefaultTheme as NavigationDefaultTheme,
} from '@react-navigation/native';
import type { ActivityCategory, ItineraryStatus } from '../types/dtos/itinerary';

const palette = {
  coral: '#EB5E55',
  charcoal: '#3A3335',
  raspberry: '#D81E5B',
  cream: '#FDF0D5',
  sage: '#C6D8D3',
};

const withAlpha = (hexColor: string, alpha: number): string => {
  const normalizedHex = hexColor.replace('#', '');
  const safeHex = normalizedHex.length === 3
    ? normalizedHex
        .split('')
        .map((char) => `${char}${char}`)
        .join('')
    : normalizedHex;

  const red = Number.parseInt(safeHex.slice(0, 2), 16);
  const green = Number.parseInt(safeHex.slice(2, 4), 16);
  const blue = Number.parseInt(safeHex.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
};

const sharedFonts = {
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
};

export const lightTheme: MD3Theme = {
  ...MD3LightTheme,
  roundness: 12,
  colors: {
    ...MD3LightTheme.colors,
    primary: palette.raspberry,
    onPrimary: palette.cream,
    primaryContainer: withAlpha(palette.raspberry, 0.18),
    onPrimaryContainer: palette.charcoal,
    secondary: palette.coral,
    onSecondary: palette.cream,
    secondaryContainer: withAlpha(palette.coral, 0.2),
    onSecondaryContainer: palette.charcoal,
    tertiary: palette.sage,
    onTertiary: palette.charcoal,
    tertiaryContainer: withAlpha(palette.sage, 0.28),
    onTertiaryContainer: palette.charcoal,
    error: palette.coral,
    background: palette.cream,
    onBackground: palette.charcoal,
    surface: '#FFF8E8',
    onSurface: palette.charcoal,
    surfaceVariant: withAlpha(palette.sage, 0.3),
    onSurfaceVariant: '#4F474A',
    outline: withAlpha(palette.charcoal, 0.35),
    outlineVariant: withAlpha(palette.charcoal, 0.18),
    surfaceDisabled: withAlpha(palette.charcoal, 0.08),
    onSurfaceDisabled: withAlpha(palette.charcoal, 0.45),
    scrim: withAlpha(palette.charcoal, 0.75),
    backdrop: withAlpha(palette.charcoal, 0.58),
  },
  fonts: {
    ...MD3LightTheme.fonts,
    ...sharedFonts,
  },
};

export const darkTheme: MD3Theme = {
  ...MD3DarkTheme,
  roundness: 12,
  colors: {
    ...MD3DarkTheme.colors,
    primary: palette.sage,
    onPrimary: palette.charcoal,
    primaryContainer: withAlpha(palette.sage, 0.24),
    onPrimaryContainer: palette.cream,
    secondary: palette.coral,
    onSecondary: palette.charcoal,
    secondaryContainer: withAlpha(palette.coral, 0.28),
    onSecondaryContainer: palette.cream,
    tertiary: palette.raspberry,
    onTertiary: palette.cream,
    tertiaryContainer: withAlpha(palette.raspberry, 0.26),
    onTertiaryContainer: palette.cream,
    error: palette.coral,
    background: palette.charcoal,
    onBackground: palette.cream,
    surface: '#443C3F',
    onSurface: palette.cream,
    surfaceVariant: '#544B4F',
    onSurfaceVariant: withAlpha(palette.cream, 0.86),
    outline: withAlpha(palette.sage, 0.65),
    outlineVariant: withAlpha(palette.sage, 0.34),
    surfaceDisabled: withAlpha(palette.cream, 0.12),
    onSurfaceDisabled: withAlpha(palette.cream, 0.42),
    scrim: withAlpha(palette.charcoal, 0.88),
    backdrop: withAlpha(palette.charcoal, 0.72),
  },
  fonts: {
    ...MD3DarkTheme.fonts,
    ...sharedFonts,
  },
};

const { LightTheme, DarkTheme } = adaptNavigationTheme({
  reactNavigationLight: NavigationDefaultTheme,
  reactNavigationDark: NavigationDarkTheme,
  materialLight: lightTheme,
  materialDark: darkTheme,
});

export const navigationThemes = {
  light: LightTheme,
  dark: DarkTheme,
};

type ActivityCategoryColorToken =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'onSurfaceVariant'
  | 'outline';

const activityCategoryColorMap: Record<ActivityCategory, ActivityCategoryColorToken> = {
  breakfast: 'secondary',
  lunch: 'secondary',
  dinner: 'secondary',
  merienda: 'secondary',
  food_trip: 'secondary',
  sightseeing: 'primary',
  activity: 'tertiary',
  nature: 'tertiary',
  cultural: 'primary',
  beach: 'tertiary',
  travel: 'onSurfaceVariant',
  check_in: 'onSurfaceVariant',
  free_time: 'outline',
};

export const getActivityCategoryColor = (theme: MD3Theme, category: ActivityCategory): string => {
  const colorToken = activityCategoryColorMap[category] || 'primary';
  return theme.colors[colorToken];
};

type StatusConfig = {
  label: string;
  icon: string;
  color: string;
  containerColor: string;
};

export const getStatusConfig = (theme: MD3Theme, status: ItineraryStatus): StatusConfig => {
  const configByStatus: Record<ItineraryStatus, StatusConfig> = {
    generating: {
      label: 'Generating',
      icon: 'loading',
      color: theme.colors.secondary,
      containerColor: withAlpha(theme.colors.secondary, theme.dark ? 0.3 : 0.18),
    },
    updating: {
      label: 'Updating',
      icon: 'loading',
      color: theme.colors.primary,
      containerColor: withAlpha(theme.colors.primary, theme.dark ? 0.3 : 0.18),
    },
    ready: {
      label: 'Ready',
      icon: 'check-circle',
      color: theme.colors.tertiary,
      containerColor: withAlpha(theme.colors.tertiary, theme.dark ? 0.34 : 0.24),
    },
    failed: {
      label: 'Failed',
      icon: 'alert-circle',
      color: theme.colors.error,
      containerColor: withAlpha(theme.colors.error, theme.dark ? 0.34 : 0.2),
    },
  };

  return configByStatus[status];
};

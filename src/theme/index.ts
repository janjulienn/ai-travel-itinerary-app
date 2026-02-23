import type { MD3Theme } from 'react-native-paper';
import { MD3DarkTheme, MD3LightTheme, adaptNavigationTheme } from 'react-native-paper';
import {
  DarkTheme as NavigationDarkTheme,
  DefaultTheme as NavigationDefaultTheme,
} from '@react-navigation/native';
import type { ActivityCategory, ItineraryStatus } from '../types/dtos/itinerary';

const palette = {
  neutralLight: '#E8EEF2',
  tertiarySoft: '#D6C9C9',
  secondarySoft: '#C7D3DD',
  primaryBlue: '#77B6EA',
  neutralDark: '#37393A',
  error: '#D98989',
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
    primary: palette.primaryBlue,
    onPrimary: palette.neutralDark,
    primaryContainer: withAlpha(palette.primaryBlue, 0.16),
    onPrimaryContainer: palette.neutralDark,
    secondary: palette.secondarySoft,
    onSecondary: palette.neutralDark,
    secondaryContainer: withAlpha(palette.secondarySoft, 0.32),
    onSecondaryContainer: palette.neutralDark,
    tertiary: palette.tertiarySoft,
    onTertiary: palette.neutralDark,
    tertiaryContainer: withAlpha(palette.tertiarySoft, 0.5),
    onTertiaryContainer: palette.neutralDark,
    error: palette.error,
    background: palette.neutralLight,
    onBackground: palette.neutralDark,
    surface: '#F6F8FA',
    onSurface: palette.neutralDark,
    surfaceVariant: withAlpha(palette.secondarySoft, 0.65),
    onSurfaceVariant: '#4A586D',
    outline: withAlpha(palette.neutralDark, 0.34),
    outlineVariant: withAlpha(palette.neutralDark, 0.16),
    surfaceDisabled: withAlpha(palette.neutralDark, 0.08),
    onSurfaceDisabled: withAlpha(palette.neutralDark, 0.45),
    scrim: withAlpha(palette.neutralDark, 0.72),
    backdrop: withAlpha(palette.neutralDark, 0.56),
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
    primary: palette.primaryBlue,
    onPrimary: palette.neutralDark,
    primaryContainer: withAlpha(palette.primaryBlue, 0.34),
    onPrimaryContainer: palette.neutralLight,
    secondary: palette.secondarySoft,
    onSecondary: palette.neutralDark,
    secondaryContainer: withAlpha(palette.secondarySoft, 0.24),
    onSecondaryContainer: palette.neutralLight,
    tertiary: palette.tertiarySoft,
    onTertiary: palette.neutralDark,
    tertiaryContainer: withAlpha(palette.tertiarySoft, 0.24),
    onTertiaryContainer: palette.neutralLight,
    error: palette.error,
    background: palette.neutralDark,
    onBackground: palette.neutralLight,
    surface: '#434648',
    onSurface: palette.neutralLight,
    surfaceVariant: '#505456',
    onSurfaceVariant: palette.secondarySoft,
    outline: withAlpha(palette.neutralLight, 0.56),
    outlineVariant: withAlpha(palette.neutralLight, 0.3),
    surfaceDisabled: withAlpha(palette.neutralLight, 0.12),
    onSurfaceDisabled: withAlpha(palette.neutralLight, 0.44),
    scrim: withAlpha('#0F141D', 0.86),
    backdrop: withAlpha('#0F141D', 0.7),
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
  | 'onSecondaryContainer'
  | 'onTertiaryContainer'
  | 'onSurfaceVariant'
  | 'outline';

const activityCategoryColorMap: Record<ActivityCategory, ActivityCategoryColorToken> = {
  breakfast: 'tertiary',
  lunch: 'tertiary',
  dinner: 'tertiary',
  snack: 'tertiary',
  food_trip: 'tertiary',
  sightseeing: 'primary',
  activity: 'secondary',
  nature: 'secondary',
  cultural: 'primary',
  beach: 'secondary',
  travel: 'onSurfaceVariant',
  check_in: 'onSurfaceVariant',
  free_time: 'onSurfaceVariant',
};

export const getActivityCategoryColor = (theme: MD3Theme, category: ActivityCategory): string => {
  const colorToken = activityCategoryColorMap[category] || 'primary';

  if (!theme.dark && colorToken === 'secondary') {
    return theme.colors.onSecondaryContainer;
  }

  if (!theme.dark && colorToken === 'tertiary') {
    return theme.colors.onTertiaryContainer;
  }

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
      color: theme.dark ? theme.colors.secondary : theme.colors.onSecondaryContainer,
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
      color: theme.dark ? theme.colors.tertiary : theme.colors.onTertiaryContainer,
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

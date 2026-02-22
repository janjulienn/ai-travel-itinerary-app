import React from 'react';
import { List, Switch } from 'react-native-paper';

interface ThemeSettingsSectionProps {
  useSystemTheme: boolean;
  darkModeEnabled: boolean;
  onToggleSystemTheme: (enabled: boolean) => void;
  onToggleDarkMode: (enabled: boolean) => void;
  showAdvancedItems?: boolean;
}

export const ThemeSettingsSection: React.FC<ThemeSettingsSectionProps> = ({
  useSystemTheme,
  darkModeEnabled,
  onToggleSystemTheme,
  onToggleDarkMode,
  showAdvancedItems = false,
}) => {
  return (
    <List.Section>
      <List.Subheader>App Settings</List.Subheader>
      <List.Item
        title="Use System Setting"
        description="Follow device light/dark appearance"
        left={(props) => <List.Icon {...props} icon="theme-light-dark" />}
        onPress={() => {
          onToggleSystemTheme(!useSystemTheme);
        }}
        right={() => (
          <Switch
            value={useSystemTheme}
            onValueChange={onToggleSystemTheme}
          />
        )}
      />
      <List.Item
        title="Dark Mode"
        description={
          useSystemTheme
            ? 'Disabled while using system setting'
            : 'Switch between light and dark theme'
        }
        left={(props) => <List.Icon {...props} icon={darkModeEnabled ? 'weather-night' : 'white-balance-sunny'} />}
        onPress={() => {
          if (!useSystemTheme) {
            onToggleDarkMode(!darkModeEnabled);
          }
        }}
        right={() => (
          <Switch
            value={darkModeEnabled}
            onValueChange={onToggleDarkMode}
            disabled={useSystemTheme}
          />
        )}
      />
      {showAdvancedItems && (
        <>
          <List.Item
            title="Notifications"
            description="Manage notification preferences"
            left={(props) => <List.Icon {...props} icon="bell" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
          />
          <List.Item
            title="Privacy"
            description="Privacy and data settings"
            left={(props) => <List.Icon {...props} icon="shield-account" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
          />
        </>
      )}
    </List.Section>
  );
};

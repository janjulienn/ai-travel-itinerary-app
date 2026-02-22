// Profile screen - auth and user settings

import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Button, Divider, List, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthForm } from '../../components/AuthForm';
import { SocialLoginButtons } from '../../components/SocialLoginButtons';
import { useApp } from '../../store/store';

export default function ProfileScreen() {
  const theme = useTheme();
  const { state, logout, continueAsGuest } = useApp();
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  const toggleAuthMode = () => {
    setAuthMode(authMode === 'login' ? 'register' : 'login');
  };

  // Guest mode
  if (state.isGuest || !state.token) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView style={styles.container}>
          <View style={styles.guestHeader}>
            <MaterialCommunityIcons name="account-circle" size={80} color={theme.colors.primary} />
            <Text variant="headlineMedium" style={styles.guestTitle}>
              Welcome!
            </Text>
            <Text variant="bodyLarge" style={styles.guestSubtitle}>
              Sign in to save and sync your itineraries
            </Text>
          </View>

          <AuthForm mode={authMode} onToggleMode={toggleAuthMode} />
          
          <SocialLoginButtons />

          <Divider style={styles.divider} />

          <Button
            mode="text"
            onPress={continueAsGuest}
            style={styles.guestButton}
            icon="account-off"
          >
            Continue as Guest
          </Button>

          <Text variant="bodySmall" style={styles.guestNote}>
            Guest mode: Itineraries are stored locally on this device only
          </Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Logged in mode - show real user profile
  const user = state.user;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.container}>
      <View style={styles.profileHeader}>
        <MaterialCommunityIcons name="account-circle" size={100} color={theme.colors.primary} />
        <Text variant="headlineMedium" style={styles.profileName}>
          {user?.first_name && user?.last_name
            ? `${user.first_name} ${user.last_name}`
            : user?.email.split('@')[0] || 'User'}
        </Text>
        <Text variant="bodyMedium" style={styles.profileEmail}>
          {user?.email}
        </Text>
        {user?.social_provider && user.social_provider !== 'email' && (
          <Text variant="bodySmall" style={styles.socialBadge}>
            Signed in with {user.social_provider === 'google' ? 'Google' : 'Facebook'}
          </Text>
        )}
      </View>

      <List.Section>
        <List.Subheader>Account</List.Subheader>
        <List.Item
          title="Email"
          description={user?.email || 'Not set'}
          left={(props) => <List.Icon {...props} icon="email" />}
        />
        {user?.age_group && (
          <List.Item
            title="Age Group"
            description={user.age_group}
            left={(props) => <List.Icon {...props} icon="calendar" />}
          />
        )}
        {user?.travel_style && (
          <List.Item
            title="Travel Style"
            description={user.travel_style}
            left={(props) => <List.Icon {...props} icon="airplane" />}
          />
        )}
        <List.Item
          title="Edit Profile"
          description="Update your information and preferences"
          left={(props) => <List.Icon {...props} icon="account-edit" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => {
            // TODO: Navigate to profile edit screen
            console.log('Edit profile - to be implemented');
          }}
        />
      </List.Section>

      <List.Section>
        <List.Subheader>App Settings</List.Subheader>
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
      </List.Section>

      <Button
        mode="outlined"
        onPress={logout}
        style={styles.logoutButton}
        icon="logout"
      >
        Sign Out
      </Button>
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  container: {
    flex: 1,
  },
  guestHeader: {
    alignItems: 'center',
    padding: 32,
    paddingBottom: 16,
  },
  guestTitle: {
    fontWeight: 'bold',
    marginTop: 16,
  },
  guestSubtitle: {
    opacity: 0.7,
    textAlign: 'center',
    marginTop: 8,
  },
  divider: {
    marginVertical: 16,
  },
  guestButton: {
    marginHorizontal: 24,
  },
  guestNote: {
    textAlign: 'center',
    opacity: 0.6,
    marginTop: 8,
    marginBottom: 24,
    paddingHorizontal: 32,
  },
  profileHeader: {
    alignItems: 'center',
    padding: 32,
  },
  profileName: {
    fontWeight: 'bold',
    marginTop: 16,
  },
  profileEmail: {
    opacity: 0.7,
    marginTop: 4,
  },
  socialBadge: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    color: '#1976D2',
    fontWeight: '500',
  },
  logoutButton: {
    margin: 24,
  },
});

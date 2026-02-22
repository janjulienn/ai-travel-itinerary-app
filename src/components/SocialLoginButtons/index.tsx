// Social login buttons component

/**
 * Social authentication buttons for Google and Facebook.
 * 
 * Currently shows "Coming soon" message until backend providers are configured.
 * 
 * To enable social login:
 * 1. Backend: Add Google/Facebook credentials to settings.SOCIAL_AUTH_PROVIDERS
 * 2. Frontend: Install expo-auth-session: `npx expo install expo-auth-session expo-crypto`
 * 3. Frontend: Implement OAuth flow in parent component using AuthSession.useAuthRequest()
 * 4. Frontend: Pass onSocialLogin callback prop to this component
 * 5. Frontend: Call authApi.socialLogin(provider, idToken) with the OAuth response
 * 
 * Example integration in ProfileScreen:
 * ```tsx
 * const handleSocialLogin = async (provider: 'google' | 'facebook', idToken: string) => {
 *   const authResponse = await authApi.socialLogin({ provider, id_token: idToken });
 *   await login(authResponse);
 * };
 * 
 * <SocialLoginButtons onSocialLogin={handleSocialLogin} />
 * ```
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, Text, Snackbar, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface SocialLoginButtonsProps {
  onSocialLogin?: (provider: 'google' | 'facebook', idToken: string) => Promise<void>;
}

export const SocialLoginButtons: React.FC<SocialLoginButtonsProps> = ({ onSocialLogin }) => {
  const theme = useTheme();
  const [snackbarVisible, setSnackbarVisible] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const handleSocialLogin = async (provider: 'google' | 'facebook') => {
    if (onSocialLogin) {
      // Social login is configured - this will be called when expo-auth-session is integrated
      // For now, this branch won't execute since onSocialLogin is undefined
      try {
        setLoading(true);
        // The OAuth flow would happen here via expo-auth-session
        // For example: const { idToken } = await promptAsync();
        // await onSocialLogin(provider, idToken);
      } catch (error) {
        console.error('Social login error:', error);
      } finally {
        setLoading(false);
      }
    } else {
      // Show "coming soon" message
      setSnackbarVisible(true);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.divider}>
        <View style={[styles.dividerLine, { backgroundColor: theme.colors.outlineVariant }]} />
        <Text variant="bodyMedium" style={styles.dividerText}>
          OR
        </Text>
        <View style={[styles.dividerLine, { backgroundColor: theme.colors.outlineVariant }]} />
      </View>

      <Button
        mode="outlined"
        icon={() => <MaterialCommunityIcons name="google" size={24} color="#DB4437" />}
        onPress={() => handleSocialLogin('google')}
        style={styles.button}
        contentStyle={styles.buttonContent}
        disabled={loading}
      >
        Continue with Google
      </Button>

      <Button
        mode="outlined"
        icon={() => <MaterialCommunityIcons name="facebook" size={24} color="#4267B2" />}
        onPress={() => handleSocialLogin('facebook')}
        style={styles.button}
        contentStyle={styles.buttonContent}
        disabled={loading}
      >
        Continue with Facebook
      </Button>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
      >
        Social login coming soon! We're working on it.
      </Snackbar>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 24,
    paddingTop: 0,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 16,
    opacity: 0.6,
  },
  button: {
    marginBottom: 12,
  },
  buttonContent: {
    paddingVertical: 8,
  },
});

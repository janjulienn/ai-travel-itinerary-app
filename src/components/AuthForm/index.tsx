// Auth form component for login/register

import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput, Button, Text, HelperText } from 'react-native-paper';
import { useApp } from '../../store/store';
import { authApi } from '../../services/api/auth';

interface AuthFormProps {
  mode: 'login' | 'register';
  onToggleMode: () => void;
  onSuccess?: () => void;
}

export const AuthForm: React.FC<AuthFormProps> = ({ mode, onToggleMode, onSuccess }) => {
  const { login } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const isLogin = mode === 'login';

  const validateEmail = (email: string) => {
    return email.includes('@');
  };

  const handleSubmit = async () => {
    setError('');

    // Basic validation
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      let authResponse;

      if (isLogin) {
        // Login
        authResponse = await authApi.login({ email, password });
      } else {
        // Register
        authResponse = await authApi.register({
          email,
          password,
          confirm_password: confirmPassword,
        });
      }

      // Login successful - update app state
      await login(authResponse);

      // Clear form
      setEmail('');
      setPassword('');
      setConfirmPassword('');

      // Notify parent component
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      console.error('Auth error:', err);

      // Extract error message from API response
      if (err.response?.data) {
        const errorData = err.response.data;

        // Handle field-specific errors from Django
        if (typeof errorData === 'object') {
          const firstError = Object.values(errorData)[0];
          if (Array.isArray(firstError)) {
            setError(firstError[0] as string);
          } else if (typeof firstError === 'string') {
            setError(firstError);
          } else {
            setError('Authentication failed. Please try again.');
          }
        } else if (typeof errorData === 'string') {
          setError(errorData);
        } else {
          setError('Authentication failed. Please try again.');
        }
      } else if (err.message) {
        setError(err.message);
      } else {
        setError('Network error. Please check your connection and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text variant="headlineMedium" style={styles.title}>
        {isLogin ? 'Welcome Back' : 'Create Account'}
      </Text>
      <Text variant="bodyLarge" style={styles.subtitle}>
        {isLogin ? 'Sign in to access your itineraries' : 'Start planning your adventures'}
      </Text>

      <TextInput
        label="Email"
        value={email}
        onChangeText={setEmail}
        mode="outlined"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        style={styles.input}
        error={!!error && !validateEmail(email)}
        disabled={loading}
      />

      <TextInput
        label="Password"
        value={password}
        onChangeText={setPassword}
        mode="outlined"
        secureTextEntry={!showPassword}
        right={
          <TextInput.Icon
            icon={showPassword ? 'eye-off' : 'eye'}
            onPress={() => setShowPassword(!showPassword)}
          />
        }
        style={styles.input}
        error={!!error}
        disabled={loading}
      />

      {!isLogin && (
        <TextInput
          label="Confirm Password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          mode="outlined"
          secureTextEntry={!showPassword}
          style={styles.input}
          error={!!error && password !== confirmPassword}
          disabled={loading}
        />
      )}

      {error && (
        <HelperText type="error" visible={true} style={styles.error}>
          {error}
        </HelperText>
      )}

      <Button
        mode="contained"
        onPress={handleSubmit}
        loading={loading}
        disabled={loading}
        style={styles.submitButton}
      >
        {isLogin ? 'Sign In' : 'Create Account'}
      </Button>

      <Button mode="text" onPress={onToggleMode} style={styles.toggleButton} disabled={loading}>
        {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 24,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    marginBottom: 24,
    opacity: 0.7,
  },
  input: {
    marginBottom: 16,
  },
  error: {
    fontSize: 14,
  },
  submitButton: {
    marginTop: 8,
    paddingVertical: 6,
  },
  toggleButton: {
    marginTop: 16,
  },
});

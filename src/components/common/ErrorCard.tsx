// Error card component

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, Button, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface ErrorCardProps {
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export const ErrorCard: React.FC<ErrorCardProps> = ({
  message = 'Something went wrong. Please try again.',
  onRetry,
  retryLabel = 'Try Again',
}) => {
  const theme = useTheme();

  return (
    <Card style={styles.card}>
      <Card.Content style={styles.content}>
        <MaterialCommunityIcons
          name="alert-circle-outline"
          size={64}
          color={theme.colors.error}
        />
        <Text variant="titleLarge" style={[styles.title, { color: theme.colors.error }]}>
          Oops!
        </Text>
        <Text variant="bodyLarge" style={styles.message}>
          {message}
        </Text>
        {onRetry && (
          <Button mode="contained" onPress={onRetry} style={styles.button}>
            {retryLabel}
          </Button>
        )}
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    margin: 16,
  },
  content: {
    alignItems: 'center',
    padding: 24,
  },
  title: {
    marginTop: 16,
    fontWeight: 'bold',
  },
  message: {
    marginTop: 8,
    textAlign: 'center',
  },
  button: {
    marginTop: 24,
    minWidth: 150,
  },
});

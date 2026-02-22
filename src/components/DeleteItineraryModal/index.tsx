// Delete itinerary confirmation modal

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Portal, Modal, Text, Button, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface DeleteItineraryModalProps {
  visible: boolean;
  onDismiss: () => void;
  onConfirm: () => void;
  itineraryTitle?: string;
  loading?: boolean;
  errorMessage?: string | null;
}

export const DeleteItineraryModal: React.FC<DeleteItineraryModalProps> = ({
  visible,
  onDismiss,
  onConfirm,
  itineraryTitle,
  loading = false,
  errorMessage,
}) => {
  const theme = useTheme();

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={loading ? undefined : onDismiss}
        contentContainerStyle={[
          styles.modal,
          { backgroundColor: theme.colors.surface },
        ]}
      >
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons
            name="alert-circle-outline"
            size={64}
            color={theme.colors.error}
          />
        </View>

        <Text variant="headlineSmall" style={styles.title}>
          Delete Itinerary?
        </Text>

        <Text variant="bodyMedium" style={styles.message}>
          {itineraryTitle
            ? `Are you sure you want to delete "${itineraryTitle}"? This action cannot be undone.`
            : 'Are you sure you want to delete this itinerary? This action cannot be undone.'}
        </Text>

        {errorMessage ? (
          <Text
            variant="bodySmall"
            style={[styles.errorText, { color: theme.colors.error }]}
          >
            {errorMessage}
          </Text>
        ) : null}

        <View style={styles.actions}>
          <Button
            mode="outlined"
            onPress={onDismiss}
            disabled={loading}
            style={styles.actionButton}
          >
            Cancel
          </Button>
          <Button
            mode="contained"
            onPress={onConfirm}
            loading={loading}
            disabled={loading}
            style={styles.actionButton}
            buttonColor={theme.colors.error}
          >
            Delete
          </Button>
        </View>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modal: {
    margin: 20,
    padding: 24,
    borderRadius: 16,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  message: {
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 22,
  },
  errorText: {
    textAlign: 'center',
    marginBottom: 16,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
});

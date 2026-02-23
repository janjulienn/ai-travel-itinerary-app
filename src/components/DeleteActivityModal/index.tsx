// Delete activity confirmation modal

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Portal, Modal, Text, Button, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface DeleteActivityModalProps {
  visible: boolean;
  onDismiss: () => void;
  onConfirm: () => void;
  activityName?: string;
  editScope?: 'day' | 'overview';
}

export const DeleteActivityModal: React.FC<DeleteActivityModalProps> = ({
  visible,
  onDismiss,
  onConfirm,
  activityName,
  editScope = 'day',
}) => {
  const theme = useTheme();

  const handleConfirm = () => {
    onConfirm();
    onDismiss();
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
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
          {editScope === 'overview' ? 'Remove Activity from Draft?' : 'Delete Activity?'}
        </Text>

        <Text variant="bodyMedium" style={styles.message}>
          {editScope === 'overview'
            ? activityName
              ? `Remove "${activityName}" from your overview draft edits?`
              : 'Remove this activity from your overview draft edits?'
            : activityName
              ? `Are you sure you want to delete "${activityName}"? This action cannot be undone.`
              : 'Are you sure you want to delete this activity? This action cannot be undone.'}
        </Text>

        <Text variant="bodySmall" style={styles.aiNote}>
          {editScope === 'overview'
            ? 'This only updates your draft. AI applies all draft edits after you tap Save in Itinerary Overview.'
            : 'The itinerary for this day will be automatically adjusted after deletion.'}
        </Text>

        <View style={styles.actions}>
          <Button
            mode="outlined"
            onPress={onDismiss}
            style={styles.actionButton}
          >
            Cancel
          </Button>
          <Button
            mode="contained"
            onPress={handleConfirm}
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
  aiNote: {
    textAlign: 'center',
    opacity: 0.7,
    fontStyle: 'italic',
    marginBottom: 24,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
});

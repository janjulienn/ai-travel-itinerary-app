// AI adjustment summary modal

import React from 'react';
import { View, StyleSheet, ScrollView, Text as RNText } from 'react-native';
import { Portal, Modal, Text, Button, IconButton, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface AdjustmentSummaryModalProps {
  visible: boolean;
  onDismiss: () => void;
  summary?: string;
}

export const AdjustmentSummaryModal: React.FC<AdjustmentSummaryModalProps> = ({
  visible,
  onDismiss,
  summary,
}) => {
  const theme = useTheme();

  // Parse summary into individual change items
  const getSummaryItems = () => {
    if (!summary) return ['Your itinerary has been successfully updated.'];
    
    // Split by periods and filter out empty strings
    const items = summary
      .split(/\.\s+/)
      .map(item => item.trim())
      .filter(item => item.length > 0)
      .map(item => item.endsWith('.') ? item : item + '.');
    
    return items.length > 0 ? items : [summary];
  };

  // Render text with quoted strings (place names) in bold
  const renderFormattedText = (text: string) => {
    const parts = text.split(/('[^']+')|(\"[^\"]+\")/);
    
    return (
      <Text variant="bodyMedium" style={styles.itemText}>
        {parts.map((part, index) => {
          if (!part) return null;
          // If part starts with quote, it's a place name - make it bold
          if (part.startsWith("'") || part.startsWith('"')) {
            const cleanText = part.slice(1, -1); // Remove quotes
            return (
              <RNText key={index} style={styles.boldText}>
                {cleanText}
              </RNText>
            );
          }
          return <RNText key={index}>{part}</RNText>;
        })}
      </Text>
    );
  };

  const summaryItems = getSummaryItems();

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modal}
      >
        <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons
                name="check-circle"
                size={48}
                color={theme.colors.primary}
              />
            </View>
            <Text variant="headlineSmall" style={styles.title}>
              Itinerary Adjusted
            </Text>
            <IconButton icon="close" size={24} onPress={onDismiss} style={styles.closeButton} />
          </View>

          <ScrollView 
            style={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <Text variant="bodyMedium" style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
              Here's what changed:
            </Text>
            
            {summaryItems.map((item, index) => (
              <View key={index} style={styles.summaryItem}>
                <MaterialCommunityIcons
                  name="circle-small"
                  size={24}
                  color={theme.colors.primary}
                  style={styles.bullet}
                />
                {renderFormattedText(item)}
              </View>
            ))}
          </ScrollView>

          <View style={styles.buttonContainer}>
            <Button
              mode="contained"
              onPress={onDismiss}
              style={styles.actionButton}
            >
              Got it
            </Button>
          </View>
        </View>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modal: {
    margin: 20,
    maxHeight: '80%',
  },
  modalContent: {
    borderRadius: 16,
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    marginBottom: 12,
  },
  title: {
    fontWeight: 'bold',
    textAlign: 'center',
  },
  closeButton: {
    position: 'absolute',
    right: -12,
    top: -12,
  },
  content: {
    marginBottom: 24,
  },
  subtitle: {
    fontWeight: '600',
    marginBottom: 12,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  bullet: {
    marginTop: -2,
  },
  itemText: {
    flex: 1,
    lineHeight: 22,
  },
  boldText: {
    fontWeight: '700',
  },
  buttonContainer: {
    flexDirection: 'row',
  },
  actionButton: {
    flex: 1,
  },
});

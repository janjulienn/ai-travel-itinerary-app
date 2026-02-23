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

type ParsedOperation = 'add' | 'replace' | 'set_start_time' | 'delete' | 'transit' | 'other';

interface ParsedSummaryItem {
  dayNumber: number | null;
  operation: ParsedOperation;
  text: string;
}

export const AdjustmentSummaryModal: React.FC<AdjustmentSummaryModalProps> = ({
  visible,
  onDismiss,
  summary,
}) => {
  const theme = useTheme();

  const to12HourText = (text: string): string => {
    return text.replace(/\b([01]\d|2[0-3]):([0-5]\d)\b/g, (_match, h, m) => {
      const hours = Number(h);
      const minutes = Number(m);
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHour = hours % 12 || 12;
      return `${String(displayHour).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${period}`;
    });
  };

  const parseOperation = (text: string): ParsedOperation => {
    const normalized = text.toLowerCase();

    if (/\badd(ed)?\b/.test(normalized)) return 'add';
    if (/\breplace(d)?\b/.test(normalized)) return 'replace';
    if (/\b(delete|deleted|remove|removed)\b/.test(normalized)) return 'delete';
    if (/\b(set|shift|reschedul|adjusted\s+time|time\s+updated)\b/.test(normalized)) return 'set_start_time';
    if (/\btravel\b|\btransit\b/.test(normalized)) return 'transit';

    return 'other';
  };

  const stripLeadingChangePrefix = (text: string): string => {
    let cleaned = text.trim();

    cleaned = cleaned.replace(/^day\s*\d+\s*:\s*/i, '');
    cleaned = cleaned.replace(
      /^(add|replace|set\s*start\s*time|set\s*time|delete|transit|other)\s*:\s*/i,
      ''
    );

    return cleaned.trim();
  };

  const parseSummaryItems = (): ParsedSummaryItem[] => {
    if (!summary) {
      return [
        {
          dayNumber: null,
          operation: 'other',
          text: 'Your itinerary has been successfully updated.',
        },
      ];
    }

    const sentenceCandidates = summary
      .split(/\n+|\.\s+/)
      .map((item) => item.trim())
      .filter((item) => item.length > 0)
      .map((item) => (item.endsWith('.') ? item : `${item}.`));

    if (sentenceCandidates.length === 0) {
      return [
        {
          dayNumber: null,
          operation: 'other',
          text: summary,
        },
      ];
    }

    return sentenceCandidates.map((item) => {
      const dayMatch = item.match(/day\s*(\d+)/i);
      const dayNumber = dayMatch ? Number(dayMatch[1]) : null;
      const cleanedText = stripLeadingChangePrefix(item);

      return {
        dayNumber,
        operation: parseOperation(item),
        text: to12HourText(cleanedText || item),
      };
    });
  };

  const getOperationLabel = (operation: ParsedOperation): string => {
    switch (operation) {
      case 'add':
        return 'Add';
      case 'replace':
        return 'Replace';
      case 'set_start_time':
        return 'Set Time';
      case 'delete':
        return 'Delete';
      case 'transit':
        return 'Transit';
      default:
        return 'Other';
    }
  };

  const groupedSummaryItems = () => {
    const parsed = parseSummaryItems();
    const grouped: Record<string, ParsedSummaryItem[]> = {};

    parsed.forEach((item) => {
      const key = item.dayNumber === null ? 'other' : String(item.dayNumber);
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(item);
    });

    const operationOrder: Record<ParsedOperation, number> = {
      add: 1,
      replace: 2,
      set_start_time: 3,
      delete: 4,
      transit: 5,
      other: 6,
    };

    const daySections = Object.keys(grouped)
      .filter((key) => key !== 'other')
      .sort((a, b) => Number(a) - Number(b))
      .map((key) => ({
        title: `Day ${key}`,
        items: [...grouped[key]].sort(
          (a, b) => operationOrder[a.operation] - operationOrder[b.operation]
        ),
      }));

    if (grouped.other && grouped.other.length > 0) {
      daySections.push({
        title: 'Other Changes',
        items: [...grouped.other].sort(
          (a, b) => operationOrder[a.operation] - operationOrder[b.operation]
        ),
      });
    }

    return daySections;
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

  const summarySections = groupedSummaryItems();

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
            
            {summarySections.map((section) => (
              <View key={section.title} style={styles.summaryGroup}>
                <Text variant="labelLarge" style={styles.summaryGroupTitle}>
                  {section.title}
                </Text>
                {section.items.map((item, index) => (
                  <View key={`${section.title}-${index}-${item.text}`} style={styles.summaryItem}>
                    <MaterialCommunityIcons
                      name="circle-small"
                      size={24}
                      color={theme.colors.primary}
                      style={styles.bullet}
                    />
                    <View style={styles.itemContent}>
                      <View style={[styles.operationBadge, { backgroundColor: theme.colors.secondaryContainer }]}>
                        <Text variant="labelSmall" style={[styles.operationBadgeText, { color: theme.colors.onSecondaryContainer }]}>
                          {getOperationLabel(item.operation)}
                        </Text>
                      </View>
                      {renderFormattedText(item.text)}
                    </View>
                  </View>
                ))}
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
  summaryGroup: {
    marginBottom: 10,
  },
  summaryGroupTitle: {
    fontWeight: '700',
    marginBottom: 4,
  },
  bullet: {
    marginTop: -2,
  },
  itemContent: {
    flex: 1,
  },
  operationBadge: {
    alignSelf: 'flex-start',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 4,
  },
  operationBadgeText: {
    fontWeight: '700',
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

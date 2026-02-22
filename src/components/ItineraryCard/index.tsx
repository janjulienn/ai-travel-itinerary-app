// Itinerary card component

import React from 'react';
import { View, StyleSheet, TouchableOpacity, GestureResponderEvent } from 'react-native';
import { Card, Text, Chip, useTheme, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { IItineraryList } from '../../types/dtos/itinerary';
import { STATUS_CONFIG } from '../../constants';

interface ItineraryCardProps {
  itinerary: IItineraryList;
  onPress: () => void;
  onDelete?: () => void;
  deleting?: boolean;
}

export const ItineraryCard: React.FC<ItineraryCardProps> = ({
  itinerary,
  onPress,
  onDelete,
  deleting = false,
}) => {
  const theme = useTheme();
  const statusConfig = STATUS_CONFIG[itinerary.status];

  const handleDeletePress = (event: GestureResponderEvent) => {
    event.stopPropagation();
    onDelete?.();
  };

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Card style={styles.card} mode="elevated">
        <Card.Content>
          <View style={styles.header}>
            <View style={styles.titleContainer}>
              <Text variant="titleLarge" style={styles.title}>
                {itinerary.title}
              </Text>
              <View style={styles.actionsContainer}>
                <Chip
                  icon={statusConfig.icon}
                  style={[styles.statusChip, { backgroundColor: statusConfig.color + '20' }]}
                  textStyle={{ color: statusConfig.color }}
                >
                  {statusConfig.label}
                </Chip>
                {onDelete && (
                  <IconButton
                    icon="delete-outline"
                    size={20}
                    iconColor={theme.colors.error}
                    onPress={handleDeletePress}
                    disabled={deleting}
                    style={styles.deleteButton}
                    accessibilityLabel="Delete itinerary"
                  />
                )}
              </View>
            </View>
          </View>

          <View style={styles.info}>
            <MaterialCommunityIcons name="map-marker" size={20} color={theme.colors.primary} />
            <Text variant="bodyLarge" style={styles.infoText}>
              {itinerary.province_name}
            </Text>
          </View>

          <View style={styles.info}>
            <MaterialCommunityIcons name="calendar" size={20} color={theme.colors.primary} />
            <Text variant="bodyMedium" style={styles.infoText}>
              {itinerary.start_date} to {itinerary.end_date} ({itinerary.num_days}{' '}
              {itinerary.num_days === 1 ? 'day' : 'days'})
            </Text>
          </View>

          {itinerary.summary && (
            <Text variant="bodyMedium" numberOfLines={2} style={styles.summary}>
              {itinerary.summary}
            </Text>
          )}
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    margin: 8,
  },
  header: {
    marginBottom: 12,
  },
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: -4,
    marginRight: -8,
  },
  title: {
    fontWeight: 'bold',
    flex: 1,
    marginRight: 8,
  },
  statusChip: {
    height: 28,
  },
  deleteButton: {
    margin: 0,
  },
  info: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    marginLeft: 8,
  },
  summary: {
    marginTop: 8,
    opacity: 0.8,
  },
});

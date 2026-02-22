// Activity card component for itinerary timeline

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Image, ScrollView, Linking, Pressable } from 'react-native';
import { Surface, Text, Chip, Button, IconButton, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { IItineraryActivity } from '../../types/dtos/itinerary';
import { ACTIVITY_CATEGORIES } from '../../constants';
import { PhotoViewerModal } from '../PhotoViewerModal';

interface ActivityCardProps {
  activity: IItineraryActivity;
  onViewPlace?: () => void;
  isEditing?: boolean;
  onReplace?: () => void;
  onDelete?: () => void;
  showTime?: boolean;
}

export const ActivityCard: React.FC<ActivityCardProps> = ({
  activity,
  onViewPlace,
  isEditing = false,
  onReplace,
  onDelete,
  showTime = true,
}) => {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);
  const [photoViewerVisible, setPhotoViewerVisible] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const categoryConfig = ACTIVITY_CATEGORIES[activity.category] || {
    icon: 'map-marker',
    label: activity.category_display || 'Activity',
    color: theme.colors.primary,
  };

  const descriptionLines = activity.description?.split('\n').length || 0;
  const shouldShowReadMore = descriptionLines > 3 || activity.description?.length > 150;
  
  const photos = activity.place_detail?.photos || [];
  const hasPhotos = Array.isArray(photos) && photos.length > 0;
  const googleMapsUrl = activity.place_detail?.google_maps_url;
  
  // Debug logging
  useEffect(() => {
    if (activity.place_detail) {
      console.log(`Activity "${activity.title}" - Photos:`, photos, 'Has photos:', hasPhotos, 'Google Maps:', googleMapsUrl);
    }
  }, []);
  
  const openGoogleMaps = () => {
    if (googleMapsUrl) {
      console.log('Opening Google Maps:', googleMapsUrl);
      Linking.openURL(googleMapsUrl).catch(err => console.error('Failed to open Google Maps:', err));
    }
  };

  const openPhotoViewer = (index: number) => {
    setSelectedPhotoIndex(index);
    setPhotoViewerVisible(true);
  };

  return (
    <>
    <Surface style={styles.card} elevation={1}>
      <View style={styles.cardContent}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.headerTopRow}>
              <Chip
                icon={categoryConfig.icon as any}
                style={[styles.categoryChip, { backgroundColor: categoryConfig.color + '15' }]}
                textStyle={{ color: categoryConfig.color, fontSize: 12 }}
              >
                {activity.category_display}
              </Chip>

              <View style={styles.headerActions}>
                {isEditing && onReplace && (
                  <IconButton
                    icon="swap-horizontal"
                    size={24}
                    onPress={onReplace}
                    iconColor={theme.colors.primary}
                    style={{ margin: 0 }}
                  />
                )}
                {isEditing && onDelete && (
                  <IconButton
                    icon="delete-outline"
                    size={24}
                    onPress={onDelete}
                    iconColor={theme.colors.error}
                    style={{ margin: 0 }}
                  />
                )}
              </View>
            </View>

            <Text variant="titleMedium" style={styles.title}>
              {activity.title}
            </Text>
          </View>
        </View>

        <View style={styles.content}>
        {showTime && (
          <View style={styles.timeRow}>
            <MaterialCommunityIcons name="clock-outline" size={18} color={theme.colors.primary} />
            <Text variant="bodyMedium" style={styles.timeText}>
              {activity.time_start} - {activity.time_end}
            </Text>
            <Chip style={styles.durationChip} textStyle={{ fontSize: 12 }}>
              {activity.duration_minutes} min
            </Chip>
          </View>
        )}

        {activity.location_name && (
          <View style={styles.locationRow}>
            <MaterialCommunityIcons
              name="map-marker"
              size={18}
              color={theme.colors.primary}
            />
            <View style={styles.locationText}>
              {googleMapsUrl ? (
                <Pressable onPress={openGoogleMaps}>
                  <Text variant="bodyMedium" style={[styles.locationName, styles.locationLink]}>
                    {activity.location_name}
                  </Text>
                </Pressable>
              ) : (
                <Text variant="bodyMedium" style={styles.locationName}>
                  {activity.location_name}
                </Text>
              )}
              {activity.location_address && (
                <Text variant="bodySmall" style={styles.locationAddress}>
                  {activity.location_address}
                </Text>
              )}
            </View>
          </View>
        )}

        {hasPhotos && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.photosContainer}
            contentContainerStyle={styles.photosContent}
          >
            {photos.slice(0, 5).map((photo, index) => (
              <Pressable key={index} onPress={() => openPhotoViewer(index)}>
                <Image
                  source={{ uri: photo }}
                  style={styles.photo}
                  resizeMode="cover"
                  onError={(e) => console.log('Failed to load image:', photo, e.nativeEvent.error)}
                />
              </Pressable>
            ))}
          </ScrollView>
        )}

        {activity.cost_estimate && (
          <View style={styles.costRow}>
            <MaterialCommunityIcons name="cash" size={18} color={theme.colors.primary} />
            <Text variant="bodyMedium" style={styles.costText}>
              {activity.cost_estimate}
            </Text>
          </View>
        )}

        {activity.description && (
          <Text
            variant="bodyMedium"
            numberOfLines={expanded ? undefined : 3}
            style={styles.description}
          >
            {activity.description}
          </Text>
        )}

        {shouldShowReadMore && (
          <Button
            mode="text"
            onPress={() => setExpanded(!expanded)}
            compact
            style={styles.readMoreButton}
          >
            {expanded ? 'Show Less' : 'Read More'}
          </Button>
        )}

        {activity.notes && (
          <Text variant="bodySmall" style={styles.notes}>
            💡 {activity.notes}
          </Text>
        )}

        {activity.place_detail && onViewPlace && (
          <Button mode="outlined" onPress={onViewPlace} style={styles.placeButton}>
            View Place Details
          </Button>
        )}
        </View>
      </View>
    </Surface>
    <PhotoViewerModal
      visible={photoViewerVisible}
      photos={photos}
      initialIndex={selectedPhotoIndex}
      onDismiss={() => setPhotoViewerVisible(false)}
    />
    </>
  );
};

const styles = StyleSheet.create({
  card: {
    marginVertical: 6,
    width: '100%',
    alignSelf: 'stretch',
    borderRadius: 12,
    minHeight: 64,
  },
  cardContent: {
    overflow: 'hidden',
    borderRadius: 12,
  },
  header: {
    flexDirection: 'row',
    padding: 12,
    paddingBottom: 8,
  },
  headerContent: {
    flex: 1,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    marginBottom: 6,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
    marginRight: -4,
  },
  categoryChip: {
    alignSelf: 'flex-start',
    flexShrink: 1,
    height: 28,
    marginRight: 8,
    marginBottom: 4,
  },
  title: {
    fontWeight: 'bold',
  },
  content: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  timeText: {
    marginLeft: 6,
    flex: 1,
  },
  durationChip: {
    height: 28,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  locationText: {
    marginLeft: 6,
    flex: 1,
  },
  locationName: {
    fontWeight: '500',
  },
  locationLink: {
    textDecorationLine: 'underline',
  },
  locationAddress: {
    opacity: 0.7,
    marginTop: 2,
  },
  costRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  costText: {
    marginLeft: 6,
    fontWeight: '500',
  },
  description: {
    marginTop: 8,
    lineHeight: 22,
  },
  readMoreButton: {
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  notes: {
    marginTop: 8,
    fontStyle: 'italic',
    opacity: 0.8,
  },
  placeButton: {
    marginTop: 12,
  },
  photosContainer: {
    marginTop: 12,
    marginBottom: 4,
  },
  photosContent: {
    paddingRight: 12,
  },
  photo: {
    width: 120,
    height: 90,
    borderRadius: 8,
    marginRight: 8,
  },
});

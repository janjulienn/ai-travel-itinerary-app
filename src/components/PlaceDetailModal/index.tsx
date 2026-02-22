// Place detail modal component

import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Linking, Image, useWindowDimensions, Pressable } from 'react-native';
import { Modal, Portal, Text, Button, Chip, IconButton, useTheme, Snackbar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { IPlace } from '../../types/dtos/province';
import { PhotoViewerModal } from '../PhotoViewerModal';

interface PlaceDetailModalProps {
  place: IPlace | null;
  visible: boolean;
  onDismiss: () => void;
  provinceName?: string;
}

export const PlaceDetailModal: React.FC<PlaceDetailModalProps> = ({
  place,
  visible,
  onDismiss,
  provinceName,
}) => {
  const theme = useTheme();
  const { height: windowHeight } = useWindowDimensions();
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [photoViewerVisible, setPhotoViewerVisible] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [buttonHeight, setButtonHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);

  if (!place) return null;
  
  const photos = place.photos || [];
  const hasPhotos = Array.isArray(photos) && photos.length > 0;

  const openGoogleMaps = () => {
    if (place.google_maps_url) {
      Linking.openURL(place.google_maps_url).catch(err => 
        console.error('Failed to open Google Maps:', err)
      );
    }
  };

  const openTikTok = () => {
    const searchQuery = provinceName 
      ? `${place.name} ${provinceName}`
      : place.name;
    const tiktokUrl = `snssdk1180://search?keyword=${encodeURIComponent(searchQuery)}`;
    Linking.openURL(tiktokUrl).catch(err => {
      console.error('Failed to open TikTok:', err);
      setSnackbarVisible(true);
    });
  };

  const openPhotoViewer = (index: number) => {
    setSelectedPhotoIndex(index);
    setPhotoViewerVisible(true);
  };

  const modalMaxHeight = windowHeight * 0.9;
  const totalHeight = headerHeight + buttonHeight + contentHeight;
  const needsScroll = totalHeight > modalMaxHeight;
  const modalHeight =
    headerHeight > 0 && buttonHeight > 0 && contentHeight > 0
      ? Math.min(totalHeight, modalMaxHeight)
      : modalMaxHeight;

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={[styles.modal, { maxHeight: modalMaxHeight }]}
      >
        <View
          style={[
            styles.modalContent,
            { backgroundColor: theme.colors.surface },
            { height: modalHeight },
          ]}
        >
          <View style={styles.header} onLayout={(event) => setHeaderHeight(event.nativeEvent.layout.height)}>
            <Text variant="headlineSmall" style={styles.title}>
              {place.name}
            </Text>
            <IconButton icon="close" size={24} onPress={onDismiss} />
          </View>

          <ScrollView 
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
            scrollEnabled={needsScroll}
            onContentSizeChange={(_, height) => setContentHeight(height)}
          >
          {hasPhotos && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.photosContainer}
              contentContainerStyle={styles.photosContent}
            >
              {photos.map((photo, index) => (
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

          <View style={styles.badges}>
            <Chip icon="tag" style={styles.chip}>
              {place.category_display}
            </Chip>
            {place.rating != null && typeof place.rating === 'number' && (
              <Chip icon="star" style={styles.chip}>
                {place.rating.toFixed(1)} ({place.total_ratings || 0} reviews)
              </Chip>
            )}
            {place.price_level !== null && (
              <Chip icon="cash" style={styles.chip}>
                {place.price_level_display}
              </Chip>
            )}
          </View>

          {place.description && (
            <View style={styles.section}>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                About
              </Text>
              <Text variant="bodyLarge" style={styles.description}>
                {place.description}
              </Text>
            </View>
          )}

          {place.address && (
            <View style={styles.section}>
              <View style={styles.infoRow}>
                <MaterialCommunityIcons
                  name="map-marker"
                  size={20}
                  color={theme.colors.primary}
                />
                <Text variant="bodyMedium" style={styles.infoText}>
                  {place.address}
                </Text>
              </View>
            </View>
          )}

          {place.typical_duration_minutes && (
            <View style={styles.section}>
              <View style={styles.infoRow}>
                <MaterialCommunityIcons
                  name="clock-outline"
                  size={20}
                  color={theme.colors.primary}
                />
                <Text variant="bodyMedium" style={styles.infoText}>
                  Typical visit: {Math.floor(place.typical_duration_minutes / 60)}h{' '}
                  {place.typical_duration_minutes % 60}min
                </Text>
              </View>
            </View>
          )}

          {place.highlights && place.highlights.length > 0 && (
            <View style={styles.section}>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Highlights
              </Text>
              {place.highlights.map((highlight) => (
                <View key={highlight.id} style={styles.highlight}>
                  <Text variant="titleSmall" style={styles.highlightTitle}>
                    • {highlight.title}
                  </Text>
                  <Text variant="bodyMedium" style={styles.highlightBody}>
                    {highlight.body}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {place.tags && place.tags.length > 0 && (
            <View style={styles.section}>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Tags
              </Text>
              <View style={styles.tags}>
                {place.tags.map((tag, index) => (
                  <Chip key={index} style={styles.tag}>
                    {tag}
                  </Chip>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
        
        <View
          style={styles.buttonContainer}
          onLayout={(event) => setButtonHeight(event.nativeEvent.layout.height)}
        >
          {place.google_maps_url && (
            <Button
              mode="contained"
              icon="map"
              onPress={openGoogleMaps}
              style={styles.mapsButton}
            >
              Open in Google Maps
            </Button>
          )}
          <IconButton
            icon="music-note"
            size={28}
            mode="contained"
            onPress={openTikTok}
            iconColor="#fff"
            containerColor="#000"
            style={styles.tiktokButton}
          />
        </View>
        </View>
      </Modal>
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={4000}
      >
        Please install TikTok to use this feature
      </Snackbar>
      <PhotoViewerModal
        visible={photoViewerVisible}
        photos={photos}
        initialIndex={selectedPhotoIndex}
        onDismiss={() => setPhotoViewerVisible(false)}
      />
    </Portal>
  );
};

const styles = StyleSheet.create({
  modal: {
    margin: 20,
    maxHeight: '90%',
  },
  modalContent: {
    borderRadius: 16,
    overflow: 'hidden',
    maxHeight: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 8,
  },
  title: {
    fontWeight: 'bold',
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  contentContainer: {
    paddingBottom: 8,
  },
  buttonContainer: {
    padding: 16,
    paddingTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  chip: {
    marginRight: 8,
    marginBottom: 8,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  description: {
    lineHeight: 24,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoText: {
    marginLeft: 8,
    flex: 1,
  },
  highlight: {
    marginBottom: 12,
  },
  highlightTitle: {
    fontWeight: '600',
    marginBottom: 4,
  },
  highlightBody: {
    marginLeft: 12,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    marginRight: 8,
    marginBottom: 8,
  },
  mapsButton: {
    flex: 1,
  },
  tiktokButton: {
    margin: 0,
  },
  photosContainer: {
    marginTop: 8,
    marginBottom: 16,
  },
  photosContent: {
    paddingRight: 16,
  },
  photo: {
    width: 200,
    height: 150,
    borderRadius: 12,
    marginRight: 12,
  },
});

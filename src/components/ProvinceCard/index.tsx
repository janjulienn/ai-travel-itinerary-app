// Province card component

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Card, Text, Chip, useTheme } from 'react-native-paper';
import type { IProvinceList } from '../../types/dtos/province';

interface ProvinceCardProps {
  province: IProvinceList;
  onPress: () => void;
}

export const ProvinceCard: React.FC<ProvinceCardProps> = ({ province, onPress }) => {
  const theme = useTheme();

  // Prefer photos array over image_url
  const photos = province.photos || [];
  const imageUrl = photos.length > 0 ? photos[0] : province.image_url;
  const hasImage = imageUrl && imageUrl.trim() !== '';

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Card style={styles.card} mode="elevated">
        {hasImage && (
          <Card.Cover 
            source={{ uri: imageUrl as string }} 
            style={styles.cover}
            resizeMode="cover"
            onError={(e) => console.log(`Failed to load province image for ${province.name}:`, imageUrl, e.nativeEvent)}
          />
        )}
        <Card.Content style={styles.content}>
          <Text variant="titleLarge" style={styles.title}>
            {province.name}
          </Text>
          <Chip icon="map-marker" style={styles.chip} textStyle={styles.chipText}>
            {province.region_display}
          </Chip>
          {province.description && (
            <Text variant="bodyMedium" numberOfLines={2} style={styles.description}>
              {province.description}
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
    minHeight: 120,
  },
  cover: {
    height: 150,
  },
  content: {
    paddingTop: 16,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  chip: {
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  chipText: {
    fontSize: 14,
  },
  description: {
    marginTop: 4,
    opacity: 0.8,
  },
});

// Province detail screen - province info with top places

import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Image, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Card, Button, ActivityIndicator, Chip, List, IconButton, useTheme } from 'react-native-paper';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ErrorCard } from '../../components/common/ErrorCard';
import { PlaceDetailModal } from '../../components/PlaceDetailModal';
import { useProvinceDetail } from '../../hooks/useProvinces';
import type { HomeStackParamList } from '../../types/navigation';
import type { IPlace } from '../../types/dtos/province';

type RouteProps = RouteProp<HomeStackParamList, 'ProvinceDetail'>;
type NavigationProp = NativeStackNavigationProp<any>;

export default function ProvinceDetailScreen() {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavigationProp>();
  const theme = useTheme();
  const { province, loading, error, refresh } = useProvinceDetail(route.params.slug);
  const [selectedPlace, setSelectedPlace] = useState<IPlace | null>(null);

  if (loading && !province) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text variant="bodyLarge" style={styles.loadingText}>
            Loading destination...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !province) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centerContainer}>
          <ErrorCard
            message={error || 'Province not found'}
            onRetry={error ? refresh : undefined}
          />
        </View>
      </SafeAreaView>
    );
  }

  const handlePlanTrip = () => {
    navigation.navigate('GenerateTab', {
      screen: 'Generate',
      params: { provinceSlug: province.slug },
    });
  };

  // Group places by category
  const placesByCategory = (province.top_places || []).reduce((acc, place) => {
    if (!acc[place.category]) {
      acc[place.category] = [];
    }
    acc[place.category].push(place);
    return acc;
  }, {} as Record<string, typeof province.top_places>);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
    <ScrollView style={styles.container}>
      {/* Header with Image */}
      {(() => {
        const photos = province.photos || [];
        const headerImageUrl = photos.length > 0 ? photos[0] : province.image_url;
        return headerImageUrl ? (
          <Image source={{ uri: headerImageUrl }} style={styles.headerImage} />
        ) : null;
      })()}

      {/* Province Info Card */}
      <Card style={styles.infoCard}>
        <Card.Content>
          <Text variant="headlineLarge" style={styles.name}>
            {province.name}
          </Text>
          <Chip icon="map-marker" style={styles.regionChip}>
            {province.region_display}
          </Chip>

          {province.description && (
            <Text variant="bodyLarge" style={styles.description}>
              {province.description}
            </Text>
          )}

          <Button
            mode="contained"
            onPress={handlePlanTrip}
            icon="map-plus"
            style={styles.planButton}
            contentStyle={styles.planButtonContent}
          >
            Plan a Trip Here
          </Button>
        </Card.Content>
      </Card>

      {/* Top Places Section */}
      {province.top_places.length > 0 && (
        <View style={styles.placesSection}>
          <Text variant="titleLarge" style={styles.sectionTitle}>
            Top Places to Visit
          </Text>

          {Object.entries(placesByCategory).map(([category, places]) => (
            <View key={category} style={styles.categorySection}>
              <Text variant="titleMedium" style={styles.categoryTitle}>
                {places[0].category_display}
              </Text>

              {places.map((place) => (
                <List.Item
                  key={place.id}
                  title={place.name}
                  description={
                    place.description
                      ? place.description.substring(0, 100) + (place.description.length > 100 ? '...' : '')
                      : undefined
                  }
                  onPress={() => setSelectedPlace(place)}
                  left={(props) => (
                    <View style={styles.placeIcon}>
                      <MaterialCommunityIcons
                        name={getCategoryIcon(place.category) as any}
                        size={24}
                        color={theme.colors.primary}
                      />
                    </View>
                  )}
                  right={(props) => (
                    <View style={styles.placeActions}>
                      {place.rating != null && typeof place.rating === 'number' && (
                        <View style={styles.placeRating}>
                          <MaterialCommunityIcons name="star" size={16} color="#FFC107" />
                          <Text variant="bodyMedium">{place.rating.toFixed(1)}</Text>
                        </View>
                      )}
                      {place.google_maps_url && (
                        <IconButton
                          icon="map"
                          size={20}
                          onPress={() => {
                            Linking.openURL(place.google_maps_url!).catch(err => 
                              console.error('Failed to open Google Maps:', err)
                            );
                          }}
                          style={styles.mapsIcon}
                        />
                      )}
                    </View>
                  )}
                  style={styles.placeItem}
                />
              ))}
            </View>
          ))}
        </View>
      )}
      
      <PlaceDetailModal
        place={selectedPlace}
        visible={!!selectedPlace}
        onDismiss={() => setSelectedPlace(null)}
        provinceName={province.name}
      />
    </ScrollView>
    </SafeAreaView>
  );
}

// Helper function to get category icons
function getCategoryIcon(category: string): string {
  const iconMap: Record<string, string> = {
    beach: 'beach',
    nature: 'tree',
    attraction: 'camera',
    activity: 'run',
    landmark: 'bank',
    restaurant: 'silverware-fork-knife',
    food_trip: 'food',
    accommodation: 'home',
  };
  return iconMap[category] || 'map-marker';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
  },
  headerImage: {
    width: '100%',
    height: 250,
  },
  infoCard: {
    margin: 16,
    marginTop: -40,
  },
  name: {
    fontWeight: 'bold',
    marginBottom: 12,
  },
  regionChip: {
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  description: {
    lineHeight: 24,
    marginBottom: 24,
  },
  planButton: {
    marginTop: 8,
  },
  planButtonContent: {
    paddingVertical: 8,
  },
  placesSection: {
    padding: 16,
    paddingTop: 8,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 16,
  },
  categorySection: {
    marginBottom: 24,
  },
  categoryTitle: {
    fontWeight: '600',
    marginBottom: 8,
    opacity: 0.7,
  },
  placeItem: {
    paddingVertical: 4,
  },
  placeIcon: {
    justifyContent: 'center',
    paddingRight: 8,
  },
  placeActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  placeRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginRight: 4,
  },
  mapsIcon: {
    margin: 0,
  },
});

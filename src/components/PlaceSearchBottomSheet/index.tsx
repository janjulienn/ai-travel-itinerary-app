// Place search bottom sheet component for adding/replacing activities

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
  Alert,
  Linking,
  Pressable,
  Image,
  Animated,
  Easing,
} from 'react-native';
import {
  Portal,
  Modal,
  Text,
  Searchbar,
  Chip,
  List,
  Button,
  ActivityIndicator,
  useTheme,
  IconButton,
} from 'react-native-paper';
import { TimePickerModal } from 'react-native-paper-dates';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { provincesApi } from '../../services/api/provinces';
import type { IPlace } from '../../types/dtos/province';
import type { IItineraryActivity } from '../../types/dtos/itinerary';
import { PhotoViewerModal } from '../PhotoViewerModal';

interface PlaceSearchBottomSheetProps {
  visible: boolean;
  onDismiss: () => void;
  onSave: (data: {
    place: IPlace;
    time_start: string;
    time_end: string;
    duration_minutes: number;
  }) => void;
  countrySlug: string;
  provinceSlug: string;
  provinceName?: string;
  mode: 'add' | 'replace';
  activityToReplace?: IItineraryActivity | null;
  initialAddTimeStart?: string;
  initialAddTimeEnd?: string;
  previousActivity?: {
    id: number;
    title: string;
    time_start: string;
    time_end: string;
    latitude: number | null;
    longitude: number | null;
  };
  nextActivity?: {
    id: number;
    title: string;
    time_start: string;
    time_end: string;
    latitude: number | null;
    longitude: number | null;
  };
}

interface IReferencePoint {
  latitude: number;
  longitude: number;
}

const CATEGORIES = [
  { value: 'beach', label: 'Beach', icon: 'beach' },
  { value: 'restaurant', label: 'Restaurant', icon: 'silverware-fork-knife' },
  { value: 'attraction', label: 'Attraction', icon: 'camera' },
  { value: 'activity', label: 'Activity', icon: 'run' },
  { value: 'nature', label: 'Nature', icon: 'tree' },
  { value: 'landmark', label: 'Landmark', icon: 'bank' },
];

const MIN_DURATION_MINUTES = 15;
const DURATION_STEP_MINUTES = 15;
const DAY_END_MINUTES = 24 * 60 - 1;

// Convert "HH:MM" to { hours, minutes }
const parseTime = (timeStr: string): { hours: number; minutes: number } => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return { hours, minutes };
};

// Convert { hours, minutes } to "HH:MM"
const formatTime = (hours: number, minutes: number): string => {
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

// Convert "07:00 AM" or "HH:MM" to { hours, minutes }
const parse12HourTime = (timeStr: string): { hours: number; minutes: number } => {
  // If already in 24-hour format
  if (!timeStr.includes('AM') && !timeStr.includes('PM')) {
    return parseTime(timeStr);
  }
  
  const [timePart, period] = timeStr.split(' ');
  let [hours, minutes] = timePart.split(':').map(Number);
  
  if (period === 'PM' && hours !== 12) {
    hours += 12;
  } else if (period === 'AM' && hours === 12) {
    hours = 0;
  }
  
  return { hours, minutes };
};

// Convert { hours, minutes } to "07:00 AM" format
const formatTo12Hour = (hours: number, minutes: number): string => {
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${String(displayHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${period}`;
};

const toTotalMinutes = ({ hours, minutes }: { hours: number; minutes: number }): number =>
  hours * 60 + minutes;

const toTimeParts = (totalMinutes: number): { hours: number; minutes: number } => ({
  hours: Math.floor(totalMinutes / 60),
  minutes: totalMinutes % 60,
});

const applyDurationFromStart = (
  start: { hours: number; minutes: number },
  proposedDuration: number
): { end: { hours: number; minutes: number }; duration: number } => {
  const startMinutes = toTotalMinutes(start);
  const maxDuration = Math.max(MIN_DURATION_MINUTES, DAY_END_MINUTES - startMinutes);
  const safeDuration = Math.max(
    MIN_DURATION_MINUTES,
    Math.min(proposedDuration, maxDuration)
  );
  const endMinutes = Math.min(startMinutes + safeDuration, DAY_END_MINUTES);

  return {
    end: toTimeParts(endMinutes),
    duration: endMinutes - startMinutes,
  };
};

const toRadians = (value: number): number => (value * Math.PI) / 180;

const haversineDistanceKm = (
  fromLatitude: number,
  fromLongitude: number,
  toLatitude: number,
  toLongitude: number
): number => {
  const earthRadiusKm = 6371;
  const dLat = toRadians(toLatitude - fromLatitude);
  const dLon = toRadians(toLongitude - fromLongitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(fromLatitude)) *
      Math.cos(toRadians(toLatitude)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
};

const hasCoordinate = (value: number | null | undefined): value is number =>
  typeof value === 'number' && Number.isFinite(value);

export const PlaceSearchBottomSheet: React.FC<PlaceSearchBottomSheetProps> = ({
  visible,
  onDismiss,
  onSave,
  countrySlug,
  provinceSlug,
  provinceName,
  mode,
  activityToReplace,
  initialAddTimeStart,
  initialAddTimeEnd,
  previousActivity,
  nextActivity,
}) => {
  const theme = useTheme();
  const selectedChipStyle = { backgroundColor: theme.colors.secondaryContainer };
  const selectedChipTextStyle = {
    color: theme.colors.onSecondaryContainer,
    fontWeight: 'bold' as const,
  };
  const { height: windowHeight } = useWindowDimensions();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [places, setPlaces] = useState<IPlace[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<IPlace | null>(null);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [buttonHeight, setButtonHeight] = useState(0);
  const [browseContentHeight, setBrowseContentHeight] = useState(0);
  const [selectedContentHeight, setSelectedContentHeight] = useState(0);
  const [photoViewerVisible, setPhotoViewerVisible] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const [showInsertPreview, setShowInsertPreview] = useState(false);
  
  // Time picker state
  const [startTimePickerVisible, setStartTimePickerVisible] = useState(false);
  const [endTimePickerVisible, setEndTimePickerVisible] = useState(false);
  
  // Time inputs - store in 24-hour format internally
  const [timeStart, setTimeStart] = useState({ hours: 9, minutes: 0 });
  const [timeEnd, setTimeEnd] = useState({ hours: 10, minutes: 0 });
  const [duration, setDuration] = useState(60);
  const [timeAdjustMode, setTimeAdjustMode] = useState<'end_time' | 'duration'>('end_time');
  const requestSeqRef = useRef(0);
  const animatedModalHeight = useRef(new Animated.Value(windowHeight * 0.78)).current;

  const referencePoint = useMemo<IReferencePoint | null>(() => {
    if (mode === 'replace') {
      const latitude = activityToReplace?.place_detail?.latitude;
      const longitude = activityToReplace?.place_detail?.longitude;

      if (hasCoordinate(latitude) && hasCoordinate(longitude)) {
        return { latitude, longitude };
      }

      return null;
    }

    const previousHasCoordinates =
      hasCoordinate(previousActivity?.latitude) && hasCoordinate(previousActivity?.longitude);
    const nextHasCoordinates = hasCoordinate(nextActivity?.latitude) && hasCoordinate(nextActivity?.longitude);

    if (previousHasCoordinates && nextHasCoordinates) {
      return {
        latitude: ((previousActivity?.latitude as number) + (nextActivity?.latitude as number)) / 2,
        longitude: ((previousActivity?.longitude as number) + (nextActivity?.longitude as number)) / 2,
      };
    }

    if (previousHasCoordinates) {
      return {
        latitude: previousActivity?.latitude as number,
        longitude: previousActivity?.longitude as number,
      };
    }

    if (nextHasCoordinates) {
      return {
        latitude: nextActivity?.latitude as number,
        longitude: nextActivity?.longitude as number,
      };
    }

    return null;
  }, [mode, activityToReplace, previousActivity, nextActivity]);

  const proximityHintText = useMemo(() => {
    if (!referencePoint) {
      return null;
    }

    if (mode === 'replace') {
      return 'Suggested places are sorted by nearest location to the activity being replaced.';
    }

    return 'Suggested places are sorted by nearest location to nearby activities in this day.';
  }, [mode, referencePoint]);

  const fetchPlaces = useCallback(
    async (query?: string) => {
      requestSeqRef.current += 1;
      const requestSeq = requestSeqRef.current;

      try {
        setLoading(true);

        const normalizedQuery = (query || '').trim();
        let data: IPlace[] = [];

        if (normalizedQuery.length >= 2) {
          if (selectedCategories.length === 1) {
            data = await provincesApi.autocompleteProvincePlaces(countrySlug, provinceSlug, {
              q: normalizedQuery,
              category: selectedCategories[0],
            });
          } else {
            data = await provincesApi.autocompleteProvincePlaces(countrySlug, provinceSlug, {
              q: normalizedQuery,
            });
          }
        } else if (selectedCategories.length === 1) {
          data = await provincesApi.getProvincePlaces(countrySlug, provinceSlug, {
            category: selectedCategories[0],
          });
        } else {
          data = await provincesApi.getProvincePlaces(countrySlug, provinceSlug);
        }

        if (requestSeq === requestSeqRef.current) {
          setPlaces(data);
        }
      } catch (error) {
        if (requestSeq === requestSeqRef.current) {
          console.error('Error fetching places:', error);
        }
      } finally {
        if (requestSeq === requestSeqRef.current) {
          setLoading(false);
        }
      }
    },
    [countrySlug, provinceSlug, selectedCategories]
  );

  useEffect(() => {
    if (visible) {
      // Reset state when opening
      setSearchQuery('');
      setSelectedCategories([]);
      setSelectedPlace(null);
      setShowMoreDetails(false);
      setShowInsertPreview(false);
      setTimeAdjustMode('end_time');
      
      // Pre-fill times if replacing activity
      if (mode === 'replace' && activityToReplace) {
        const start = parse12HourTime(activityToReplace.time_start);
        const end = parse12HourTime(activityToReplace.time_end);
        setTimeStart(start);
        setTimeEnd(end);
        setDuration(activityToReplace.duration_minutes);
      } else if (mode === 'add' && initialAddTimeStart && initialAddTimeEnd) {
        const start = parseTime(initialAddTimeStart);
        const end = parseTime(initialAddTimeEnd);
        setTimeStart(start);
        setTimeEnd(end);
        setDuration(60);
      } else {
        setTimeStart({ hours: 9, minutes: 0 });
        setTimeEnd({ hours: 10, minutes: 0 });
        setDuration(60);
      }
    }
  }, [visible, provinceSlug, mode, activityToReplace, initialAddTimeStart, initialAddTimeEnd]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    const timeout = setTimeout(() => {
      fetchPlaces(searchQuery);
    }, 300);

    return () => clearTimeout(timeout);
  }, [visible, searchQuery, selectedCategories, fetchPlaces]);

  useEffect(() => {
    if (timeAdjustMode !== 'end_time') {
      return;
    }

    const startMinutes = timeStart.hours * 60 + timeStart.minutes;
    const endMinutes = timeEnd.hours * 60 + timeEnd.minutes;
    if (endMinutes > startMinutes) {
      setDuration(endMinutes - startMinutes);
    }
  }, [timeStart, timeEnd, timeAdjustMode]);

  // Filter places based on search and category
  const filteredPlaces = useMemo(() => {
    let filtered = places;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((place) =>
        place.name.toLowerCase().includes(query)
      );
    }

    if (selectedCategories.length > 0) {
      filtered = filtered.filter((place) => selectedCategories.includes(place.category));
    }

    const seenPlaceIds = new Set<string>();
    filtered = filtered.filter((place) => {
      const placeId = place.google_place_id;
      if (!placeId) {
        return true;
      }
      if (seenPlaceIds.has(placeId)) {
        return false;
      }
      seenPlaceIds.add(placeId);
      return true;
    });

    if (referencePoint) {
      filtered = [...filtered].sort((first, second) => {
        const firstHasCoordinates = hasCoordinate(first.latitude) && hasCoordinate(first.longitude);
        const secondHasCoordinates = hasCoordinate(second.latitude) && hasCoordinate(second.longitude);

        if (!firstHasCoordinates && !secondHasCoordinates) {
          return 0;
        }

        if (!firstHasCoordinates) {
          return 1;
        }

        if (!secondHasCoordinates) {
          return -1;
        }

        const firstDistance = haversineDistanceKm(
          referencePoint.latitude,
          referencePoint.longitude,
          first.latitude as number,
          first.longitude as number
        );
        const secondDistance = haversineDistanceKm(
          referencePoint.latitude,
          referencePoint.longitude,
          second.latitude as number,
          second.longitude as number
        );

        return firstDistance - secondDistance;
      });
    }

    return filtered;
  }, [places, searchQuery, selectedCategories, referencePoint]);

  const handleSelectPlace = (place: IPlace) => {
    setSelectedPlace(place);
  };

  const handleSave = () => {
    if (!selectedPlace) return;

    onSave({
      place: selectedPlace,
      time_start: formatTime(timeStart.hours, timeStart.minutes),
      time_end: formatTime(timeEnd.hours, timeEnd.minutes),
      duration_minutes: duration,
    });

    // Reset and close
    setSelectedPlace(null);
    onDismiss();
  };

  const handleStartTimeConfirm = ({ hours, minutes }: { hours: number; minutes: number }) => {
    const nextStart = { hours, minutes };
    setTimeStart(nextStart);

    if (timeAdjustMode === 'duration') {
      const computed = applyDurationFromStart(nextStart, duration);
      setDuration(computed.duration);
      setTimeEnd(computed.end);
    } else {
      const nextStartMinutes = toTotalMinutes(nextStart);
      const currentEndMinutes = toTotalMinutes(timeEnd);
      if (currentEndMinutes <= nextStartMinutes) {
        const computed = applyDurationFromStart(nextStart, duration || 60);
        setDuration(computed.duration);
        setTimeEnd(computed.end);
      }
    }

    setStartTimePickerVisible(false);
  };

  const handleEndTimeConfirm = ({ hours, minutes }: { hours: number; minutes: number }) => {
    const nextEnd = { hours, minutes };
    const startMinutes = toTotalMinutes(timeStart);
    const endMinutes = toTotalMinutes(nextEnd);
    if (endMinutes <= startMinutes) {
      return;
    }

    setTimeEnd(nextEnd);
    setDuration(endMinutes - startMinutes);
    setEndTimePickerVisible(false);
  };

  const handleDurationAdjust = (deltaMinutes: number) => {
    const computed = applyDurationFromStart(
      timeStart,
      duration + deltaMinutes
    );
    setDuration(computed.duration);
    setTimeEnd(computed.end);
  };

  const handleTimeAdjustModeChange = (nextMode: 'end_time' | 'duration') => {
    setTimeAdjustMode(nextMode);
    if (nextMode === 'duration') {
      const computed = applyDurationFromStart(timeStart, duration || 60);
      setDuration(computed.duration);
      setTimeEnd(computed.end);
    }
  };

  const getCategoryIcon = (category: string) => {
    const cat = CATEGORIES.find((c) => c.value === category);
    return cat ? cat.icon : 'map-marker';
  };

  const toggleCategory = (category: string) => {
    setSelectedCategories((previous) =>
      previous.includes(category)
        ? previous.filter((item) => item !== category)
        : [...previous, category]
    );
  };

  const openGoogleMaps = (url: string | null | undefined) => {
    if (!url) {
      return;
    }

    Linking.openURL(url).catch((error) => {
      console.error('Failed to open Google Maps:', error);
    });
  };

  const openTikTok = (placeName: string) => {
    const searchQuery = provinceName ? `${placeName} ${provinceName}` : placeName;
    const tiktokUrl = `snssdk1180://search?keyword=${encodeURIComponent(searchQuery)}`;

    Linking.openURL(tiktokUrl).catch((error) => {
      console.error('Failed to open TikTok:', error);
      Alert.alert('TikTok unavailable', 'Please install TikTok to use this feature.');
    });
  };

  const openPhotoViewer = (index: number) => {
    setSelectedPhotoIndex(index);
    setPhotoViewerVisible(true);
  };

  const modalMaxHeight = windowHeight * 0.9;
  const browseFallbackHeight = windowHeight * 0.78;
  const selectedFallbackHeight = windowHeight * 0.84;

  const measuredBrowseHeight =
    headerHeight > 0 && browseContentHeight > 0
      ? Math.min(modalMaxHeight, headerHeight + browseContentHeight)
      : Math.min(browseFallbackHeight, modalMaxHeight);

  const measuredSelectedHeight =
    headerHeight > 0 && buttonHeight > 0 && selectedContentHeight > 0
      ? Math.min(modalMaxHeight, headerHeight + buttonHeight + selectedContentHeight)
      : Math.min(selectedFallbackHeight, modalMaxHeight);

  const targetModalHeight = selectedPlace ? measuredSelectedHeight : measuredBrowseHeight;

  useEffect(() => {
    Animated.timing(animatedModalHeight, {
      toValue: targetModalHeight,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [animatedModalHeight, targetModalHeight]);

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={[styles.modal, { maxHeight: modalMaxHeight }]}
      >
        <Animated.View
          style={[
            styles.modalContent,
            { backgroundColor: theme.colors.surface },
            { height: animatedModalHeight },
          ]}
        >
          <View style={styles.header} onLayout={(event) => setHeaderHeight(event.nativeEvent.layout.height)}>
            <View style={styles.headerTextContainer}>
              <Text variant="headlineSmall" style={styles.title}>
                {mode === 'add' ? 'Add Activity' : 'Replace Activity'}
              </Text>
              {mode === 'add' ? (
                <Text variant="bodySmall" style={styles.scopeText}>
                  {provinceName || provinceSlug}
                </Text>
              ) : null}
            </View>
            <IconButton icon="close" size={24} onPress={onDismiss} />
          </View>

          {!selectedPlace ? (
          <>
            <ScrollView 
              style={styles.content}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={(_, height) => setBrowseContentHeight(height)}
            >
              <View style={styles.searchSection}>
                <Searchbar
                  placeholder="Search places..."
                  onChangeText={setSearchQuery}
                  value={searchQuery}
                  style={styles.searchBar}
                />

                <View style={styles.categories}>
                  <Chip
                    selected={selectedCategories.length === 0}
                    onPress={() => setSelectedCategories([])}
                    style={[
                      styles.categoryChip,
                      selectedCategories.length === 0 && selectedChipStyle,
                    ]}
                    textStyle={selectedCategories.length === 0 ? selectedChipTextStyle : undefined}
                    showSelectedCheck
                    mode={selectedCategories.length === 0 ? 'flat' : 'outlined'}
                  >
                    All
                  </Chip>
                  {CATEGORIES.map((cat) => (
                    <Chip
                      key={cat.value}
                      selected={selectedCategories.includes(cat.value)}
                      onPress={() => toggleCategory(cat.value)}
                      icon={cat.icon as any}
                      style={[
                        styles.categoryChip,
                        selectedCategories.includes(cat.value) && selectedChipStyle,
                      ]}
                      textStyle={selectedCategories.includes(cat.value) ? selectedChipTextStyle : undefined}
                      showSelectedCheck
                      mode={selectedCategories.includes(cat.value) ? 'flat' : 'outlined'}
                    >
                      {cat.label}
                    </Chip>
                  ))}
                </View>

                {proximityHintText && (
                  <Text variant="bodySmall" style={styles.proximityHintText}>
                    {proximityHintText}
                  </Text>
                )}
              </View>

              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={theme.colors.primary} />
                  <Text style={styles.loadingText}>Loading places...</Text>
                </View>
              ) : (
                <View style={styles.placesListContainer}>
                  {filteredPlaces.map((item, index) => (
                    <List.Item
                      key={item.google_place_id || `${item.name}-${index}`}
                      title={item.name}
                      description={() => (
                        <View style={styles.placeDescriptionContainer}>
                          <Text
                            variant="bodySmall"
                            style={styles.placeAddressText}
                            numberOfLines={1}
                            ellipsizeMode="tail"
                          >
                            {item.address || 'Address not available'}
                          </Text>
                          <Text variant="bodyMedium" style={styles.placeCategoryText}>
                            {item.category_display}
                          </Text>
                          {referencePoint && (
                            <Text
                              variant="labelSmall"
                              style={[styles.nearestBadgeText, { color: theme.colors.onSecondaryContainer }]}
                            >
                              Nearest to timeline context
                            </Text>
                          )}
                        </View>
                      )}
                      left={() => (
                        <MaterialCommunityIcons
                          name={getCategoryIcon(item.category) as any}
                          size={24}
                          color={theme.colors.primary}
                          style={styles.placeIcon}
                        />
                      )}
                      right={() =>
                        item.rating != null && typeof item.rating === 'number' ? (
                          <View style={styles.rating}>
                            <MaterialCommunityIcons name="star" size={16} color={theme.colors.secondary} />
                            <Text>{item.rating.toFixed(1)}</Text>
                          </View>
                        ) : null
                      }
                      onPress={() => handleSelectPlace(item)}
                      onLongPress={() =>
                        Alert.alert(
                          item.name,
                          item.address || 'Address not available'
                        )
                      }
                      style={styles.placeItem}
                    />
                  ))}
                  {filteredPlaces.length === 0 && (
                    <View style={styles.emptyContainer}>
                      <Text>No places found</Text>
                    </View>
                  )}
                </View>
              )}
            </ScrollView>
          </>
        ) : (
          <>
            <ScrollView
              style={styles.content}
              contentContainerStyle={styles.selectedContentContainer}
              showsVerticalScrollIndicator={false}
              scrollEnabled
              onContentSizeChange={(_, height) => setSelectedContentHeight(height)}
            >
              <View
                style={[
                  styles.selectionSummaryCard,
                  {
                    borderColor: theme.colors.outlineVariant,
                    backgroundColor: theme.colors.surfaceVariant,
                  },
                ]}
              >
                {mode === 'replace' ? (
                  <>
                    <Text variant="labelLarge" style={styles.selectionSummaryTitle}>
                      Replacing activity
                    </Text>
                    {!!activityToReplace?.place_detail?.google_maps_url ? (
                      <Pressable
                        onPress={() => openGoogleMaps(activityToReplace.place_detail?.google_maps_url)}
                        hitSlop={6}
                      >
                        <View style={styles.selectionSummaryPlaceRow}>
                          <MaterialCommunityIcons
                            name={getCategoryIcon(activityToReplace?.place_detail?.category || '') as any}
                            size={22}
                            color={theme.colors.primary}
                          />
                          <View style={styles.selectionSummaryPlaceTextWrap}>
                            <Text
                              variant="bodyMedium"
                              style={[styles.selectionToText, styles.selectionFromLink]}
                              numberOfLines={2}
                            >
                              {activityToReplace?.location_name || activityToReplace?.title || 'Current activity'}
                            </Text>
                            {!!(activityToReplace?.location_address || activityToReplace?.place_detail?.address) && (
                              <Text variant="bodySmall" style={styles.selectionSummaryAddress} numberOfLines={2}>
                                {activityToReplace?.location_address || activityToReplace?.place_detail?.address}
                              </Text>
                            )}
                          </View>
                        </View>
                      </Pressable>
                    ) : (
                      <View style={styles.selectionSummaryPlaceRow}>
                        <MaterialCommunityIcons
                          name={getCategoryIcon(activityToReplace?.place_detail?.category || '') as any}
                          size={22}
                          color={theme.colors.primary}
                        />
                        <View style={styles.selectionSummaryPlaceTextWrap}>
                          <Text variant="bodyMedium" style={styles.selectionToText} numberOfLines={2}>
                            {activityToReplace?.location_name || activityToReplace?.title || 'Current activity'}
                          </Text>
                          {!!(activityToReplace?.location_address || activityToReplace?.place_detail?.address) && (
                            <Text variant="bodySmall" style={styles.selectionSummaryAddress} numberOfLines={2}>
                              {activityToReplace?.location_address || activityToReplace?.place_detail?.address}
                            </Text>
                          )}
                        </View>
                      </View>
                    )}

                    <View style={styles.selectionArrowRow}>
                      <MaterialCommunityIcons name="swap-vertical" size={22} color={theme.colors.primary} />
                    </View>
                    <View style={styles.selectionSummaryPlaceRow}>
                      <MaterialCommunityIcons
                        name={getCategoryIcon(selectedPlace.category) as any}
                        size={22}
                        color={theme.colors.primary}
                      />
                      <View style={styles.selectionSummaryPlaceTextWrap}>
                        <Text variant="bodyMedium" style={styles.selectionToText} numberOfLines={2}>
                          {selectedPlace.name}
                        </Text>
                        {!!selectedPlace.address && (
                          <Text variant="bodySmall" style={styles.selectionSummaryAddress} numberOfLines={2}>
                            {selectedPlace.address}
                          </Text>
                        )}
                      </View>
                    </View>
                  </>
                ) : (
                  <>
                    <Text variant="labelLarge" style={styles.selectionSummaryTitle}>
                      Adding activity
                    </Text>
                    <View style={styles.selectionSummaryPlaceRow}>
                      <MaterialCommunityIcons
                        name={getCategoryIcon(selectedPlace.category) as any}
                        size={22}
                        color={theme.colors.primary}
                      />
                      <View style={styles.selectionSummaryPlaceTextWrap}>
                        <Text variant="bodyMedium" style={styles.selectionToText} numberOfLines={2}>
                          {selectedPlace.name}
                        </Text>
                        {!!selectedPlace.address && (
                          <Text variant="bodySmall" style={styles.selectionSummaryAddress} numberOfLines={2}>
                            {selectedPlace.address}
                          </Text>
                        )}
                      </View>
                    </View>
                  </>
                )}
              </View>

              <Button
                mode="text"
                onPress={() => setShowMoreDetails((previous) => !previous)}
                icon={showMoreDetails ? 'chevron-up' : 'chevron-down'}
                compact
                style={styles.moreDetailsToggle}
              >
                {showMoreDetails ? 'Hide details' : 'Show more details'}
              </Button>

              {showMoreDetails && (
                <View
                  style={[
                    styles.inlineDetailsSection,
                    {
                      borderColor: theme.colors.outlineVariant,
                      backgroundColor: theme.colors.surface,
                    },
                  ]}
                >
                  <View style={styles.badgesRow}>
                    <Chip icon="tag" style={styles.detailChip} compact>
                      {selectedPlace.category_display}
                    </Chip>
                    {selectedPlace.rating != null && typeof selectedPlace.rating === 'number' && (
                      <Chip icon="star" style={styles.detailChip} compact>
                        {selectedPlace.rating.toFixed(1)} ({selectedPlace.total_ratings || 0})
                      </Chip>
                    )}
                    {selectedPlace.price_level !== null && (
                      <Chip icon="cash" style={styles.detailChip} compact>
                        {selectedPlace.price_level_display}
                      </Chip>
                    )}
                  </View>

                  {!!selectedPlace.description && (
                    <Text variant="bodySmall" style={styles.selectedPlaceDescription}>
                      {selectedPlace.description}
                    </Text>
                  )}

                  {!!selectedPlace.photos?.length && (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={styles.photosContainer}
                      contentContainerStyle={styles.photosContent}
                    >
                      {selectedPlace.photos.map((photo, index) => (
                        <Pressable key={`${selectedPlace.google_place_id}-photo-${index}`} onPress={() => openPhotoViewer(index)}>
                          <Image source={{ uri: photo }} style={styles.photo} resizeMode="cover" />
                        </Pressable>
                      ))}
                    </ScrollView>
                  )}

                  {!!selectedPlace.address && (
                    <Text variant="bodySmall" style={styles.selectedPlaceAddress}>
                      {selectedPlace.address}
                    </Text>
                  )}

                  {selectedPlace.typical_duration_minutes != null && (
                    <Text variant="bodySmall" style={styles.selectedPlaceMeta}>
                      Typical visit: {Math.floor(selectedPlace.typical_duration_minutes / 60)}h {selectedPlace.typical_duration_minutes % 60}m
                    </Text>
                  )}

                  {!!selectedPlace.google_maps_url && (
                    <Button
                      mode="text"
                      icon="map-marker-outline"
                      onPress={() => openGoogleMaps(selectedPlace.google_maps_url)}
                      compact
                      style={styles.inlineMapsButton}
                    >
                      Open in Google Maps
                    </Button>
                  )}

                  <Button
                    mode="text"
                    icon="music-note"
                    onPress={() => openTikTok(selectedPlace.name)}
                    compact
                    style={styles.inlineMapsButton}
                  >
                    Open in TikTok
                  </Button>
                </View>
              )}

              <Text variant="titleMedium" style={styles.timeSectionTitle}>
                Set Activity Time
              </Text>

              <View
                style={[
                  styles.timeModeToggle,
                  {
                    borderColor: theme.colors.outline,
                    backgroundColor: theme.colors.surfaceVariant,
                  },
                ]}
              >
                <Pressable
                  accessibilityRole="button"
                  onPress={() => handleTimeAdjustModeChange('end_time')}
                  style={[
                    styles.timeModeToggleOption,
                    timeAdjustMode === 'end_time'
                      ? {
                          backgroundColor: theme.colors.primary,
                          borderColor: theme.colors.primary,
                        }
                      : {
                          backgroundColor: 'transparent',
                          borderColor: 'transparent',
                        },
                  ]}
                >
                  <Text
                    variant="labelLarge"
                    style={{
                      color:
                        timeAdjustMode === 'end_time'
                          ? theme.colors.onPrimary
                          : theme.colors.onSurface,
                      fontWeight: '700',
                    }}
                  >
                    End Time
                  </Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  onPress={() => handleTimeAdjustModeChange('duration')}
                  style={[
                    styles.timeModeToggleOption,
                    timeAdjustMode === 'duration'
                      ? {
                          backgroundColor: theme.colors.primary,
                          borderColor: theme.colors.primary,
                        }
                      : {
                          backgroundColor: 'transparent',
                          borderColor: 'transparent',
                        },
                  ]}
                >
                  <Text
                    variant="labelLarge"
                    style={{
                      color:
                        timeAdjustMode === 'duration'
                          ? theme.colors.onPrimary
                          : theme.colors.onSurface,
                      fontWeight: '700',
                    }}
                  >
                    Duration
                  </Text>
                </Pressable>
              </View>

              <View style={styles.timeInputs}>
                <View style={styles.timeInputContainer}>
                  <Text variant="labelLarge">Start Time</Text>
                  <Button
                    mode="outlined"
                    onPress={() => setStartTimePickerVisible(true)}
                    style={styles.timePickerButton}
                    icon="clock-outline"
                  >
                    {formatTo12Hour(timeStart.hours, timeStart.minutes)}
                  </Button>
                </View>

                {timeAdjustMode === 'end_time' ? (
                  <View style={styles.timeInputContainer}>
                    <Text variant="labelLarge">End Time</Text>
                    <Button
                      mode="outlined"
                      onPress={() => setEndTimePickerVisible(true)}
                      style={styles.timePickerButton}
                      icon="clock-outline"
                    >
                      {formatTo12Hour(timeEnd.hours, timeEnd.minutes)}
                    </Button>
                  </View>
                ) : (
                  <View style={styles.timeInputContainer}>
                    <Text variant="labelLarge">Duration</Text>
                    <View style={styles.durationAdjustRow}>
                      <Button
                        mode="outlined"
                        compact
                        onPress={() => handleDurationAdjust(-DURATION_STEP_MINUTES)}
                      >
                        -
                      </Button>
                      <Text variant="bodyLarge" style={styles.durationAdjustValue}>
                        {duration} min
                      </Text>
                      <Button
                        mode="outlined"
                        compact
                        onPress={() => handleDurationAdjust(DURATION_STEP_MINUTES)}
                      >
                        +
                      </Button>
                    </View>
                  </View>
                )}
              </View>

              <View style={[styles.durationInfo, { backgroundColor: theme.colors.secondaryContainer }]}> 
                <MaterialCommunityIcons name="clock-outline" size={20} color={theme.colors.primary} />
                <Text variant="bodyLarge" style={styles.durationText}>
                  Duration: {duration} minutes ({Math.floor(duration / 60)}h {duration % 60}m)
                </Text>
              </View>

              {mode === 'add' && (previousActivity || nextActivity) && (
                <View style={styles.insertPreviewToggleWrap}>
                  <Button
                    mode="text"
                    onPress={() => setShowInsertPreview((previous) => !previous)}
                    icon={showInsertPreview ? 'chevron-up' : 'chevron-down'}
                    compact
                    style={styles.insertPreviewToggle}
                  >
                    Insert Preview
                  </Button>

                  {showInsertPreview && (
                    <View
                      style={[
                        styles.insertPreviewContainer,
                        {
                          borderColor: theme.colors.outlineVariant,
                          backgroundColor: theme.colors.surface,
                        },
                      ]}
                    >
                      {previousActivity && (
                        <View style={styles.insertPreviewRow}>
                          <Text variant="labelSmall" style={styles.insertPreviewTime}>
                            {previousActivity.time_start} - {previousActivity.time_end}
                          </Text>
                          <Text variant="bodySmall" style={styles.insertPreviewText} numberOfLines={1}>
                            {previousActivity.title}
                          </Text>
                        </View>
                      )}

                      <View
                        style={[
                          styles.insertPreviewRow,
                          styles.insertPreviewCurrentRow,
                          { backgroundColor: theme.colors.secondaryContainer },
                        ]}
                      >
                        <Text variant="labelSmall" style={[styles.insertPreviewTime, styles.insertPreviewCurrentTime]}>
                          {formatTo12Hour(timeStart.hours, timeStart.minutes)} - {formatTo12Hour(timeEnd.hours, timeEnd.minutes)}
                        </Text>
                        <Text variant="bodySmall" style={[styles.insertPreviewText, styles.insertPreviewCurrentText]} numberOfLines={1}>
                          {selectedPlace.name}
                        </Text>
                      </View>

                      {nextActivity && (
                        <View style={styles.insertPreviewRow}>
                          <Text variant="labelSmall" style={styles.insertPreviewTime}>
                            {nextActivity.time_start} - {nextActivity.time_end}
                          </Text>
                          <Text variant="bodySmall" style={styles.insertPreviewText} numberOfLines={1}>
                            {nextActivity.title}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              )}

              {mode === 'add' && (
                <Text variant="bodySmall" style={styles.timeHintText}>
                  Suggested based on timeline slot
                </Text>
              )}

              <Text variant="bodySmall" style={styles.adjustmentHintText}>
                AI will intelligently adjust the whole day's itinerary based on this {mode === 'add' ? 'added' : 'replaced'} activity.
              </Text>
            </ScrollView>

            <View
              style={styles.buttonContainer}
              onLayout={(event) => setButtonHeight(event.nativeEvent.layout.height)}
            >
              <View style={styles.actions}>
                <Button mode="outlined" onPress={() => setSelectedPlace(null)} style={styles.actionButton}>
                  Back
                </Button>
                <Button mode="contained" onPress={handleSave} style={styles.actionButton} icon="check">
                  Save
                </Button>
              </View>
            </View>
          </>
        )}
        </Animated.View>
      </Modal>

      {/* Time Pickers */}
      <TimePickerModal
        visible={startTimePickerVisible}
        onDismiss={() => setStartTimePickerVisible(false)}
        onConfirm={handleStartTimeConfirm}
        hours={timeStart.hours}
        minutes={timeStart.minutes}
        label="Select start time"
        cancelLabel="Cancel"
        confirmLabel="OK"
        animationType="fade"
      />

      <TimePickerModal
        visible={endTimePickerVisible && timeAdjustMode === 'end_time'}
        onDismiss={() => setEndTimePickerVisible(false)}
        onConfirm={handleEndTimeConfirm}
        hours={timeEnd.hours}
        minutes={timeEnd.minutes}
        label="Select end time"
        cancelLabel="Cancel"
        confirmLabel="OK"
        animationType="fade"
      />

      <PhotoViewerModal
        visible={photoViewerVisible}
        photos={selectedPlace?.photos || []}
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
  headerTextContainer: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontWeight: 'bold',
  },
  scopeText: {
    opacity: 0.7,
    marginTop: 2,
  },
  selectionSummaryCard: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    backgroundColor: '#FAFAFA',
  },
  selectionSummaryTitle: {
    fontWeight: '700',
    marginBottom: 6,
  },
  selectionSummaryPlaceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectionSummaryPlaceTextWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  selectionSummaryLabel: {
    opacity: 0.72,
    marginTop: 2,
  },
  selectionFromLink: {
    textDecorationLine: 'underline',
  },
  selectionArrowRow: {
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    marginBottom: 2,
  },
  selectionToText: {
    fontWeight: '700',
    marginTop: 2,
  },
  selectionSummaryAddress: {
    opacity: 0.72,
    marginTop: 2,
  },
  moreDetailsToggle: {
    alignSelf: 'flex-start',
    marginTop: -2,
    marginBottom: 6,
    marginLeft: -8,
  },
  content: {
    paddingHorizontal: 16,
  },
  selectedContentContainer: {
    paddingBottom: 8,
  },
  buttonContainer: {
    padding: 16,
    paddingTop: 8,
  },
  searchSection: {
    marginBottom: 16,
  },
  searchBar: {
    marginBottom: 12,
  },
  categories: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  categoryChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  selectedChip: {
    backgroundColor: '#B2DFDB',
  },
  selectedChipText: {
    color: '#00695C',
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
  },
  placesListContainer: {
    paddingBottom: 16,
  },
  placeItem: {
    paddingVertical: 8,
  },
  placeDescriptionContainer: {
    marginTop: 2,
  },
  placeCategoryText: {
    opacity: 0.9,
  },
  nearestBadgeText: {
    color: '#00695C',
    marginTop: 2,
    fontWeight: '600',
  },
  placeAddressText: {
    opacity: 0.7,
  },
  placeIcon: {
    marginRight: 8,
    marginTop: 8,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  inlineDetailsSection: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    padding: 10,
    marginBottom: 16,
    backgroundColor: '#FAFAFA',
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  detailChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  selectedPlaceDescription: {
    lineHeight: 20,
    marginBottom: 8,
  },
  photosContainer: {
    marginBottom: 10,
  },
  photosContent: {
    gap: 8,
    paddingBottom: 2,
  },
  photo: {
    width: 86,
    height: 86,
    borderRadius: 8,
  },
  selectedPlaceAddress: {
    opacity: 0.8,
    marginBottom: 6,
  },
  selectedPlaceMeta: {
    opacity: 0.85,
    marginBottom: 4,
  },
  inlineMapsButton: {
    alignSelf: 'flex-start',
    marginLeft: -8,
  },
  timeSectionTitle: {
    fontWeight: 'bold',
    marginBottom: 10,
    marginTop: 8,
  },
  timeModeToggle: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  timeModeToggleOption: {
    flex: 1,
    minHeight: 36,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insertPreviewToggleWrap: {
    marginBottom: 10,
  },
  insertPreviewToggle: {
    alignSelf: 'flex-start',
    marginLeft: -8,
    marginBottom: 4,
  },
  timeInputs: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  timeInputContainer: {
    flex: 1,
  },
  durationAdjustRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  durationAdjustValue: {
    fontWeight: '700',
    minWidth: 76,
    textAlign: 'center',
  },
  timePickerButton: {
    marginTop: 8,
    justifyContent: 'center',
  },
  durationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    marginBottom: 24,
  },
  durationText: {
    marginLeft: 8,
    fontWeight: '500',
  },
  timeHintText: {
    opacity: 0.7,
    marginBottom: 8,
  },
  proximityHintText: {
    opacity: 0.72,
    marginTop: 2,
  },
  adjustmentHintText: {
    opacity: 0.75,
    marginBottom: 12,
  },
  insertPreviewContainer: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 10,
    marginBottom: 6,
    gap: 6,
    backgroundColor: '#FFFFFF',
  },
  insertPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  insertPreviewCurrentRow: {
    backgroundColor: '#E3F2FD',
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  insertPreviewTime: {
    minWidth: 108,
    opacity: 0.75,
  },
  insertPreviewCurrentTime: {
    opacity: 1,
    fontWeight: '600',
  },
  insertPreviewText: {
    flex: 1,
    opacity: 0.85,
  },
  insertPreviewCurrentText: {
    fontWeight: '600',
    opacity: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
});

// Place search bottom sheet component for adding/replacing activities

import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, ScrollView, useWindowDimensions } from 'react-native';
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
  TextInput,
  IconButton,
} from 'react-native-paper';
import { TimePickerModal } from 'react-native-paper-dates';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { provincesApi } from '../../services/api/provinces';
import type { IPlace } from '../../types/dtos/province';
import type { IItineraryActivity } from '../../types/dtos/itinerary';
import { PlaceDetailModal } from '../PlaceDetailModal';

interface PlaceSearchBottomSheetProps {
  visible: boolean;
  onDismiss: () => void;
  onSave: (data: {
    place: IPlace;
    time_start: string;
    time_end: string;
    duration_minutes: number;
  }) => void;
  provinceSlug: string;
  provinceName?: string;
  mode: 'add' | 'replace';
  activityToReplace?: IItineraryActivity | null;
}

const CATEGORIES = [
  { value: 'beach', label: 'Beach', icon: 'beach' },
  { value: 'restaurant', label: 'Restaurant', icon: 'silverware-fork-knife' },
  { value: 'attraction', label: 'Attraction', icon: 'camera' },
  { value: 'activity', label: 'Activity', icon: 'run' },
  { value: 'nature', label: 'Nature', icon: 'tree' },
  { value: 'landmark', label: 'Landmark', icon: 'bank' },
];

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

export const PlaceSearchBottomSheet: React.FC<PlaceSearchBottomSheetProps> = ({
  visible,
  onDismiss,
  onSave,
  provinceSlug,
  provinceName,
  mode,
  activityToReplace,
}) => {
  const theme = useTheme();
  const { height: windowHeight } = useWindowDimensions();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [places, setPlaces] = useState<IPlace[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<IPlace | null>(null);
  const [placeDetailVisible, setPlaceDetailVisible] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [buttonHeight, setButtonHeight] = useState(0);
  const [selectedContentHeight, setSelectedContentHeight] = useState(0);
  
  // Time picker state
  const [startTimePickerVisible, setStartTimePickerVisible] = useState(false);
  const [endTimePickerVisible, setEndTimePickerVisible] = useState(false);
  
  // Time inputs - store in 24-hour format internally
  const [timeStart, setTimeStart] = useState({ hours: 9, minutes: 0 });
  const [timeEnd, setTimeEnd] = useState({ hours: 10, minutes: 0 });
  const [duration, setDuration] = useState(60);

  useEffect(() => {
    if (visible) {
      fetchPlaces();
      // Reset state when opening
      setSearchQuery('');
      setSelectedCategories([]);
      setSelectedPlace(null);
      setPlaceDetailVisible(false);
      
      // Pre-fill times if replacing activity
      if (mode === 'replace' && activityToReplace) {
        const start = parse12HourTime(activityToReplace.time_start);
        const end = parse12HourTime(activityToReplace.time_end);
        setTimeStart(start);
        setTimeEnd(end);
        setDuration(activityToReplace.duration_minutes);
      } else {
        setTimeStart({ hours: 9, minutes: 0 });
        setTimeEnd({ hours: 10, minutes: 0 });
        setDuration(60);
      }
    }
  }, [visible, provinceSlug, mode, activityToReplace]);

  useEffect(() => {
    // Calculate duration when times change
    const startMinutes = timeStart.hours * 60 + timeStart.minutes;
    const endMinutes = timeEnd.hours * 60 + timeEnd.minutes;
    if (endMinutes > startMinutes) {
      setDuration(endMinutes - startMinutes);
    }
  }, [timeStart, timeEnd]);

  const fetchPlaces = async () => {
    try {
      setLoading(true);
      const data = await provincesApi.getProvincePlaces(provinceSlug);
      setPlaces(data);
    } catch (error) {
      console.error('Error fetching places:', error);
    } finally {
      setLoading(false);
    }
  };

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

    return filtered;
  }, [places, searchQuery, selectedCategories]);

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
    setTimeStart({ hours, minutes });
    setStartTimePickerVisible(false);
  };

  const handleEndTimeConfirm = ({ hours, minutes }: { hours: number; minutes: number }) => {
    setTimeEnd({ hours, minutes });
    setEndTimePickerVisible(false);
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

  const modalMaxHeight = windowHeight * 0.9;
  const browseModalHeight = windowHeight * 0.78;
  const selectedTotalHeight = headerHeight + buttonHeight + selectedContentHeight;
  const selectedNeedsScroll = selectedTotalHeight > modalMaxHeight;
  const selectedModalHeight =
    selectedPlace && headerHeight > 0 && buttonHeight > 0 && selectedContentHeight > 0
      ? Math.min(selectedTotalHeight, modalMaxHeight)
      : undefined;
  const currentModalHeight = selectedPlace
    ? selectedModalHeight ?? modalMaxHeight
    : Math.min(browseModalHeight, modalMaxHeight);

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
            { height: currentModalHeight },
          ]}
        >
          <View style={styles.header} onLayout={(event) => setHeaderHeight(event.nativeEvent.layout.height)}>
            <Text variant="headlineSmall" style={styles.title}>
              {mode === 'add' ? 'Add Activity' : 'Replace Activity'}
            </Text>
            <IconButton icon="close" size={24} onPress={onDismiss} />
          </View>

          {!selectedPlace ? (
          <>
            <ScrollView 
              style={styles.content}
              showsVerticalScrollIndicator={false}
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
                      selectedCategories.length === 0 && styles.selectedChip,
                    ]}
                    textStyle={selectedCategories.length === 0 ? styles.selectedChipText : undefined}
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
                        selectedCategories.includes(cat.value) && styles.selectedChip,
                      ]}
                      textStyle={selectedCategories.includes(cat.value) ? styles.selectedChipText : undefined}
                      showSelectedCheck
                      mode={selectedCategories.includes(cat.value) ? 'flat' : 'outlined'}
                    >
                      {cat.label}
                    </Chip>
                  ))}
                </View>
              </View>

              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={theme.colors.primary} />
                  <Text style={styles.loadingText}>Loading places...</Text>
                </View>
              ) : (
                <View style={styles.placesListContainer}>
                  {filteredPlaces.map((item) => (
                    <List.Item
                      key={item.id}
                      title={item.name}
                      description={item.category_display}
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
                            <MaterialCommunityIcons name="star" size={16} color="#FFC107" />
                            <Text>{item.rating.toFixed(1)}</Text>
                          </View>
                        ) : null
                      }
                      onPress={() => handleSelectPlace(item)}
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
              scrollEnabled={selectedNeedsScroll}
              onContentSizeChange={(_, height) => setSelectedContentHeight(height)}
            >
              <View style={styles.selectedPlace}>
                <MaterialCommunityIcons
                  name={getCategoryIcon(selectedPlace.category) as any}
                  size={32}
                  color={theme.colors.primary}
                />
                <View style={styles.selectedPlaceInfo}>
                  <View style={styles.selectedPlaceHeader}>
                    <Text variant="titleMedium" style={styles.selectedPlaceName}>
                      {selectedPlace.name}
                    </Text>
                    <IconButton
                      icon="information"
                      size={20}
                      onPress={() => setPlaceDetailVisible(true)}
                      style={styles.infoButton}
                    />
                  </View>
                  <Text variant="bodyMedium" style={styles.selectedPlaceCategory}>
                    {selectedPlace.category_display}
                  </Text>
                </View>
              </View>

              <Text variant="titleMedium" style={styles.timeSectionTitle}>
                Set Activity Time
              </Text>

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
              </View>

              <View style={styles.durationInfo}>
                <MaterialCommunityIcons name="clock-outline" size={20} color={theme.colors.primary} />
                <Text variant="bodyLarge" style={styles.durationText}>
                  Duration: {duration} minutes ({Math.floor(duration / 60)}h {duration % 60}m)
                </Text>
              </View>
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
        </View>
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
        visible={endTimePickerVisible}
        onDismiss={() => setEndTimePickerVisible(false)}
        onConfirm={handleEndTimeConfirm}
        hours={timeEnd.hours}
        minutes={timeEnd.minutes}
        label="Select end time"
        cancelLabel="Cancel"
        confirmLabel="OK"
        animationType="fade"
      />

      {/* Place Detail Modal */}
      <PlaceDetailModal
        place={selectedPlace}
        visible={placeDetailVisible}
        onDismiss={() => setPlaceDetailVisible(false)}
        provinceName={provinceName}
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
  selectedPlace: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    marginBottom: 24,
  },
  selectedPlaceInfo: {
    marginLeft: 16,
    flex: 1,
  },
  selectedPlaceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedPlaceName: {
    fontWeight: 'bold',
    flex: 1,
  },
  infoButton: {
    margin: 0,
  },
  selectedPlaceCategory: {
    opacity: 0.7,
    marginTop: 4,
  },
  timeSectionTitle: {
    fontWeight: 'bold',
    marginBottom: 16,
    marginTop: 8,
  },
  timeInputs: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  timeInputContainer: {
    flex: 1,
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
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
});

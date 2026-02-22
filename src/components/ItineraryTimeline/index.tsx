// Itinerary timeline component with day accordion and per-day edit mode

import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, LayoutChangeEvent } from 'react-native';
import { List, Text, Divider, useTheme, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { IItineraryDay, IItineraryActivity } from '../../types/dtos/itinerary';
import type { IPlace } from '../../types/dtos/province';
import { ActivityCard } from '../ActivityCard';
import { VerticalTimelineItem } from '../VerticalTimeline';
import { PlaceDetailModal } from '../PlaceDetailModal/index';
import { PlaceSearchBottomSheet } from '../PlaceSearchBottomSheet';
import { DeleteActivityModal } from '../DeleteActivityModal';
import { ACTIVITY_CATEGORIES } from '../../constants';

interface ItineraryTimelineProps {
  days: IItineraryDay[];
  itineraryId: string;
  provinceSlug: string;
  provinceName: string;
  onActivityAdded?: (dayId: number, data: any) => Promise<void>;
  onActivityReplaced?: (activityId: number, data: any) => Promise<void>;
  onActivityDeleted?: (activityId: number) => Promise<void>;
  isLoading?: boolean;
  onExpandedDayChange?: (dayNumber: number | null) => void;
  onDayHeaderLayout?: (dayNumber: number, layout: { y: number; height: number }) => void;
  collapseSignal?: number;
  onEditingDayChange?: (dayNumber: number | null) => void;
  editToggleSignal?: number;
  editToggleDayNumber?: number | null;
}

export const ItineraryTimeline: React.FC<ItineraryTimelineProps> = ({
  days,
  itineraryId,
  provinceSlug,
  provinceName,
  onActivityAdded,
  onActivityReplaced,
  onActivityDeleted,
  isLoading = false,
  onExpandedDayChange,
  onDayHeaderLayout,
  collapseSignal,
  onEditingDayChange,
  editToggleSignal,
  editToggleDayNumber,
}) => {
  const theme = useTheme();
  const [editingDayId, setEditingDayId] = useState<number | null>(null);
  const [expandedDay, setExpandedDay] = useState<number>(1); // First day expanded by default
  const [selectedPlace, setSelectedPlace] = useState<any>(null);
  
  // Place search modal state
  const [placeSearchVisible, setPlaceSearchVisible] = useState(false);
  const [searchMode, setSearchMode] = useState<'add' | 'replace'>('add');
  const [searchContext, setSearchContext] = useState<{
    dayId?: number;
    activityId?: number;
    insertAfterOrder?: number;
  }>({});
  const [activityBeingReplaced, setActivityBeingReplaced] = useState<IItineraryActivity | null>(null);
  
  // Delete modal state
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [activityToDelete, setActivityToDelete] = useState<IItineraryActivity | null>(null);
  const lastCollapseSignalRef = useRef<number | undefined>(collapseSignal);
  const lastEditToggleSignalRef = useRef<number | undefined>(editToggleSignal);

  const exitEditMode = () => {
    setEditingDayId(null);
    onEditingDayChange?.(null);
  };

  const toggleDay = (dayNumber: number) => {
    const nextExpandedDay = expandedDay === dayNumber ? -1 : dayNumber;

    if (nextExpandedDay === -1) {
      const collapsedDay = days.find((day) => day.day_number === dayNumber);
      if (collapsedDay && editingDayId === collapsedDay.id) {
        exitEditMode();
      }
    }

    setExpandedDay(nextExpandedDay);
    onExpandedDayChange?.(nextExpandedDay === -1 ? null : nextExpandedDay);
  };

  const handleDayHeaderLayout = (dayNumber: number) => (event: LayoutChangeEvent) => {
    const { y, height } = event.nativeEvent.layout;
    onDayHeaderLayout?.(dayNumber, { y, height });
  };

  useEffect(() => {
    if (collapseSignal === undefined) {
      return;
    }

    if (lastCollapseSignalRef.current === collapseSignal) {
      return;
    }

    lastCollapseSignalRef.current = collapseSignal;
    setExpandedDay(-1);
    onExpandedDayChange?.(null);
    if (editingDayId !== null) {
      exitEditMode();
    }
  }, [collapseSignal, editingDayId]);

  const handleAddActivity = (dayId: number, insertAfterOrder?: number) => {
    setSearchMode('add');
    setSearchContext({ dayId, insertAfterOrder });
    setPlaceSearchVisible(true);
  };

  const handleReplaceActivity = (activity: IItineraryActivity) => {
    setSearchMode('replace');
    setSearchContext({ activityId: activity.id });
    setActivityBeingReplaced(activity);
    setPlaceSearchVisible(true);
  };

  const handleDeleteActivity = (activity: IItineraryActivity) => {
    setActivityToDelete(activity);
    setDeleteModalVisible(true);
  };

  const handleSavePlace = async (data: {
    place: IPlace;
    time_start: string;
    time_end: string;
    duration_minutes: number;
  }) => {
    if (searchMode === 'add' && searchContext.dayId && onActivityAdded) {
      await onActivityAdded(searchContext.dayId, {
        place_id: data.place.id,
        time_start: data.time_start,
        time_end: data.time_end,
        duration_minutes: data.duration_minutes,
        insert_after_order: searchContext.insertAfterOrder ?? 0,
      });
    } else if (searchMode === 'replace' && searchContext.activityId && onActivityReplaced) {
      await onActivityReplaced(searchContext.activityId, {
        new_place_id: data.place.id,
        time_start: data.time_start,
        time_end: data.time_end,
        duration_minutes: data.duration_minutes,
      });
    }
    
    setPlaceSearchVisible(false);
    setSearchContext({});
  };

  const handleConfirmDelete = async () => {
    if (activityToDelete && onActivityDeleted) {
      await onActivityDeleted(activityToDelete.id);
    }
    setActivityToDelete(null);
  };

  const toggleEditDay = (dayId: number) => {
    const nextEditingDayId = editingDayId === dayId ? null : dayId;
    setEditingDayId(nextEditingDayId);

    if (nextEditingDayId === null) {
      onEditingDayChange?.(null);
      return;
    }

    const nextDay = days.find((day) => day.id === nextEditingDayId);
    onEditingDayChange?.(nextDay?.day_number ?? null);
  };

  useEffect(() => {
    if (editToggleSignal === undefined) {
      return;
    }

    if (lastEditToggleSignalRef.current === editToggleSignal) {
      return;
    }

    lastEditToggleSignalRef.current = editToggleSignal;

    if (!editToggleDayNumber) {
      return;
    }

    const targetDay = days.find((day) => day.day_number === editToggleDayNumber);
    if (!targetDay) {
      return;
    }

    toggleEditDay(targetDay.id);
  }, [days, editToggleDayNumber, editToggleSignal]);

  return (
    <>
      <View style={styles.container}>
        {(days || []).map((day, index) => {
          const isExpanded = expandedDay === day.day_number;
          const isEditingThisDay = editingDayId === day.id;

          return (
            <View key={day.id} onLayout={handleDayHeaderLayout(day.day_number)}>
              <List.Accordion
                title={`Day ${day.day_number} - ${day.date_display}`}
                description={day.theme}
                expanded={isExpanded}
                onPress={() => toggleDay(day.day_number)}
                left={(props) => (
                  <View style={[styles.accordionLeftIcon, props.style]}>
                    <MaterialCommunityIcons
                      name="calendar-today"
                      size={24}
                      color={props.color || theme.colors.primary}
                    />
                  </View>
                )}
                style={[
                  styles.accordion,
                  isExpanded && { backgroundColor: theme.colors.primaryContainer },
                ]}
                titleStyle={styles.accordionTitle}
                descriptionStyle={styles.accordionDescription}
              >
                <View style={styles.dayContent}>
                  {day.summary && (
                    <Text variant="bodyLarge" style={styles.daySummary}>
                      {day.summary}
                    </Text>
                  )}

                  <View style={styles.activities}>
                    {/* Insert button at the beginning */}
                    {isEditingThisDay && (
                      <Button
                        mode="outlined"
                        icon="plus"
                        onPress={() => handleAddActivity(day.id, undefined)}
                        style={styles.insertButton}
                        compact
                      >
                        Add activity at start
                      </Button>
                    )}

                    {(day.activities || []).map((activity, activityIndex) => (
                      <View key={activity.id}>
                        <VerticalTimelineItem
                          startTime={activity.time_start}
                          endTime={activity.time_end}
                          durationMinutes={activity.duration_minutes}
                          markerColor={
                            ACTIVITY_CATEGORIES[activity.category]?.color || theme.colors.primary
                          }
                          isFirst={activityIndex === 0}
                          isLast={activityIndex === day.activities.length - 1}
                        >
                          <ActivityCard
                            activity={activity}
                            showTime={false}
                            onViewPlace={
                              activity.place_detail
                                ? () => setSelectedPlace(activity.place_detail)
                                : undefined
                            }
                            isEditing={isEditingThisDay}
                            onReplace={() => handleReplaceActivity(activity)}
                            onDelete={() => handleDeleteActivity(activity)}
                          />
                        </VerticalTimelineItem>
                        
                        {/* Insert button after each activity */}
                        {isEditingThisDay && (
                          <Button
                            mode="outlined"
                            icon="plus"
                            onPress={() => handleAddActivity(day.id, activity.order)}
                            style={styles.insertButton}
                            compact
                          >
                            Add activity after
                          </Button>
                        )}
                      </View>
                    ))}
                  </View>
                </View>
              </List.Accordion>

              {index < days.length - 1 && <Divider />}
            </View>
          );
        })}
      </View>

      <PlaceDetailModal
        place={selectedPlace}
        visible={!!selectedPlace}
        onDismiss={() => setSelectedPlace(null)}
        provinceName={provinceName}
      />

      <PlaceSearchBottomSheet
        visible={placeSearchVisible}
        onDismiss={() => {
          setPlaceSearchVisible(false);
          setSearchContext({});
          setActivityBeingReplaced(null);
        }}
        onSave={handleSavePlace}
        provinceSlug={provinceSlug}
        provinceName={provinceName}
        mode={searchMode}
        activityToReplace={activityBeingReplaced}
      />

      <DeleteActivityModal
        visible={deleteModalVisible}
        onDismiss={() => {
          setDeleteModalVisible(false);
          setActivityToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        activityName={activityToDelete?.title}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  accordion: {
    paddingVertical: 8,
  },
  accordionLeftIcon: {
    width: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  accordionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  accordionDescription: {
    fontSize: 16,
    marginTop: 4,
  },
  dayContent: {
    paddingVertical: 12,
    paddingTop: 8,
    paddingLeft: 4,
    paddingRight: 16,
    alignSelf: 'stretch',
  },
  daySummary: {
    marginBottom: 16,
    lineHeight: 24,
  },
  activities: {
    marginTop: 4,
    width: '100%',
    alignSelf: 'stretch',
    paddingRight: 4,
  },
  insertButton: {
    marginVertical: 8,
    borderStyle: 'dashed',
    width: '100%',
    alignSelf: 'stretch',
  },
});

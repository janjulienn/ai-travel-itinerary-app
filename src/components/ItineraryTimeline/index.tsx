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
import { getActivityCategoryColor } from '../../theme';

const MINUTES_PER_DAY = 24 * 60;

const parse12HourTimeToMinutes = (timeStr: string): number => {
  const [timePart, period] = timeStr.split(' ');
  let [hours, minutes] = timePart.split(':').map(Number);

  if (period === 'PM' && hours !== 12) {
    hours += 12;
  } else if (period === 'AM' && hours === 12) {
    hours = 0;
  }

  return hours * 60 + minutes;
};

const formatMinutesTo24HourTime = (totalMinutes: number): string => {
  const normalizedMinutes = Math.max(0, Math.min(totalMinutes, MINUTES_PER_DAY - 1));
  const hours = Math.floor(normalizedMinutes / 60);
  const minutes = normalizedMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

const clampOneHourRange = (startMinutes: number): { start: number; end: number } => {
  const clampedStart = Math.max(0, Math.min(startMinutes, MINUTES_PER_DAY - 60));
  return { start: clampedStart, end: clampedStart + 60 };
};

const isTransitActivity = (activity: IItineraryActivity): boolean => {
  const categoryValue = (activity.category || '').toLowerCase();
  const categoryDisplay = (activity.category_display || '').toLowerCase();
  const titleValue = (activity.title || '').toLowerCase();

  return (
    categoryValue === 'travel' ||
    categoryDisplay.includes('travel') ||
    categoryDisplay.includes('transit') ||
    titleValue.includes('travel') ||
    titleValue.includes('transit')
  );
};

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

interface IAdjacentActivitySummary {
  id: number;
  title: string;
  time_start: string;
  time_end: string;
  latitude: number | null;
  longitude: number | null;
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
    suggestedTimeStart?: string;
    suggestedTimeEnd?: string;
    previousActivity?: IAdjacentActivitySummary;
    nextActivity?: IAdjacentActivitySummary;
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
    const targetDay = days.find((day) => day.id === dayId);

    let suggestedTimeStart: string | undefined;
    let suggestedTimeEnd: string | undefined;
    let previousActivitySummary: IAdjacentActivitySummary | undefined;
    let nextActivitySummary: IAdjacentActivitySummary | undefined;

    if (targetDay) {
      const sortedActivities = [...(targetDay.activities || [])].sort((a, b) => a.order - b.order);
      const nonTransitActivities = sortedActivities.filter((activity) => !isTransitActivity(activity));

      if (nonTransitActivities.length > 0) {
        const firstActivity = nonTransitActivities[0];
        const lastActivity = nonTransitActivities[nonTransitActivities.length - 1];

        let startMinutes: number;
        let endMinutes: number;

        if (insertAfterOrder === undefined) {
          const firstStart = parse12HourTimeToMinutes(firstActivity.time_start);
          const oneHourBeforeFirst = clampOneHourRange(firstStart - 60);
          startMinutes = oneHourBeforeFirst.start;
          endMinutes = oneHourBeforeFirst.end;
          nextActivitySummary = {
            id: firstActivity.id,
            title: firstActivity.title,
            time_start: firstActivity.time_start,
            time_end: firstActivity.time_end,
            latitude: firstActivity.place_detail?.latitude ?? null,
            longitude: firstActivity.place_detail?.longitude ?? null,
          };
        } else {
          const previousActivity =
            nonTransitActivities.find((activity) => activity.order === insertAfterOrder) ||
            [...nonTransitActivities]
              .reverse()
              .find((activity) => activity.order < insertAfterOrder);

          const nextActivity = nonTransitActivities.find((activity) => activity.order > insertAfterOrder);

          if (previousActivity) {
            previousActivitySummary = {
              id: previousActivity.id,
              title: previousActivity.title,
              time_start: previousActivity.time_start,
              time_end: previousActivity.time_end,
              latitude: previousActivity.place_detail?.latitude ?? null,
              longitude: previousActivity.place_detail?.longitude ?? null,
            };
          }

          if (nextActivity) {
            nextActivitySummary = {
              id: nextActivity.id,
              title: nextActivity.title,
              time_start: nextActivity.time_start,
              time_end: nextActivity.time_end,
              latitude: nextActivity.place_detail?.latitude ?? null,
              longitude: nextActivity.place_detail?.longitude ?? null,
            };
          }

          if (previousActivity && nextActivity) {
            const previousEnd = parse12HourTimeToMinutes(previousActivity.time_end);
            const nextStart = parse12HourTimeToMinutes(nextActivity.time_start);

            const median = Math.floor((previousEnd + nextStart) / 2);
            const centeredStart = median - 30;
            const centeredEnd = centeredStart + 60;

            if (centeredStart < previousEnd || centeredEnd > nextStart) {
              const fallbackAfterPrevious = clampOneHourRange(previousEnd);
              startMinutes = fallbackAfterPrevious.start;
              endMinutes = fallbackAfterPrevious.end;
            } else {
              const centeredRange = clampOneHourRange(centeredStart);
              startMinutes = centeredRange.start;
              endMinutes = centeredRange.end;
            }
          } else if (previousActivity) {
            const previousEnd = parse12HourTimeToMinutes(previousActivity.time_end);
            const rangeAfterPrevious = clampOneHourRange(previousEnd);
            startMinutes = rangeAfterPrevious.start;
            endMinutes = rangeAfterPrevious.end;
          } else {
            const firstStart = parse12HourTimeToMinutes(firstActivity.time_start);
            const oneHourBeforeFirst = clampOneHourRange(firstStart - 60);
            startMinutes = oneHourBeforeFirst.start;
            endMinutes = oneHourBeforeFirst.end;
          }

          if (!nextActivity && previousActivity?.id === lastActivity.id) {
            const previousEnd = parse12HourTimeToMinutes(previousActivity.time_end);
            const afterLast = clampOneHourRange(previousEnd);
            startMinutes = afterLast.start;
            endMinutes = afterLast.end;
          }
        }

        suggestedTimeStart = formatMinutesTo24HourTime(startMinutes);
        suggestedTimeEnd = formatMinutesTo24HourTime(endMinutes);
      }
    }

    setSearchMode('add');
    setSearchContext({
      dayId,
      insertAfterOrder,
      suggestedTimeStart,
      suggestedTimeEnd,
      previousActivity: previousActivitySummary,
      nextActivity: nextActivitySummary,
    });
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
        google_place_id: data.place.google_place_id,
        time_start: data.time_start,
        time_end: data.time_end,
        duration_minutes: data.duration_minutes,
        insert_after_order: searchContext.insertAfterOrder ?? 0,
      });
    } else if (searchMode === 'replace' && searchContext.activityId && onActivityReplaced) {
      await onActivityReplaced(searchContext.activityId, {
        new_google_place_id: data.place.google_place_id,
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
          const nonTransitActivities = (day.activities || []).filter((activity) => !isTransitActivity(activity));
          const displayedActivities = isEditingThisDay
            ? nonTransitActivities
            : (day.activities || []);

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
                  {
                    backgroundColor: isExpanded ? theme.colors.surface : theme.colors.background,
                    borderColor: theme.colors.outlineVariant,
                  },
                ]}
                titleStyle={[
                  styles.accordionTitle,
                  { color: theme.colors.onSurface },
                  !isExpanded && styles.accordionTitleCollapsed,
                ]}
                descriptionStyle={[
                  styles.accordionDescription,
                  { color: theme.colors.onSurfaceVariant },
                  !isExpanded && styles.accordionDescriptionCollapsed,
                ]}
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

                    {displayedActivities.map((activity, activityIndex) => (
                      <View key={activity.id}>
                        <VerticalTimelineItem
                          startTime={activity.time_start}
                          endTime={activity.time_end}
                          durationMinutes={activity.duration_minutes}
                          markerColor={
                            getActivityCategoryColor(theme, activity.category)
                          }
                          isFirst={activityIndex === 0}
                          isLast={activityIndex === displayedActivities.length - 1}
                        >
                          {isTransitActivity(activity) ? (
                            <View style={[styles.transitRow, { borderColor: theme.colors.outlineVariant }]}> 
                              <View style={styles.transitContentRow}>
                                <MaterialCommunityIcons
                                  name="car"
                                  size={18}
                                  color={theme.colors.primary}
                                  style={styles.transitIcon}
                                />
                                <Text variant="labelMedium" style={[styles.transitLabel, { color: theme.colors.primary }]}> 
                                  Travel / Transit
                                </Text>
                              </View>
                            </View>
                          ) : (
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
                          )}
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
        initialAddTimeStart={searchContext.suggestedTimeStart}
        initialAddTimeEnd={searchContext.suggestedTimeEnd}
        previousActivity={searchContext.previousActivity}
        nextActivity={searchContext.nextActivity}
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
    borderBottomWidth: 1,
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
  accordionTitleCollapsed: {
    fontWeight: '800',
  },
  accordionDescription: {
    fontSize: 16,
    marginTop: 4,
  },
  accordionDescriptionCollapsed: {
    fontWeight: '600',
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
  transitRow: {
    borderWidth: 1,
    borderRadius: 10,
    borderStyle: 'dashed',
    marginVertical: 6,
    minHeight: 64,
    paddingVertical: 10,
    paddingHorizontal: 12,
    width: '100%',
    justifyContent: 'center',
  },
  transitLabel: {
    fontWeight: '700',
    fontSize: 15,
    lineHeight: 22,
  },
  transitContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  transitIcon: {
    marginRight: 8,
  },
});

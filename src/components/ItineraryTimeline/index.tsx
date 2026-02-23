// Itinerary timeline component with day accordion and per-day edit mode

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  LayoutChangeEvent,
  ScrollView,
  Linking,
  Pressable,
  Image,
  Animated,
  Easing,
  useWindowDimensions,
} from 'react-native';
import { List, Text, Divider, useTheme, Button, Portal, Modal } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { TimePickerModal } from 'react-native-paper-dates';
import type { IItineraryDay, IItineraryActivity } from '../../types/dtos/itinerary';
import type { IPlace } from '../../types/dtos/province';
import { ActivityCard } from '../ActivityCard';
import { VerticalTimelineItem } from '../VerticalTimeline';
import { PlaceDetailModal } from '../PlaceDetailModal/index';
import { PlaceSearchBottomSheet } from '../PlaceSearchBottomSheet';
import { DeleteActivityModal } from '../DeleteActivityModal';
import { getActivityCategoryColor } from '../../theme';

const MINUTES_PER_DAY = 24 * 60;
const TIME_UPDATE_MODAL_VERTICAL_CHROME = 56;
const MIN_DURATION_MINUTES = 15;
const DURATION_STEP_MINUTES = 15;
const DAY_END_MINUTES = 24 * 60 - 1;
const MODAL_RESIZE_ANIMATION_MS = 220;

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

const parseTimeLabelToHoursMinutes = (timeStr: string): { hours: number; minutes: number } => {
  const totalMinutes = parse12HourTimeToMinutes(timeStr);
  return {
    hours: Math.floor(totalMinutes / 60),
    minutes: totalMinutes % 60,
  };
};

const formatTo12Hour = (hours: number, minutes: number): string => {
  const period = hours >= 12 ? 'PM' : 'AM';
  const normalizedHours = hours % 12 || 12;
  return `${normalizedHours}:${String(minutes).padStart(2, '0')} ${period}`;
};

const formatTo24Hour = (hours: number, minutes: number): string => {
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
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

const formatDurationHumanReadable = (totalMinutes: number): string => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes} min`;
  }

  if (minutes === 0) {
    return `${hours} ${hours === 1 ? 'hr' : 'hrs'}`;
  }

  return `${hours} ${hours === 1 ? 'hr' : 'hrs'} ${minutes} min`;
};

const getCategoryIcon = (category: string): string => {
  switch (category) {
    case 'beach':
      return 'beach';
    case 'restaurant':
      return 'silverware-fork-knife';
    case 'attraction':
      return 'camera';
    case 'activity':
      return 'run';
    case 'nature':
      return 'tree';
    case 'landmark':
      return 'bank';
    case 'accommodation':
      return 'home-city';
    case 'food_trip':
      return 'food';
    default:
      return 'map-marker';
  }
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
  provinceCountrySlug: string;
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
  provinceCountrySlug,
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
  const { height: windowHeight } = useWindowDimensions();
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
  const [timeUpdateVisible, setTimeUpdateVisible] = useState(false);
  const [activityBeingTimeUpdated, setActivityBeingTimeUpdated] = useState<IItineraryActivity | null>(null);
  const [timeUpdateError, setTimeUpdateError] = useState<string | null>(null);
  const [timeUpdateStart, setTimeUpdateStart] = useState({ hours: 8, minutes: 0 });
  const [timeUpdateEnd, setTimeUpdateEnd] = useState({ hours: 9, minutes: 0 });
  const [timeUpdateDuration, setTimeUpdateDuration] = useState(60);
  const [timeUpdateMode, setTimeUpdateMode] = useState<'end_time' | 'duration'>('end_time');
  const [timeUpdateStartPickerVisible, setTimeUpdateStartPickerVisible] = useState(false);
  const [timeUpdateEndPickerVisible, setTimeUpdateEndPickerVisible] = useState(false);
  const [timeUpdateShowDetails, setTimeUpdateShowDetails] = useState(false);
  const [timeUpdateHeaderHeight, setTimeUpdateHeaderHeight] = useState(0);
  const [timeUpdateActionHeight, setTimeUpdateActionHeight] = useState(0);
  const [timeUpdateContentHeight, setTimeUpdateContentHeight] = useState(0);
  const lastCollapseSignalRef = useRef<number | undefined>(collapseSignal);
  const lastEditToggleSignalRef = useRef<number | undefined>(editToggleSignal);
  const timeUpdateModalMaxHeight = windowHeight * 0.9;
  const timeUpdateFallbackHeight = Math.min(windowHeight * 0.8, timeUpdateModalMaxHeight);
  const timeUpdateTotalContentHeight =
    timeUpdateHeaderHeight +
    timeUpdateActionHeight +
    timeUpdateContentHeight +
    TIME_UPDATE_MODAL_VERTICAL_CHROME;
  const timeUpdateMeasuredHeight =
    timeUpdateHeaderHeight > 0 && timeUpdateActionHeight > 0 && timeUpdateContentHeight > 0
      ? Math.min(timeUpdateModalMaxHeight, timeUpdateTotalContentHeight)
      : timeUpdateFallbackHeight;
  const timeUpdateNeedsScroll =
    timeUpdateHeaderHeight > 0 &&
    timeUpdateActionHeight > 0 &&
    timeUpdateContentHeight > 0 &&
    timeUpdateTotalContentHeight > timeUpdateModalMaxHeight;
  const timeUpdateAnimatedHeight = useRef(new Animated.Value(timeUpdateFallbackHeight)).current;
  const timeUpdateTargetHeight = timeUpdateMeasuredHeight;

  useEffect(() => {
    Animated.timing(timeUpdateAnimatedHeight, {
      toValue: timeUpdateTargetHeight,
      duration: MODAL_RESIZE_ANIMATION_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [
    timeUpdateTargetHeight,
    timeUpdateAnimatedHeight,
  ]);

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

  const handleOpenTimeUpdate = (activity: IItineraryActivity) => {
    const start = parseTimeLabelToHoursMinutes(activity.time_start);
    const end = parseTimeLabelToHoursMinutes(activity.time_end);

    setActivityBeingTimeUpdated(activity);
    setTimeUpdateStart(start);
    setTimeUpdateEnd(end);
    const startMinutes = toTotalMinutes(start);
    const endMinutes = toTotalMinutes(end);
    setTimeUpdateDuration(Math.max(MIN_DURATION_MINUTES, endMinutes - startMinutes));
    setTimeUpdateMode('end_time');
    setTimeUpdateError(null);
    setTimeUpdateShowDetails(false);
    setTimeUpdateVisible(true);
  };

  const handleDismissTimeUpdate = () => {
    setTimeUpdateVisible(false);
  };

  const openTimeUpdateGoogleMaps = () => {
    const url = activityBeingTimeUpdated?.place_detail?.google_maps_url;
    if (!url) {
      return;
    }

    Linking.openURL(url).catch(() => {
      setTimeUpdateError('Failed to open Google Maps for this place.');
    });
  };

  const openTimeUpdateTikTok = () => {
    const placeName =
      activityBeingTimeUpdated?.place_detail?.name ||
      activityBeingTimeUpdated?.location_name ||
      activityBeingTimeUpdated?.title;

    if (!placeName) {
      return;
    }

    const searchQuery = provinceName ? `${placeName} ${provinceName}` : placeName;
    const tiktokUrl = `snssdk1180://search?keyword=${encodeURIComponent(searchQuery)}`;
    Linking.openURL(tiktokUrl).catch(() => {
      setTimeUpdateError('Please install TikTok to use this feature.');
    });
  };

  const handleTimeUpdateStartConfirm = ({ hours, minutes }: { hours: number; minutes: number }) => {
    setTimeUpdateStartPickerVisible(false);
    const nextStart = { hours, minutes };
    setTimeUpdateStart(nextStart);

    if (timeUpdateMode === 'duration') {
      const computed = applyDurationFromStart(nextStart, timeUpdateDuration);
      setTimeUpdateDuration(computed.duration);
      setTimeUpdateEnd(computed.end);
      return;
    }

    const nextStartMinutes = toTotalMinutes(nextStart);
    const currentEndMinutes = toTotalMinutes(timeUpdateEnd);
    if (currentEndMinutes <= nextStartMinutes) {
      const computed = applyDurationFromStart(nextStart, timeUpdateDuration || 60);
      setTimeUpdateDuration(computed.duration);
      setTimeUpdateEnd(computed.end);
    }
  };

  const handleTimeUpdateEndConfirm = ({ hours, minutes }: { hours: number; minutes: number }) => {
    setTimeUpdateEndPickerVisible(false);

    const endMinutes = toTotalMinutes({ hours, minutes });
    const currentStartMinutes = toTotalMinutes(timeUpdateStart);
    if (endMinutes <= currentStartMinutes) {
      setTimeUpdateError('End time must be after start time.');
      return;
    }

    setTimeUpdateError(null);
    setTimeUpdateEnd({ hours, minutes });
    setTimeUpdateDuration(endMinutes - currentStartMinutes);
  };

  const handleTimeUpdateDurationAdjust = (deltaMinutes: number) => {
    const computed = applyDurationFromStart(
      timeUpdateStart,
      timeUpdateDuration + deltaMinutes
    );
    setTimeUpdateDuration(computed.duration);
    setTimeUpdateEnd(computed.end);
  };

  const handleTimeUpdateModeChange = (nextMode: 'end_time' | 'duration') => {
    setTimeUpdateMode(nextMode);
    if (nextMode === 'duration') {
      const computed = applyDurationFromStart(
        timeUpdateStart,
        timeUpdateDuration || 60
      );
      setTimeUpdateDuration(computed.duration);
      setTimeUpdateEnd(computed.end);
      setTimeUpdateError(null);
    }
  };

  const handleSaveTimeUpdate = async () => {
    if (!activityBeingTimeUpdated || !onActivityReplaced) {
      return;
    }

    const placeId = activityBeingTimeUpdated.place_detail?.google_place_id || activityBeingTimeUpdated.google_place_id;
    if (!placeId) {
      setTimeUpdateError('Cannot update time for this activity because no place ID is available.');
      return;
    }

    const startMinutes = timeUpdateStart.hours * 60 + timeUpdateStart.minutes;
    const endMinutes = timeUpdateEnd.hours * 60 + timeUpdateEnd.minutes;
    if (endMinutes <= startMinutes) {
      setTimeUpdateError('End time must be after start time.');
      return;
    }

    try {
      setTimeUpdateError(null);
      await onActivityReplaced(activityBeingTimeUpdated.id, {
        new_google_place_id: placeId,
        time_start: formatTo24Hour(timeUpdateStart.hours, timeUpdateStart.minutes),
        time_end: formatTo24Hour(timeUpdateEnd.hours, timeUpdateEnd.minutes),
        duration_minutes: timeUpdateMode === 'duration' ? timeUpdateDuration : endMinutes - startMinutes,
      });
      handleDismissTimeUpdate();
    } catch (error) {
      setTimeUpdateError('Failed to update activity time schedule. Please try again.');
    }
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
                        Add activity here
                      </Button>
                    )}

                    {displayedActivities.map((activity, activityIndex) => (
                      <View key={activity.id}>
                        {(() => {
                          const transit = isTransitActivity(activity);
                          return (
                        <VerticalTimelineItem
                          startTime={activity.time_start}
                          endTime={activity.time_end}
                          durationMinutes={activity.duration_minutes}
                          markerColor={
                            getActivityCategoryColor(theme, activity.category)
                          }
                          isFirst={activityIndex === 0}
                          isLast={activityIndex === displayedActivities.length - 1}
                          onPressTimeColumn={
                            isEditingThisDay && !transit
                              ? () => handleOpenTimeUpdate(activity)
                              : undefined
                          }
                          timeColumnDisabled={!isEditingThisDay || transit || isLoading}
                          underlineTimeText={isEditingThisDay && !transit}
                        >
                          {transit ? (
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
                          );
                        })()}
                        
                        {/* Insert button after each activity */}
                        {isEditingThisDay && (
                          <Button
                            mode="outlined"
                            icon="plus"
                            onPress={() => handleAddActivity(day.id, activity.order)}
                            style={styles.insertButton}
                            compact
                          >
                            Add activity here
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
        countrySlug={provinceCountrySlug}
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

      <Portal>
        <Modal
          visible={timeUpdateVisible}
          onDismiss={handleDismissTimeUpdate}
          contentContainerStyle={styles.timeUpdateModalContainer}
        >
          <Animated.View
            style={[
              styles.timeUpdateModalContent,
              { backgroundColor: theme.colors.surface, height: timeUpdateAnimatedHeight },
            ]}
          >
            <View onLayout={(event) => setTimeUpdateHeaderHeight(event.nativeEvent.layout.height)}>
              <Text variant="titleLarge" style={styles.timeUpdateTitle}>
                Update Activity Time
              </Text>
            </View>

            <ScrollView
              style={styles.timeUpdateScroll}
              contentContainerStyle={styles.timeUpdateScrollContent}
              scrollEnabled={timeUpdateNeedsScroll}
              onContentSizeChange={(_, height) => setTimeUpdateContentHeight(height)}
            >
              <View
                style={[
                  styles.timeUpdateDescriptionBox,
                  {
                    borderColor: theme.colors.outlineVariant,
                    backgroundColor: theme.colors.surfaceVariant,
                  },
                ]}
              >
                <Text variant="labelLarge" style={styles.timeUpdateSummaryTitle}>
                  Updating Activity Time Schedule for
                </Text>
                <View style={styles.timeUpdateSummaryPlaceRow}>
                  <MaterialCommunityIcons
                    name={getCategoryIcon(activityBeingTimeUpdated?.place_detail?.category || '') as any}
                    size={22}
                    color={theme.colors.primary}
                  />
                  <View style={styles.timeUpdateSummaryPlaceTextWrap}>
                    <Text variant="bodyMedium" style={styles.timeUpdateSummaryPlace} numberOfLines={2}>
                      {activityBeingTimeUpdated?.location_name || activityBeingTimeUpdated?.place_detail?.name || activityBeingTimeUpdated?.title}
                    </Text>
                    {!!(activityBeingTimeUpdated?.location_address || activityBeingTimeUpdated?.place_detail?.address) && (
                      <Text variant="bodySmall" style={styles.timeUpdateSummaryAddress} numberOfLines={2}>
                        {activityBeingTimeUpdated?.location_address || activityBeingTimeUpdated?.place_detail?.address}
                      </Text>
                    )}
                  </View>
                </View>
              </View>

              <Button
                mode="text"
                onPress={() => setTimeUpdateShowDetails((previous) => !previous)}
                icon={timeUpdateShowDetails ? 'chevron-up' : 'chevron-down'}
                compact
                style={styles.timeUpdateDetailsToggle}
              >
                {timeUpdateShowDetails ? 'Hide details' : 'Show details'}
              </Button>

              {timeUpdateShowDetails && activityBeingTimeUpdated?.place_detail && (
                <View
                  style={[
                    styles.timeUpdateDetailsSection,
                    { borderColor: theme.colors.outlineVariant, backgroundColor: theme.colors.surface },
                  ]}
                >
                  <View style={styles.timeUpdateBadgesRow}>
                    <View
                      style={[
                        styles.timeUpdateChipWrap,
                        {
                          borderColor: theme.colors.outlineVariant,
                          backgroundColor: theme.colors.surfaceVariant,
                        },
                      ]}
                    >
                      <Text variant="bodySmall">{activityBeingTimeUpdated.place_detail.category_display}</Text>
                    </View>
                    {activityBeingTimeUpdated.place_detail.rating != null && (
                      <View
                        style={[
                          styles.timeUpdateChipWrap,
                          {
                            borderColor: theme.colors.outlineVariant,
                            backgroundColor: theme.colors.surfaceVariant,
                          },
                        ]}
                      >
                        <Text variant="bodySmall">
                          ⭐ {activityBeingTimeUpdated.place_detail.rating.toFixed(1)} ({activityBeingTimeUpdated.place_detail.total_ratings || 0})
                        </Text>
                      </View>
                    )}
                  </View>

                  {!!activityBeingTimeUpdated.place_detail.description && (
                    <Text variant="bodySmall" style={styles.timeUpdateDetailsDescription}>
                      {activityBeingTimeUpdated.place_detail.description}
                    </Text>
                  )}

                  {!!activityBeingTimeUpdated.place_detail.photos?.length && (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={styles.timeUpdatePhotosContainer}
                      contentContainerStyle={styles.timeUpdatePhotosContent}
                    >
                      {activityBeingTimeUpdated.place_detail.photos.map((photo, index) => (
                        <Pressable key={`${activityBeingTimeUpdated.id}-detail-photo-${index}`}>
                          <Image source={{ uri: photo }} style={styles.timeUpdatePhoto} resizeMode="cover" />
                        </Pressable>
                      ))}
                    </ScrollView>
                  )}

                  {!!activityBeingTimeUpdated.place_detail.address && (
                    <Text variant="bodySmall" style={styles.timeUpdateDetailsAddress}>
                      {activityBeingTimeUpdated.place_detail.address}
                    </Text>
                  )}

                  <View style={styles.timeUpdateDetailActions}>
                    {!!activityBeingTimeUpdated.place_detail.google_maps_url && (
                      <Button mode="text" icon="map-marker-outline" onPress={openTimeUpdateGoogleMaps} compact>
                        Open in Google Maps
                      </Button>
                    )}

                    <Button mode="text" icon="music-note" onPress={openTimeUpdateTikTok} compact>
                      Open in TikTok
                    </Button>
                  </View>
                </View>
              )}

              <Text variant="titleMedium" style={styles.timeUpdateSectionTitle}>
                Update Activity Time
              </Text>

              <View
                style={[
                  styles.timeUpdateModeToggle,
                  {
                    borderColor: theme.colors.outline,
                    backgroundColor: theme.colors.surfaceVariant,
                  },
                ]}
              >
                <Pressable
                  accessibilityRole="button"
                  onPress={() => handleTimeUpdateModeChange('end_time')}
                  style={[
                    styles.timeUpdateModeOption,
                    timeUpdateMode === 'end_time'
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
                        timeUpdateMode === 'end_time'
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
                  onPress={() => handleTimeUpdateModeChange('duration')}
                  style={[
                    styles.timeUpdateModeOption,
                    timeUpdateMode === 'duration'
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
                        timeUpdateMode === 'duration'
                          ? theme.colors.onPrimary
                          : theme.colors.onSurface,
                      fontWeight: '700',
                    }}
                  >
                    Duration
                  </Text>
                </Pressable>
              </View>

              <View style={styles.timeUpdateInputRow}>
                <View style={styles.timeUpdateInputCol}>
                  <Text variant="labelLarge">Start Time</Text>
                  <Button
                    mode="outlined"
                    icon="clock-outline"
                    onPress={() => setTimeUpdateStartPickerVisible(true)}
                  >
                    {formatTo12Hour(timeUpdateStart.hours, timeUpdateStart.minutes)}
                  </Button>
                </View>

                {timeUpdateMode === 'end_time' ? (
                  <View style={styles.timeUpdateInputCol}>
                    <Text variant="labelLarge">End Time</Text>
                    <Button
                      mode="outlined"
                      icon="clock-outline"
                      onPress={() => setTimeUpdateEndPickerVisible(true)}
                    >
                      {formatTo12Hour(timeUpdateEnd.hours, timeUpdateEnd.minutes)}
                    </Button>
                  </View>
                ) : (
                  <View style={styles.timeUpdateInputCol}>
                    <Text variant="labelLarge">Duration</Text>
                    <View style={styles.timeUpdateDurationAdjustRow}>
                      <Button
                        mode="outlined"
                        compact
                        onPress={() => handleTimeUpdateDurationAdjust(-DURATION_STEP_MINUTES)}
                      >
                        -
                      </Button>
                      <Text variant="bodyLarge" style={styles.timeUpdateDurationAdjustValue}>
                        {timeUpdateDuration} min
                      </Text>
                      <Button
                        mode="outlined"
                        compact
                        onPress={() => handleTimeUpdateDurationAdjust(DURATION_STEP_MINUTES)}
                      >
                        +
                      </Button>
                    </View>
                  </View>
                )}
              </View>

              <View
                style={[
                  styles.timeUpdateDurationInfo,
                  { backgroundColor: theme.colors.secondaryContainer },
                ]}
              >
                <MaterialCommunityIcons name="clock-outline" size={20} color={theme.colors.primary} />
                <Text variant="bodyLarge" style={styles.timeUpdateDurationText}>
                  Duration: {formatDurationHumanReadable(timeUpdateDuration)}
                </Text>
              </View>

              <Text variant="labelLarge" style={styles.timeUpdateSectionLabel}>
                Time Update Preview
              </Text>
              <View
                style={[
                  styles.timeUpdatePreview,
                  {
                    borderColor: theme.colors.outlineVariant,
                    backgroundColor: theme.colors.surfaceVariant,
                  },
                ]}
              >
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  Current: {activityBeingTimeUpdated?.time_start} - {activityBeingTimeUpdated?.time_end}
                </Text>
                <Text variant="bodyMedium" style={styles.timeUpdatePreviewNew}>
                  New: {formatTo12Hour(timeUpdateStart.hours, timeUpdateStart.minutes)} - {formatTo12Hour(timeUpdateEnd.hours, timeUpdateEnd.minutes)}
                </Text>
              </View>

              <Text variant="bodySmall" style={styles.timeUpdateHintText}>
                AI will intelligently adjust the whole day's itinerary based on this time update.
              </Text>

              {timeUpdateError && (
                <Text variant="bodySmall" style={{ color: theme.colors.error }}>
                  {timeUpdateError}
                </Text>
              )}
            </ScrollView>

            <View
              style={styles.timeUpdateActions}
              onLayout={(event) => setTimeUpdateActionHeight(event.nativeEvent.layout.height)}
            >
              <Button mode="outlined" onPress={handleDismissTimeUpdate} style={styles.timeUpdateActionButton}>
                Cancel
              </Button>
              <Button
                mode="contained"
                icon="check"
                onPress={handleSaveTimeUpdate}
                loading={isLoading}
                disabled={isLoading}
                style={styles.timeUpdateActionButton}
              >
                Save
              </Button>
            </View>
          </Animated.View>
        </Modal>
      </Portal>

      <TimePickerModal
        visible={timeUpdateStartPickerVisible}
        onDismiss={() => setTimeUpdateStartPickerVisible(false)}
        onConfirm={handleTimeUpdateStartConfirm}
        hours={timeUpdateStart.hours}
        minutes={timeUpdateStart.minutes}
        label="Select start time"
        cancelLabel="Cancel"
        confirmLabel="OK"
        animationType="fade"
      />

      <TimePickerModal
        visible={timeUpdateEndPickerVisible && timeUpdateMode === 'end_time'}
        onDismiss={() => setTimeUpdateEndPickerVisible(false)}
        onConfirm={handleTimeUpdateEndConfirm}
        hours={timeUpdateEnd.hours}
        minutes={timeUpdateEnd.minutes}
        label="Select end time"
        cancelLabel="Cancel"
        confirmLabel="OK"
        animationType="fade"
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
  timeUpdateModalContainer: {
    margin: 16,
  },
  timeUpdateModalContent: {
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  timeUpdateScroll: {},
  timeUpdateScrollContent: {
    paddingBottom: 8,
    gap: 10,
  },
  timeUpdateTitle: {
    fontWeight: '700',
  },
  timeUpdateDescriptionBox: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
  },
  timeUpdateSummaryTitle: {
    fontWeight: '700',
    marginBottom: 6,
  },
  timeUpdateSummaryPlaceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeUpdateSummaryPlaceTextWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  timeUpdateSummaryPlace: {
    fontWeight: '700',
    marginTop: 2,
  },
  timeUpdateSummaryAddress: {
    marginTop: 2,
    opacity: 0.72,
  },
  timeUpdateDetailsToggle: {
    alignSelf: 'flex-start',
  },
  timeUpdateDetailsSection: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    gap: 8,
  },
  timeUpdateBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeUpdateChipWrap: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  timeUpdateDetailsDescription: {
    lineHeight: 19,
  },
  timeUpdatePhotosContainer: {
    marginVertical: 2,
  },
  timeUpdatePhotosContent: {
    gap: 8,
  },
  timeUpdatePhoto: {
    width: 110,
    height: 78,
    borderRadius: 8,
  },
  timeUpdateDetailsAddress: {
    opacity: 0.8,
  },
  timeUpdateDetailActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 2,
  },
  timeUpdateSectionTitle: {
    fontWeight: '700',
  },
  timeUpdateModeToggle: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  timeUpdateModeOption: {
    flex: 1,
    minHeight: 36,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeUpdateSectionLabel: {
    marginTop: 2,
  },
  timeUpdatePreview: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    gap: 4,
  },
  timeUpdatePreviewNew: {
    fontWeight: '700',
  },
  timeUpdateInputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  timeUpdateInputCol: {
    flex: 1,
    gap: 6,
  },
  timeUpdateDurationAdjustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeUpdateDurationAdjustValue: {
    minWidth: 76,
    textAlign: 'center',
    fontWeight: '700',
  },
  timeUpdateDurationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  timeUpdateDurationText: {
    marginLeft: 8,
    fontWeight: '500',
  },
  timeUpdateHintText: {
    opacity: 0.75,
  },
  timeUpdateActions: {
    flexDirection: 'row',
    gap: 10,
  },
  timeUpdateActionButton: {
    flex: 1,
  },
});

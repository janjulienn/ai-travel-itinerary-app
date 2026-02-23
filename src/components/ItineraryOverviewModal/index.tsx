import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Animated, Easing, useWindowDimensions } from 'react-native';
import { Portal, Modal, Text, useTheme, Button, List, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { TimePickerModal } from 'react-native-paper-dates';

import { DeleteActivityModal } from '../DeleteActivityModal';
import { PlaceDetailModal } from '../PlaceDetailModal';
import { PlaceSearchBottomSheet } from '../PlaceSearchBottomSheet';

import type { IPlace } from '../../types/dtos/province';
import type {
  IApplyOverviewDraftRequest,
  IItineraryActivity,
  IItineraryOverview,
  IOverviewDraftOperation,
} from '../../types/dtos/itinerary';

interface ItineraryOverviewModalProps {
  visible: boolean;
  overview: IItineraryOverview | null;
  loading: boolean;
  saving: boolean;
  countrySlug: string;
  provinceSlug: string;
  provinceName: string;
  existingPlaceDetailsByActivityId: Record<number, IPlace | undefined>;
  onDismiss: () => void;
  onSaveDraft: (payload: IApplyOverviewDraftRequest) => Promise<void>;
}

interface DraftRow {
  key: string;
  id?: number;
  dayId: number;
  order: number;
  timeStartLabel: string;
  timeStart24: string;
  timeEndLabel: string;
  timeEnd24: string;
  durationMinutes: number;
  title: string;
  locationName: string;
  category: string;
  googlePlaceId: string;
  transitStartTime: string | null;
  hasTransitToNext: boolean;
  placeDetail?: IPlace;
  isNew: boolean;
}

interface DraftChangeSummary {
  dayNumber: number | null;
  operationType: 'add' | 'replace' | 'set_start_time' | 'delete';
  text: string;
}

interface IAdjacentActivitySummary {
  id: number;
  title: string;
  time_start: string;
  time_end: string;
  latitude: number | null;
  longitude: number | null;
}

const parse12HourTo24 = (value: string): string => {
  if (!value.includes('AM') && !value.includes('PM')) {
    return value;
  }

  const [timePart, period] = value.split(' ');
  let [hours, minutes] = timePart.split(':').map(Number);

  if (period === 'PM' && hours !== 12) {
    hours += 12;
  } else if (period === 'AM' && hours === 12) {
    hours = 0;
  }

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

const format24To12 = (value: string): string => {
  const [hoursRaw, minutesRaw] = value.split(':').map(Number);
  const period = hoursRaw >= 12 ? 'PM' : 'AM';
  const displayHours = hoursRaw % 12 || 12;
  return `${String(displayHours).padStart(2, '0')}:${String(minutesRaw).padStart(2, '0')} ${period}`;
};

const parse24TimeToMinutes = (value: string): number => {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
};

const MIN_DURATION_MINUTES = 15;
const DURATION_STEP_MINUTES = 15;
const DAY_END_MINUTES = 24 * 60 - 1;
const ACTION_COL_WIDTH_VIEW = 48;
const ACTION_COL_WIDTH_EDIT = 132;
const CONFIRM_MODAL_VERTICAL_CHROME = 48;

const formatMinutesTo24 = (minutes: number): string => {
  const clamped = Math.max(0, Math.min(minutes, 23 * 60 + 59));
  const hours = Math.floor(clamped / 60);
  const mins = clamped % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
};

const clampOneHourRange = (startMinutes: number): { start: number; end: number } => {
  const clampedStart = Math.max(0, Math.min(startMinutes, 24 * 60 - 60));
  return { start: clampedStart, end: clampedStart + 60 };
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

const toReplaceActivity = (row: DraftRow): IItineraryActivity => ({
  id: row.id || -1,
  google_place_id: row.googlePlaceId,
  order: row.order,
  category: row.category as any,
  category_display: row.category,
  title: row.title,
  description: '',
  time_start: row.timeStartLabel,
  time_end: row.timeEndLabel,
  duration_minutes: row.durationMinutes,
  location_name: row.locationName,
  location_address: null,
  cost_estimate: '',
  notes: null,
  place_detail: row.placeDetail,
});

export const ItineraryOverviewModal: React.FC<ItineraryOverviewModalProps> = ({
  visible,
  overview,
  loading,
  saving,
  countrySlug,
  provinceSlug,
  provinceName,
  existingPlaceDetailsByActivityId,
  onDismiss,
  onSaveDraft,
}) => {
  const theme = useTheme();
  const { height: windowHeight } = useWindowDimensions();

  const [isEditMode, setIsEditMode] = useState(false);
  const [expandedDayIds, setExpandedDayIds] = useState<number[]>([]);
  const [draftRowsByDayId, setDraftRowsByDayId] = useState<Record<number, DraftRow[]>>({});
  const [initialRowsById, setInitialRowsById] = useState<Record<number, DraftRow>>({});
  const [newCounter, setNewCounter] = useState(0);

  const [selectedPlace, setSelectedPlace] = useState<IPlace | null>(null);

  const [placeSearchVisible, setPlaceSearchVisible] = useState(false);
  const [searchMode, setSearchMode] = useState<'add' | 'replace'>('add');
  const [searchContext, setSearchContext] = useState<{
    dayId?: number;
    insertIndex?: number;
    rowKey?: string;
    suggestedTimeStart?: string;
    suggestedTimeEnd?: string;
    previousActivity?: IAdjacentActivitySummary;
    nextActivity?: IAdjacentActivitySummary;
  }>({});
  const [activityToReplace, setActivityToReplace] = useState<IItineraryActivity | null>(null);

  const [deleteVisible, setDeleteVisible] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DraftRow | null>(null);

  const [timeEditVisible, setTimeEditVisible] = useState(false);
  const [timeEditRowKey, setTimeEditRowKey] = useState<string | null>(null);
  const [timeEditDayId, setTimeEditDayId] = useState<number | null>(null);
  const [timeEditStart, setTimeEditStart] = useState({ hours: 8, minutes: 0 });
  const [timeEditEnd, setTimeEditEnd] = useState({ hours: 9, minutes: 0 });
  const [timeEditDuration, setTimeEditDuration] = useState(60);
  const [timeEditMode, setTimeEditMode] = useState<'end_time' | 'duration'>('end_time');
  const [timeEditError, setTimeEditError] = useState<string | null>(null);
  const [timeEditStartPickerVisible, setTimeEditStartPickerVisible] = useState(false);
  const [timeEditEndPickerVisible, setTimeEditEndPickerVisible] = useState(false);
  const [saveConfirmVisible, setSaveConfirmVisible] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [footerHeight, setFooterHeight] = useState(0);
  const [bodyHeight, setBodyHeight] = useState(0);
  const animatedModalHeight = useRef(new Animated.Value(windowHeight * 0.74)).current;
  const actionColumnWidth = useRef(new Animated.Value(ACTION_COL_WIDTH_VIEW)).current;
  const [confirmHeaderHeight, setConfirmHeaderHeight] = useState(0);
  const [confirmActionsHeight, setConfirmActionsHeight] = useState(0);
  const [confirmContentHeight, setConfirmContentHeight] = useState(0);
  const confirmFallbackHeight = Math.min(windowHeight * 0.56, windowHeight * 0.72);
  const confirmAnimatedHeight = useRef(new Animated.Value(confirmFallbackHeight)).current;

  useEffect(() => {
    if (!visible || !overview) {
      return;
    }

    const nextDraftRowsByDayId: Record<number, DraftRow[]> = {};
    const nextInitialRowsById: Record<number, DraftRow> = {};

    overview.days.forEach((day) => {
      const rows = (day.activities || []).map((activity, index) => {
        const mapped: DraftRow = {
          key: `existing-${activity.id}`,
          id: activity.id,
          dayId: day.id,
          order: activity.order || index + 1,
          timeStartLabel: activity.time_start,
          timeStart24: parse12HourTo24(activity.time_start),
          timeEndLabel: activity.time_end,
          timeEnd24: parse12HourTo24(activity.time_end),
          durationMinutes: activity.duration_minutes,
          title: activity.title,
          locationName: activity.location_name,
          category: activity.category,
          googlePlaceId: activity.google_place_id,
          transitStartTime: activity.transit_start_time,
          hasTransitToNext: activity.has_transit_to_next,
          placeDetail: existingPlaceDetailsByActivityId[activity.id],
          isNew: false,
        };

        nextInitialRowsById[activity.id] = mapped;
        return mapped;
      });

      nextDraftRowsByDayId[day.id] = rows;
    });

    setIsEditMode(false);
    setExpandedDayIds(overview.days.map((day) => day.id));
    setDraftRowsByDayId(nextDraftRowsByDayId);
    setInitialRowsById(nextInitialRowsById);
    setNewCounter(0);
  }, [visible, overview, existingPlaceDetailsByActivityId]);

  const draftOperations = useMemo(
    () => buildDraftOperations(draftRowsByDayId, initialRowsById, overview),
    [draftRowsByDayId, initialRowsById, overview]
  );

  const totalChanges = draftOperations.length;

  const dayNumberById = useMemo(() => {
    const mapping: Record<number, number> = {};
    overview?.days.forEach((day) => {
      mapping[day.id] = day.day_number;
    });
    return mapping;
  }, [overview?.days]);

  const draftRowsByActivityId = useMemo(() => {
    const mapping: Record<number, DraftRow> = {};
    Object.values(draftRowsByDayId).forEach((rows) => {
      rows.forEach((row) => {
        if (row.id) {
          mapping[row.id] = row;
        }
      });
    });
    return mapping;
  }, [draftRowsByDayId]);

  const saveChangeSummaries = useMemo<DraftChangeSummary[]>(() => {
    const formatSchedule = (start24: string, end24: string): string => {
      return `${format24To12(start24)} - ${format24To12(end24)}`;
    };

    return draftOperations.map((operation) => {
      if (operation.operation === 'add') {
        const dayNumber = dayNumberById[operation.day_id] || operation.day_id;
        const insertedRow = (draftRowsByDayId[operation.day_id] || []).find(
          (row) => row.isNew && row.googlePlaceId === operation.google_place_id && row.timeStart24 === operation.time_start
        );
        const activityName = insertedRow?.title || 'New activity';
        return {
          dayNumber,
          operationType: 'add',
          text: `Add ${activityName} (${formatSchedule(operation.time_start, operation.time_end)}).`,
        };
      }

      if (operation.operation === 'replace') {
        const previous = initialRowsById[operation.activity_id];
        const current = draftRowsByActivityId[operation.activity_id];
        const prevName = previous?.title || 'activity';
        const nextName = current?.title || 'new place';
        const isSamePlace = previous?.googlePlaceId && current?.googlePlaceId
          ? previous.googlePlaceId === current.googlePlaceId
          : false;

        if (isSamePlace) {
          return {
            dayNumber: previous?.dayId ? dayNumberById[previous.dayId] ?? null : null,
            operationType: 'set_start_time',
            text: `Update time for ${nextName} to ${formatSchedule(operation.time_start, operation.time_end)}.`,
          };
        }

        return {
          dayNumber: previous?.dayId ? dayNumberById[previous.dayId] ?? null : null,
          operationType: 'replace',
          text: `Replace ${prevName} with ${nextName} (${formatSchedule(operation.time_start, operation.time_end)}).`,
        };
      }

      if (operation.operation === 'set_start_time') {
        const current = draftRowsByActivityId[operation.activity_id] || initialRowsById[operation.activity_id];
        const activityName = current?.title || 'activity';
        const end24 = current?.timeEnd24 || operation.time_start;
        return {
          dayNumber: current?.dayId ? dayNumberById[current.dayId] ?? null : null,
          operationType: 'set_start_time',
          text: `Set time for ${activityName} to ${formatSchedule(operation.time_start, end24)}.`,
        };
      }

      const removed = initialRowsById[operation.activity_id];
      return {
        dayNumber: removed?.dayId ? dayNumberById[removed.dayId] ?? null : null,
        operationType: 'delete',
        text: `Delete ${removed?.title || 'activity'} (${formatSchedule(removed?.timeStart24 || '00:00', removed?.timeEnd24 || '00:00')}) from the draft.`,
      };
    });
  }, [dayNumberById, draftOperations, draftRowsByActivityId, draftRowsByDayId, initialRowsById]);

  const groupedChangeSummaries = useMemo(() => {
    const grouped: Record<string, DraftChangeSummary[]> = {};

    saveChangeSummaries.forEach((summary) => {
      const key = summary.dayNumber === null ? 'other' : String(summary.dayNumber);
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(summary);
    });

    const sortedDayKeys = Object.keys(grouped)
      .filter((key) => key !== 'other')
      .sort((a, b) => Number(a) - Number(b));

    const sections = sortedDayKeys.map((key) => ({
      title: `Day ${key}`,
      items: grouped[key],
    }));

    if (grouped.other && grouped.other.length > 0) {
      sections.push({
        title: 'Other Changes',
        items: grouped.other,
      });
    }

    const operationSortOrder: Record<DraftChangeSummary['operationType'], number> = {
      add: 1,
      replace: 2,
      set_start_time: 3,
      delete: 4,
    };

    return sections.map((section) => ({
      ...section,
      items: [...section.items].sort((a, b) => operationSortOrder[a.operationType] - operationSortOrder[b.operationType]),
    }));
  }, [saveChangeSummaries]);

  const toggleDay = (dayId: number) => {
    setExpandedDayIds((current) => {
      if (current.includes(dayId)) {
        return current.filter((id) => id !== dayId);
      }
      return [...current, dayId];
    });
  };

  const openInfo = (row: DraftRow) => {
    const detail = row.placeDetail || (row.id ? existingPlaceDetailsByActivityId[row.id] : undefined);
    if (!detail) {
      return;
    }
    setSelectedPlace(detail);
  };

  const openAdd = (dayId: number, insertIndex: number) => {
    const dayRows = draftRowsByDayId[dayId] || [];

    let suggestedTimeStart: string | undefined;
    let suggestedTimeEnd: string | undefined;
    let previousActivity: IAdjacentActivitySummary | undefined;
    let nextActivity: IAdjacentActivitySummary | undefined;

    if (dayRows.length > 0) {
      const firstRow = dayRows[0];
      const lastRow = dayRows[dayRows.length - 1];

      if (insertIndex <= 0) {
        const firstStart = parse24TimeToMinutes(firstRow.timeStart24);
        const range = clampOneHourRange(firstStart - 60);
        suggestedTimeStart = formatMinutesTo24(range.start);
        suggestedTimeEnd = formatMinutesTo24(range.end);
        nextActivity = {
          id: firstRow.id || -1,
          title: firstRow.title,
          time_start: firstRow.timeStartLabel,
          time_end: firstRow.timeEndLabel,
          latitude: firstRow.placeDetail?.latitude ?? null,
          longitude: firstRow.placeDetail?.longitude ?? null,
        };
      } else {
        const previousRow = dayRows[insertIndex - 1] || lastRow;
        const nextRow = dayRows[insertIndex];

        if (previousRow) {
          previousActivity = {
            id: previousRow.id || -1,
            title: previousRow.title,
            time_start: previousRow.timeStartLabel,
            time_end: previousRow.timeEndLabel,
            latitude: previousRow.placeDetail?.latitude ?? null,
            longitude: previousRow.placeDetail?.longitude ?? null,
          };
        }

        if (nextRow) {
          nextActivity = {
            id: nextRow.id || -1,
            title: nextRow.title,
            time_start: nextRow.timeStartLabel,
            time_end: nextRow.timeEndLabel,
            latitude: nextRow.placeDetail?.latitude ?? null,
            longitude: nextRow.placeDetail?.longitude ?? null,
          };
        }

        if (previousRow && nextRow) {
          const previousEnd = parse24TimeToMinutes(previousRow.timeEnd24);
          const nextStart = parse24TimeToMinutes(nextRow.timeStart24);
          const median = Math.floor((previousEnd + nextStart) / 2);
          const centeredStart = median - 30;
          const centeredEnd = centeredStart + 60;

          if (centeredStart < previousEnd || centeredEnd > nextStart) {
            const fallback = clampOneHourRange(previousEnd);
            suggestedTimeStart = formatMinutesTo24(fallback.start);
            suggestedTimeEnd = formatMinutesTo24(fallback.end);
          } else {
            const centered = clampOneHourRange(centeredStart);
            suggestedTimeStart = formatMinutesTo24(centered.start);
            suggestedTimeEnd = formatMinutesTo24(centered.end);
          }
        } else if (previousRow) {
          const previousEnd = parse24TimeToMinutes(previousRow.timeEnd24);
          const range = clampOneHourRange(previousEnd);
          suggestedTimeStart = formatMinutesTo24(range.start);
          suggestedTimeEnd = formatMinutesTo24(range.end);
        } else {
          const firstStart = parse24TimeToMinutes(firstRow.timeStart24);
          const range = clampOneHourRange(firstStart - 60);
          suggestedTimeStart = formatMinutesTo24(range.start);
          suggestedTimeEnd = formatMinutesTo24(range.end);
        }
      }
    }

    setSearchMode('add');
    setSearchContext({
      dayId,
      insertIndex,
      suggestedTimeStart,
      suggestedTimeEnd,
      previousActivity,
      nextActivity,
    });
    setPlaceSearchVisible(true);
  };

  const openReplace = (row: DraftRow) => {
    setSearchMode('replace');
    setSearchContext({ rowKey: row.key });
    setActivityToReplace(toReplaceActivity(row));
    setPlaceSearchVisible(true);
  };

  const openDelete = (row: DraftRow) => {
    setDeleteTarget(row);
    setDeleteVisible(true);
  };

  const confirmDelete = () => {
    if (!deleteTarget) {
      return;
    }

    setDraftRowsByDayId((current) => {
      const dayRows = current[deleteTarget.dayId] || [];
      return {
        ...current,
        [deleteTarget.dayId]: dayRows.filter((row) => row.key !== deleteTarget.key),
      };
    });
  };

  const openTimeEdit = (row: DraftRow) => {
    const [startHour, startMinute] = row.timeStart24.split(':').map(Number);
    const [endHour, endMinute] = row.timeEnd24.split(':').map(Number);

    setTimeEditRowKey(row.key);
    setTimeEditDayId(row.dayId);
    setTimeEditStart({ hours: startHour, minutes: startMinute });
    setTimeEditEnd({ hours: endHour, minutes: endMinute });
    setTimeEditDuration(row.durationMinutes);
    setTimeEditMode('end_time');
    setTimeEditError(null);
    setTimeEditVisible(true);
  };

  const handleTimeEditStartConfirm = ({ hours, minutes }: { hours: number; minutes: number }) => {
    setTimeEditStartPickerVisible(false);
    setTimeEditError(null);

    const nextStart = { hours, minutes };
    setTimeEditStart(nextStart);

    if (timeEditMode === 'duration') {
      const computed = applyDurationFromStart(nextStart, timeEditDuration || 60);
      setTimeEditDuration(computed.duration);
      setTimeEditEnd(computed.end);
      return;
    }

    const nextStartMinutes = toTotalMinutes(nextStart);
    const currentEndMinutes = toTotalMinutes(timeEditEnd);
    if (currentEndMinutes <= nextStartMinutes) {
      const computed = applyDurationFromStart(nextStart, timeEditDuration || 60);
      setTimeEditDuration(computed.duration);
      setTimeEditEnd(computed.end);
    }
  };

  const handleTimeEditEndConfirm = ({ hours, minutes }: { hours: number; minutes: number }) => {
    setTimeEditEndPickerVisible(false);

    const endMinutes = toTotalMinutes({ hours, minutes });
    const startMinutes = toTotalMinutes(timeEditStart);
    if (endMinutes <= startMinutes) {
      setTimeEditError('End time must be after start time.');
      return;
    }

    setTimeEditError(null);
    setTimeEditEnd({ hours, minutes });
    setTimeEditDuration(endMinutes - startMinutes);
  };

  const handleTimeEditDurationAdjust = (deltaMinutes: number) => {
    const computed = applyDurationFromStart(timeEditStart, timeEditDuration + deltaMinutes);
    setTimeEditDuration(computed.duration);
    setTimeEditEnd(computed.end);
    setTimeEditError(null);
  };

  const handleTimeEditModeChange = (nextMode: 'end_time' | 'duration') => {
    setTimeEditMode(nextMode);
    if (nextMode === 'duration') {
      const computed = applyDurationFromStart(timeEditStart, timeEditDuration || 60);
      setTimeEditDuration(computed.duration);
      setTimeEditEnd(computed.end);
      setTimeEditError(null);
    }
  };

  const handleSavePlace = (data: {
    place: IPlace;
    time_start: string;
    time_end: string;
    duration_minutes: number;
  }) => {
    if (searchMode === 'add' && searchContext.dayId !== undefined && searchContext.insertIndex !== undefined) {
      const dayId = searchContext.dayId;
      const insertIndex = searchContext.insertIndex;
      const nextKey = `new-${newCounter}`;
      setNewCounter((current) => current + 1);

      const newRow: DraftRow = {
        key: nextKey,
        dayId,
        order: insertIndex + 1,
        timeStartLabel: format24To12(data.time_start),
        timeStart24: data.time_start,
        timeEndLabel: format24To12(data.time_end),
        timeEnd24: data.time_end,
        durationMinutes: data.duration_minutes,
        title: data.place.name,
        locationName: data.place.name,
        category: data.place.category,
        googlePlaceId: data.place.google_place_id,
        transitStartTime: null,
        hasTransitToNext: false,
        placeDetail: data.place,
        isNew: true,
      };

      setDraftRowsByDayId((current) => {
        const dayRows = [...(current[dayId] || [])];
        dayRows.splice(insertIndex, 0, newRow);
        return {
          ...current,
          [dayId]: dayRows,
        };
      });
    }

    if (searchMode === 'replace' && searchContext.rowKey) {
      const targetKey = searchContext.rowKey;

      setDraftRowsByDayId((current) => {
        const updated: Record<number, DraftRow[]> = {};
        Object.entries(current).forEach(([dayIdRaw, rows]) => {
          const dayId = Number(dayIdRaw);
          updated[dayId] = rows.map((row) => {
            if (row.key !== targetKey) {
              return row;
            }

            return {
              ...row,
              timeStartLabel: format24To12(data.time_start),
              timeStart24: data.time_start,
              timeEndLabel: format24To12(data.time_end),
              timeEnd24: data.time_end,
              durationMinutes: data.duration_minutes,
              title: data.place.name,
              locationName: data.place.name,
              category: data.place.category,
              googlePlaceId: data.place.google_place_id,
              transitStartTime: null,
              hasTransitToNext: false,
              placeDetail: data.place,
            };
          });
        });
        return updated;
      });
    }

    setPlaceSearchVisible(false);
    setSearchContext({});
    setActivityToReplace(null);
  };

  const handleTimeEditConfirm = () => {
    if (!timeEditRowKey || timeEditDayId === null) {
      setTimeEditVisible(false);
      return;
    }

    const startMinutes = toTotalMinutes(timeEditStart);
    const endMinutes = toTotalMinutes(timeEditEnd);
    if (endMinutes <= startMinutes) {
      setTimeEditError('End time must be after start time.');
      return;
    }

    const start24 = `${String(timeEditStart.hours).padStart(2, '0')}:${String(timeEditStart.minutes).padStart(2, '0')}`;
    const end24 = `${String(timeEditEnd.hours).padStart(2, '0')}:${String(timeEditEnd.minutes).padStart(2, '0')}`;
    const start12 = format24To12(start24);
    const end12 = format24To12(end24);

    setDraftRowsByDayId((current) => {
      const rows = current[timeEditDayId] || [];
      return {
        ...current,
        [timeEditDayId]: rows.map((row) => {
          if (row.key !== timeEditRowKey) {
            return row;
          }
          return {
            ...row,
            timeStart24: start24,
            timeStartLabel: start12,
            timeEnd24: end24,
            timeEndLabel: end12,
            durationMinutes: timeEditMode === 'duration' ? timeEditDuration : endMinutes - startMinutes,
          };
        }),
      };
    });

    setTimeEditVisible(false);
    setTimeEditRowKey(null);
    setTimeEditDayId(null);
    setTimeEditError(null);
  };

  const openSaveConfirmation = () => {
    if (draftOperations.length === 0) {
      onDismiss();
      return;
    }

    setSaveConfirmVisible(true);
  };

  const submitDraft = async () => {
    if (draftOperations.length === 0) {
      onDismiss();
      return;
    }

    setSaveConfirmVisible(false);
    await onSaveDraft({ operations: draftOperations });
  };

  const modalMaxHeight = windowHeight * 0.96;
  const fallbackHeight = Math.min(windowHeight * 0.74, modalMaxHeight);
  const measuredHeight =
    headerHeight > 0 && footerHeight > 0 && bodyHeight > 0
      ? Math.min(modalMaxHeight, headerHeight + footerHeight + bodyHeight)
      : fallbackHeight;

  useEffect(() => {
    Animated.timing(animatedModalHeight, {
      toValue: measuredHeight,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [animatedModalHeight, measuredHeight]);

  useEffect(() => {
    Animated.timing(actionColumnWidth, {
      toValue: isEditMode ? ACTION_COL_WIDTH_EDIT : ACTION_COL_WIDTH_VIEW,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [actionColumnWidth, isEditMode]);

  const confirmModalMaxHeight = windowHeight * 0.72;
  const confirmTotalHeight =
    confirmHeaderHeight +
    confirmActionsHeight +
    confirmContentHeight +
    CONFIRM_MODAL_VERTICAL_CHROME;
  const confirmMeasuredHeight =
    confirmHeaderHeight > 0 && confirmActionsHeight > 0 && confirmContentHeight > 0
      ? Math.min(confirmModalMaxHeight, confirmTotalHeight)
      : confirmFallbackHeight;
  const confirmNeedsScroll =
    confirmHeaderHeight > 0 &&
    confirmActionsHeight > 0 &&
    confirmContentHeight > 0 &&
    confirmTotalHeight > confirmModalMaxHeight;

  useEffect(() => {
    Animated.timing(confirmAnimatedHeight, {
      toValue: confirmMeasuredHeight,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [confirmAnimatedHeight, confirmMeasuredHeight]);

  return (
    <>
      <Portal>
        <Modal
          visible={visible}
          onDismiss={onDismiss}
          contentContainerStyle={[styles.modalContainer, { maxHeight: modalMaxHeight }]}
        >
          <Animated.View style={[styles.modalContent, { backgroundColor: theme.colors.surface, height: animatedModalHeight }]}> 
            <View style={styles.headerRow} onLayout={(event) => setHeaderHeight(event.nativeEvent.layout.height)}>
              <Text variant="titleLarge" style={styles.headerTitle}>Itinerary Overview</Text>
              <View style={styles.headerActions}>
                <IconButton
                  icon={isEditMode ? 'pencil-off-outline' : 'pencil-outline'}
                  size={20}
                  onPress={() => {
                    setIsEditMode((current) => !current);
                    if (!isEditMode && overview) {
                      setExpandedDayIds(overview.days.map((day) => day.id));
                    }
                  }}
                />
              </View>
            </View>

            {loading && (
              <View style={styles.loadingState} onLayout={(event) => setBodyHeight(event.nativeEvent.layout.height)}>
                <Text variant="bodyMedium">Loading overview...</Text>
              </View>
            )}

            {!loading && !overview && (
              <View style={styles.loadingState} onLayout={(event) => setBodyHeight(event.nativeEvent.layout.height)}>
                <Text variant="bodyMedium">Overview is unavailable right now.</Text>
              </View>
            )}

            {!loading && overview && (
              <ScrollView style={styles.daysScroll} contentContainerStyle={styles.daysContent} onContentSizeChange={(_, height) => setBodyHeight(height)}> 
                <Text variant="bodyMedium" style={styles.overviewIntroText}>
                  A compact view of your full itinerary with optional quick edits.
                </Text>

                {overview.days.map((day, dayIndex) => {
                  const isExpanded = expandedDayIds.includes(day.id);
                  const rows = draftRowsByDayId[day.id] || [];

                  return (
                    <List.Accordion
                      key={day.id}
                      title={`Day ${day.day_number} - ${day.date_display}`}
                      description={day.theme}
                      expanded={isExpanded}
                      onPress={() => toggleDay(day.id)}
                      style={[
                        styles.dayAccordion,
                        {
                          borderColor: theme.colors.outlineVariant,
                          borderTopWidth: dayIndex === 0 ? StyleSheet.hairlineWidth : 0,
                          backgroundColor: isExpanded
                            ? theme.colors.background
                            : theme.colors.surface,
                        },
                      ]}
                      titleStyle={styles.dayAccordionTitle}
                      descriptionStyle={styles.dayAccordionDescription}
                    >
                      <View style={[styles.table, { borderColor: theme.colors.outlineVariant }]}> 
                        <View style={[styles.tableHeader, { backgroundColor: theme.colors.surfaceVariant }]}> 
                          <Text style={[styles.timeCol, styles.headerText]} numberOfLines={1}>Time</Text>
                          <Text style={[styles.activityCol, styles.headerText]} numberOfLines={1}>Activity / Place</Text>
                          <Animated.View style={[styles.actionCol, { width: actionColumnWidth }]}>
                            <Text style={styles.headerText} numberOfLines={1}>Action</Text>
                          </Animated.View>
                        </View>

                        {isEditMode && (
                          <View style={[styles.addRow, { borderTopColor: theme.colors.outlineVariant, borderBottomColor: theme.colors.outlineVariant }]}> 
                            <Button compact mode="text" icon="plus" onPress={() => openAdd(day.id, 0)}>
                              Add activity
                            </Button>
                          </View>
                        )}

                        {rows.map((row, index) => {
                          const showInfo = !!(row.placeDetail || (row.id && existingPlaceDetailsByActivityId[row.id]));
                          const nextRow = rows[index + 1];
                          const hasTransitRow = row.hasTransitToNext;
                          const transitStartLabel = row.transitStartTime;
                          return (
                            <View key={row.key}> 
                              <View style={[styles.tableRow, { borderTopColor: theme.colors.outlineVariant }]}> 
                                <View style={styles.timeCol}> 
                                  {isEditMode ? (
                                    <Pressable style={styles.timeCellPressable} onPress={() => openTimeEdit(row)}>
                                      <Text style={[styles.timeText, { color: theme.colors.primary }]} numberOfLines={1}>{row.timeStartLabel}</Text>
                                      <Text style={[styles.timeEndText, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>{row.timeEndLabel}</Text>
                                    </Pressable>
                                  ) : (
                                    <View>
                                      <Text style={styles.timeText} numberOfLines={1}>{row.timeStartLabel}</Text>
                                      <Text style={[styles.timeEndText, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>{row.timeEndLabel}</Text>
                                    </View>
                                  )}
                                </View>
                                <View style={styles.activityCol}> 
                                  <Text variant="bodyMedium">{row.title}</Text>
                                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                                    {row.locationName}
                                  </Text>
                                </View>
                                <Animated.View style={[styles.actionCol, { width: actionColumnWidth }]}> 
                                  <IconButton
                                    icon="information-outline"
                                    size={20}
                                    onPress={() => openInfo(row)}
                                    disabled={!showInfo || saving}
                                  />
                                  {isEditMode && (
                                    <>
                                      <IconButton
                                        icon="swap-horizontal"
                                        size={20}
                                        onPress={() => openReplace(row)}
                                        disabled={saving}
                                      />
                                      <IconButton
                                        icon="delete-outline"
                                        size={20}
                                        onPress={() => openDelete(row)}
                                        disabled={saving}
                                      />
                                    </>
                                  )}
                                </Animated.View>
                              </View>
                                {!isEditMode && nextRow && hasTransitRow && (
                                  <View style={[styles.transitRow, { borderTopColor: theme.colors.outlineVariant }]}> 
                                    <View style={styles.timeCol}> 
                                      <View>
                                        <Text style={[styles.timeText, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>
                                          {transitStartLabel || '—'}
                                        </Text>
                                        <Text style={[styles.timeEndText, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>
                                          {nextRow.timeStartLabel || '—'}
                                        </Text>
                                      </View>
                                    </View>
                                    <View style={styles.activityCol}> 
                                      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                                        Transit to next activity
                                      </Text>
                                    </View>
                                    <Animated.View style={[styles.actionCol, { width: actionColumnWidth }]} />
                                  </View>
                                )}
                              {isEditMode && (
                                <View style={[styles.addRow, { borderTopColor: theme.colors.outlineVariant, borderBottomColor: theme.colors.outlineVariant }]}> 
                                  <Button compact mode="text" icon="plus" onPress={() => openAdd(day.id, index + 1)}>
                                    Add activity
                                  </Button>
                                </View>
                              )}
                            </View>
                          );
                        })}
                      </View>
                    </List.Accordion>
                  );
                })}
              </ScrollView>
            )}

            <View style={styles.footerActions} onLayout={(event) => setFooterHeight(event.nativeEvent.layout.height)}>
              <Button mode="outlined" onPress={onDismiss} disabled={saving}>Cancel</Button>
              {isEditMode && (
                <Button
                  mode="contained"
                  onPress={openSaveConfirmation}
                  loading={saving}
                  disabled={saving || totalChanges === 0}
                >
                  Save ({totalChanges})
                </Button>
              )}
            </View>
          </Animated.View>
        </Modal>
      </Portal>

      <Portal>
        <Modal
          visible={saveConfirmVisible}
          onDismiss={() => setSaveConfirmVisible(false)}
          contentContainerStyle={[styles.confirmModalContainer, { maxHeight: confirmModalMaxHeight }]}
        >
          <Animated.View style={[styles.confirmModalContent, { backgroundColor: theme.colors.surface, height: confirmAnimatedHeight }]}> 
            <View onLayout={(event) => setConfirmHeaderHeight(event.nativeEvent.layout.height)}>
              <Text variant="titleLarge" style={styles.confirmTitle}>Confirm Overview Edits</Text>
              <Text variant="bodySmall" style={[styles.confirmHint, { color: theme.colors.onSurfaceVariant }]}> 
                These draft changes will be intelligently adjusted by AI before your updated itinerary is finalized.
              </Text>
            </View>

            <ScrollView
              style={styles.confirmList}
              contentContainerStyle={styles.confirmListContent}
              scrollEnabled={confirmNeedsScroll}
              onContentSizeChange={(_, height) => setConfirmContentHeight(height)}
            >
              {groupedChangeSummaries.map((section) => (
                <View key={section.title} style={styles.confirmGroup}>
                  <Text variant="labelLarge" style={styles.confirmGroupTitle}>{section.title}</Text>
                  {section.items.map((summary, index) => (
                    <Text key={`${section.title}-${index}-${summary.text}`} variant="bodyMedium" style={styles.confirmItem}>
                      • {summary.text}
                    </Text>
                  ))}
                </View>
              ))}
            </ScrollView>

            <View style={styles.confirmActions} onLayout={(event) => setConfirmActionsHeight(event.nativeEvent.layout.height)}>
              <Button mode="outlined" onPress={() => setSaveConfirmVisible(false)} disabled={saving}>Cancel</Button>
              <Button mode="contained" onPress={submitDraft} loading={saving} disabled={saving}>Confirm Save</Button>
            </View>
          </Animated.View>
        </Modal>
      </Portal>

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
          setActivityToReplace(null);
        }}
        onSave={handleSavePlace}
        countrySlug={countrySlug}
        provinceSlug={provinceSlug}
        provinceName={provinceName}
        mode={searchMode}
        editScope="overview"
        activityToReplace={activityToReplace}
        initialAddTimeStart={searchContext.suggestedTimeStart}
        initialAddTimeEnd={searchContext.suggestedTimeEnd}
        previousActivity={searchContext.previousActivity}
        nextActivity={searchContext.nextActivity}
      />

      <DeleteActivityModal
        visible={deleteVisible}
        onDismiss={() => {
          setDeleteVisible(false);
          setDeleteTarget(null);
        }}
        onConfirm={confirmDelete}
        activityName={deleteTarget?.title}
        editScope="overview"
      />

      <Portal>
        <Modal
          visible={timeEditVisible}
          onDismiss={() => setTimeEditVisible(false)}
          contentContainerStyle={styles.timeEditModalContainer}
        >
          <View style={[styles.timeEditModalContent, { backgroundColor: theme.colors.surface }]}>
            <Text variant="titleLarge" style={styles.timeEditTitle}>Update Activity Time</Text>

            <View
              style={[
                styles.timeEditDescriptionBox,
                {
                  borderColor: theme.colors.outlineVariant,
                  backgroundColor: theme.colors.surfaceVariant,
                },
              ]}
            >
              <Text variant="labelLarge" style={styles.timeEditSummaryTitle}>
                Update start time for this activity
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                AI applies this change when you confirm Save in Itinerary Overview.
              </Text>
            </View>

            <View
              style={[
                styles.timeEditInputRow,
                {
                  borderColor: theme.colors.outline,
                  backgroundColor: theme.colors.surfaceVariant,
                },
              ]}
            >
              <Pressable
                accessibilityRole="button"
                onPress={() => handleTimeEditModeChange('end_time')}
                style={[
                  styles.timeEditModeOption,
                  timeEditMode === 'end_time'
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
                    color: timeEditMode === 'end_time' ? theme.colors.onPrimary : theme.colors.onSurface,
                    fontWeight: '700',
                  }}
                >
                  End Time
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={() => handleTimeEditModeChange('duration')}
                style={[
                  styles.timeEditModeOption,
                  timeEditMode === 'duration'
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
                    color: timeEditMode === 'duration' ? theme.colors.onPrimary : theme.colors.onSurface,
                    fontWeight: '700',
                  }}
                >
                  Duration
                </Text>
              </Pressable>
            </View>

            <View style={styles.timeEditInputCols}>
              <View style={styles.timeEditInputCol}>
                <Text variant="labelLarge">Start Time</Text>
                <Button mode="outlined" icon="clock-outline" onPress={() => setTimeEditStartPickerVisible(true)}>
                  {format24To12(`${String(timeEditStart.hours).padStart(2, '0')}:${String(timeEditStart.minutes).padStart(2, '0')}`)}
                </Button>
              </View>

              {timeEditMode === 'end_time' ? (
                <View style={styles.timeEditInputCol}>
                  <Text variant="labelLarge">End Time</Text>
                  <Button mode="outlined" icon="clock-outline" onPress={() => setTimeEditEndPickerVisible(true)}>
                    {format24To12(`${String(timeEditEnd.hours).padStart(2, '0')}:${String(timeEditEnd.minutes).padStart(2, '0')}`)}
                  </Button>
                </View>
              ) : (
                <View style={styles.timeEditInputCol}>
                  <Text variant="labelLarge">Duration</Text>
                  <View style={styles.timeEditDurationAdjustRow}>
                    <Button mode="outlined" compact onPress={() => handleTimeEditDurationAdjust(-DURATION_STEP_MINUTES)}>
                      -
                    </Button>
                    <Text variant="bodyLarge" style={styles.timeEditDurationAdjustValue}>
                      {timeEditDuration} min
                    </Text>
                    <Button mode="outlined" compact onPress={() => handleTimeEditDurationAdjust(DURATION_STEP_MINUTES)}>
                      +
                    </Button>
                  </View>
                </View>
              )}
            </View>

            <View style={[styles.timeEditDurationInfo, { backgroundColor: theme.colors.secondaryContainer }]}> 
              <MaterialCommunityIcons name="clock-outline" size={18} color={theme.colors.primary} style={styles.timeEditDurationIcon} />
              <Text variant="bodyLarge" style={styles.timeEditDurationText}>
                Duration: {formatDurationHumanReadable(timeEditDuration)}
              </Text>
            </View>

            <Text variant="bodySmall" style={[styles.timeEditHintText, { color: theme.colors.onSurfaceVariant }]}>
              This updates your draft. AI will intelligently rebalance the full itinerary when you save all overview edits.
            </Text>

            {!!timeEditError && (
              <Text variant="bodySmall" style={{ color: theme.colors.error }}>
                {timeEditError}
              </Text>
            )}

            <View style={styles.timeEditActions}>
              <Button mode="outlined" onPress={() => setTimeEditVisible(false)}>Cancel</Button>
              <Button mode="contained" onPress={handleTimeEditConfirm}>Save</Button>
            </View>
          </View>
        </Modal>
      </Portal>

      <TimePickerModal
        visible={timeEditStartPickerVisible}
        onDismiss={() => setTimeEditStartPickerVisible(false)}
        onConfirm={handleTimeEditStartConfirm}
        hours={timeEditStart.hours}
        minutes={timeEditStart.minutes}
        label="Select start time"
        cancelLabel="Cancel"
        confirmLabel="OK"
        animationType="fade"
      />

      <TimePickerModal
        visible={timeEditEndPickerVisible && timeEditMode === 'end_time'}
        onDismiss={() => setTimeEditEndPickerVisible(false)}
        onConfirm={handleTimeEditEndConfirm}
        hours={timeEditEnd.hours}
        minutes={timeEditEnd.minutes}
        label="Select end time"
        cancelLabel="Cancel"
        confirmLabel="OK"
        animationType="fade"
      />
    </>
  );
};

const buildDraftOperations = (
  draftRowsByDayId: Record<number, DraftRow[]>,
  initialRowsById: Record<number, DraftRow>,
  overview: IItineraryOverview | null
): IOverviewDraftOperation[] => {
  if (!overview) {
    return [];
  }

  const operations: IOverviewDraftOperation[] = [];

  const currentExistingIds = new Set<number>();
  Object.values(draftRowsByDayId).forEach((rows) => {
    rows.forEach((row) => {
      if (row.id) {
        currentExistingIds.add(row.id);
      }
    });
  });

  Object.values(initialRowsById).forEach((initialRow) => {
    if (!initialRow.id) {
      return;
    }
    if (!currentExistingIds.has(initialRow.id)) {
      operations.push({ operation: 'delete', activity_id: initialRow.id });
    }
  });

  Object.values(draftRowsByDayId).forEach((rows) => {
    rows.forEach((row) => {
      if (!row.id) {
        return;
      }

      const initialRow = initialRowsById[row.id];
      if (!initialRow) {
        return;
      }

      if (row.googlePlaceId !== initialRow.googlePlaceId) {
        operations.push({
          operation: 'replace',
          activity_id: row.id,
          new_google_place_id: row.googlePlaceId,
          time_start: row.timeStart24,
          time_end: row.timeEnd24,
          duration_minutes: row.durationMinutes,
        });
        return;
      }

      const startChanged = row.timeStart24 !== initialRow.timeStart24;
      const endChanged = row.timeEnd24 !== initialRow.timeEnd24;
      const durationChanged = row.durationMinutes !== initialRow.durationMinutes;

      if (!startChanged && !endChanged && !durationChanged) {
        return;
      }

      if (startChanged && !endChanged && !durationChanged) {
        operations.push({
          operation: 'set_start_time',
          activity_id: row.id,
          time_start: row.timeStart24,
        });
        return;
      }

      operations.push({
        operation: 'replace',
        activity_id: row.id,
        new_google_place_id: row.googlePlaceId,
        time_start: row.timeStart24,
        time_end: row.timeEnd24,
        duration_minutes: row.durationMinutes,
      });
    });
  });

  overview.days.forEach((day) => {
    const rows = draftRowsByDayId[day.id] || [];
    rows.forEach((row, index) => {
      if (!row.isNew) {
        return;
      }

      operations.push({
        operation: 'add',
        day_id: day.id,
        google_place_id: row.googlePlaceId,
        time_start: row.timeStart24,
        time_end: row.timeEnd24,
        duration_minutes: row.durationMinutes,
        insert_after_order: index,
      });
    });
  });

  return operations;
};

const styles = StyleSheet.create({
  modalContainer: {
    margin: 12,
  },
  modalContent: {
    borderRadius: 14,
    padding: 14,
    maxHeight: '96%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerTitle: {
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingState: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  daysScroll: {
    flexGrow: 0,
  },
  daysContent: {
    paddingBottom: 10,
  },
  overviewIntroText: {
    paddingHorizontal: 2,
    marginBottom: 8,
    lineHeight: 18,
    opacity: 0.9,
  },
  dayAccordion: {
    marginBottom: 0,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  dayAccordionTitle: {
    fontWeight: '700',
  },
  dayAccordionDescription: {
    fontWeight: '500',
  },
  table: {
    borderWidth: 1,
    overflow: 'hidden',
    width: '100%',
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  transitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 7,
    opacity: 0.9,
  },
  addRow: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  headerText: {
    fontWeight: '700',
  },
  timeCol: {
    width: 86,
  },
  activityCol: {
    flex: 1,
    paddingHorizontal: 6,
  },
  actionCol: {
    width: 132,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  timeText: {
    fontWeight: '600',
  },
  timeCellPressable: {
    gap: 1,
  },
  timeEndText: {
    fontSize: 11,
    lineHeight: 14,
  },
  footerActions: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  confirmModalContainer: {
    margin: 16,
  },
  confirmModalContent: {
    borderRadius: 14,
    padding: 14,
  },
  confirmTitle: {
    fontWeight: '700',
    marginBottom: 8,
  },
  confirmHint: {
    marginBottom: 10,
    lineHeight: 18,
  },
  confirmList: {
    flexGrow: 0,
  },
  confirmListContent: {
    paddingBottom: 8,
  },
  confirmGroup: {
    marginBottom: 10,
  },
  confirmGroupTitle: {
    fontWeight: '700',
    marginBottom: 4,
  },
  confirmItem: {
    marginBottom: 8,
    lineHeight: 20,
  },
  confirmActions: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  timeEditModalContainer: {
    margin: 16,
  },
  timeEditModalContent: {
    borderRadius: 14,
    padding: 14,
  },
  timeEditTitle: {
    fontWeight: '700',
    marginBottom: 10,
  },
  timeEditDescriptionBox: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  timeEditSummaryTitle: {
    fontWeight: '700',
    marginBottom: 2,
  },
  timeEditInputRow: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  timeEditModeOption: {
    flex: 1,
    minHeight: 36,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeEditInputCols: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  timeEditInputCol: {
    flex: 1,
    gap: 6,
  },
  timeEditDurationAdjustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeEditDurationAdjustValue: {
    minWidth: 76,
    textAlign: 'center',
    fontWeight: '700',
  },
  timeEditDurationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  timeEditDurationIcon: {
    marginRight: 6,
  },
  timeEditDurationText: {
    fontWeight: '500',
  },
  timeEditHintText: {
    marginBottom: 12,
    lineHeight: 18,
  },
  timeEditActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
});

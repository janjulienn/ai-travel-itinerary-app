// Itinerary detail screen - full day-by-day itinerary

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, Card, Chip, Button, ActivityIndicator, useTheme, Portal, Modal, IconButton } from 'react-native-paper';
import { useRoute, RouteProp, useNavigation, useIsFocused } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ErrorCard } from '../../components/common/ErrorCard';
import { LoadingOverlay } from '../../components/common/LoadingOverlay';
import { ItineraryTimeline } from '../../components/ItineraryTimeline';
import { AdjustmentSummaryModal } from '../../components/AdjustmentSummaryModal';
import { useItineraryDetail } from '../../hooks/useItineraries';
import { itinerariesApi } from '../../services/api/itineraries';
import { addPendingItinerary } from '../../services/pendingItineraries';
import { useApp } from '../../store/store';
import { getStatusConfig } from '../../theme';
import type { TripsStackParamList } from '../../types/navigation';
import type {
  IActivityAddRequest,
  IActivityReplaceRequest,
  IActivityDeleteRequest,
  IItineraryAdjustmentHistoryItem,
  IItineraryDay,
} from '../../types/dtos/itinerary';

type RouteProps = RouteProp<TripsStackParamList, 'ItineraryDetail'>;
const STICKY_SHOW_OFFSET = 8;
const ACCORDION_HEADER_TO_CONTENT_OFFSET = 78;
const STICKY_ROW_MIN_HEIGHT = 72;
const STICKY_ROW_MAX_HEIGHT = 96;

export default function ItineraryDetailScreen() {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const { state } = useApp();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { itinerary, loading, error, refresh } = useItineraryDetail(route.params.id);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [adjustmentSummaryVisible, setAdjustmentSummaryVisible] = useState(false);
  const [adjustmentSummary, setAdjustmentSummary] = useState<string>('');
  const [expandedDayNumber, setExpandedDayNumber] = useState<number | null>(1);
  const [dayHeaderLayouts, setDayHeaderLayouts] = useState<Record<number, { y: number; height: number }>>({});
  const [timelineTopY, setTimelineTopY] = useState(0);
  const [scrollY, setScrollY] = useState(0);
  const [collapseSignal, setCollapseSignal] = useState(0);
  const [pendingAutoScrollDay, setPendingAutoScrollDay] = useState<number | null>(null);
  const [editingDayNumber, setEditingDayNumber] = useState<number | null>(null);
  const [editToggleSignal, setEditToggleSignal] = useState(0);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyItems, setHistoryItems] = useState<IItineraryAdjustmentHistoryItem[]>([]);
  const itineraryScrollRef = useRef<ScrollView>(null);
  const seenMarkedRef = useRef(false);

  const historyModalMaxHeight = width >= 768 ? '99%' : '96%';

  useEffect(() => {
    if (isFocused) {
      return;
    }

    setAdjustmentSummaryVisible(false);
  }, [isFocused]);

  const expandedDay = useMemo<IItineraryDay | null>(() => {
    if (!expandedDayNumber) {
      return null;
    }

    return itinerary?.days.find((day) => day.day_number === expandedDayNumber) ?? null;
  }, [expandedDayNumber, itinerary?.days]);

  const isStickyVisible = useMemo(() => {
    if (!expandedDayNumber || !expandedDay) {
      return false;
    }

    const dayLayout = dayHeaderLayouts[expandedDayNumber];
    if (!dayLayout) {
      return false;
    }

    const dayHeaderAbsoluteY = timelineTopY + dayLayout.y;
    return scrollY > dayHeaderAbsoluteY + STICKY_SHOW_OFFSET;
  }, [dayHeaderLayouts, expandedDay, expandedDayNumber, scrollY, timelineTopY]);

  const stickyRowHeight = useMemo(() => {
    const measuredHeights = Object.entries(dayHeaderLayouts)
      .filter(([dayNumber]) => Number(dayNumber) !== expandedDayNumber)
      .map(([, layout]) => layout.height)
      .filter((height) => height > 0);

    if (measuredHeights.length > 0) {
      return Math.min(
        STICKY_ROW_MAX_HEIGHT,
        Math.max(STICKY_ROW_MIN_HEIGHT, Math.min(...measuredHeights))
      );
    }

    const fallbackHeights = Object.values(dayHeaderLayouts)
      .map((layout) => layout.height)
      .filter((height) => height > 0);

    if (fallbackHeights.length > 0) {
      return Math.min(
        STICKY_ROW_MAX_HEIGHT,
        Math.max(STICKY_ROW_MIN_HEIGHT, Math.min(...fallbackHeights))
      );
    }

    return 82;
  }, [dayHeaderLayouts, expandedDayNumber]);

  useEffect(() => {
    setDayHeaderLayouts({});
  }, [itinerary?.days]);

  useEffect(() => {
    if (!pendingAutoScrollDay) {
      return;
    }

    const layout = dayHeaderLayouts[pendingAutoScrollDay];
    if (!layout) {
      return;
    }

    const targetY = Math.max(0, timelineTopY + layout.y + ACCORDION_HEADER_TO_CONTENT_OFFSET);

    requestAnimationFrame(() => {
      itineraryScrollRef.current?.scrollTo({ y: targetY, animated: true });
      setPendingAutoScrollDay(null);
    });
  }, [dayHeaderLayouts, pendingAutoScrollDay, timelineTopY]);

  useEffect(() => {
    if (!isFocused || !itinerary?.has_unseen_update || seenMarkedRef.current) {
      return;
    }

    seenMarkedRef.current = true;

    if (itinerary.latest_adjustment_summary) {
      setAdjustmentSummary(itinerary.latest_adjustment_summary);
      setAdjustmentSummaryVisible(true);
    }

    itinerariesApi.markAdjustmentsSeen(itinerary.id).catch((err) => {
      console.error('Error marking adjustments as seen:', err);
      seenMarkedRef.current = false;
    });
  }, [isFocused, itinerary?.has_unseen_update, itinerary?.id, itinerary?.latest_adjustment_summary]);

  useEffect(() => {
    if (!isFocused || (itinerary?.status !== 'generating' && itinerary?.status !== 'updating')) {
      return;
    }

    const timer = setInterval(() => {
      refresh();
    }, 5000);

    return () => clearInterval(timer);
  }, [isFocused, itinerary?.status, refresh]);

  const handleActivityAdded = async (dayId: number, data: Omit<IActivityAddRequest, 'day_id'>) => {
    try {
      setEditLoading(true);
      setEditError(null);
      await itinerariesApi.addActivity(route.params.id, { ...data, day_id: dayId });
      (navigation as any).navigate('TripsTab', {
        screen: 'Trips',
        params: { toastMessage: 'Itinerary update is ongoing. You can check back shortly.' },
      });
    } catch (err: any) {
      console.error('Error adding activity:', err);
      setEditError(err.message || 'Failed to add activity');
    } finally {
      setEditLoading(false);
    }
  };

  const handleActivityReplaced = async (activityId: number, data: IActivityReplaceRequest) => {
    try {
      setEditLoading(true);
      setEditError(null);
      await itinerariesApi.replaceActivity(route.params.id, { ...data, activity_id: activityId });
      (navigation as any).navigate('TripsTab', {
        screen: 'Trips',
        params: { toastMessage: 'Itinerary update is ongoing. You can check back shortly.' },
      });
    } catch (err: any) {
      console.error('Error replacing activity:', err);
      setEditError(err.message || 'Failed to replace activity');
    } finally {
      setEditLoading(false);
    }
  };

  const handleActivityDeleted = async (activityId: number) => {
    try {
      setEditLoading(true);
      setEditError(null);
      await itinerariesApi.deleteActivity(route.params.id, { activity_id: activityId });
      await refresh();
    } catch (err: any) {
      console.error('Error deleting activity:', err);
      setEditError(err.message || 'Failed to delete activity');
    } finally {
      setEditLoading(false);
    }
  };

  const handleRegenerate = async () => {
    try {
      setEditLoading(true);
      setEditError(null);
      const response = await itinerariesApi.regenerateItinerary(route.params.id);
      if (state.isGuest) {
        await addPendingItinerary(response.id);
      }
      await refresh();
      (navigation as any).navigate('Trips', {
        toastMessage: 'Itinerary update is ongoing. You can check back shortly.',
      });
    } catch (err: any) {
      console.error('Error regenerating itinerary:', err);
      setEditError(err.message || 'Failed to regenerate itinerary');
    } finally {
      setEditLoading(false);
    }
  };

  const handleOpenHistory = async () => {
    try {
      setHistoryLoading(true);
      const items = await itinerariesApi.listAdjustments(route.params.id);
      setHistoryItems(items);
      setHistoryVisible(true);
    } catch (err: any) {
      setEditError(err.message || 'Failed to load adjustment history');
    } finally {
      setHistoryLoading(false);
    }
  };

  const getSummaryBullets = (summary?: string): string[] => {
    if (!summary) {
      return [];
    }

    return summary
      .split(/\.\s+/)
      .map((item) => item.trim())
      .filter((item) => item.length > 0)
      .map((item) => (item.endsWith('.') ? item : `${item}.`));
  };

  const handleStickyHeaderPress = () => {
    setCollapseSignal((current) => current + 1);
    setExpandedDayNumber(null);
    setPendingAutoScrollDay(null);
  };

  const handleStickyEditPress = () => {
    if (!expandedDayNumber) {
      return;
    }

    setEditToggleSignal((current) => current + 1);
  };

  const handleExpandedDayChange = (dayNumber: number | null) => {
    setExpandedDayNumber(dayNumber);

    if (dayNumber) {
      setPendingAutoScrollDay(dayNumber);
      return;
    }

    setPendingAutoScrollDay(null);
  };

  const handleBackPress = () => {
    if ((navigation as any).canGoBack?.()) {
      (navigation as any).goBack();
      return;
    }

    (navigation as any).navigate('TripsTab', { screen: 'Trips' });
  };

  if (loading && !itinerary) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text variant="bodyLarge" style={styles.loadingText}>
            Loading itinerary...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !itinerary) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
        <View style={styles.centerContainer}>
          <ErrorCard
            message={error || 'Itinerary not found'}
            onRetry={error ? refresh : undefined}
          />
        </View>
      </SafeAreaView>
    );
  }

  const statusConfig = getStatusConfig(theme, itinerary.status);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
    {isStickyVisible && expandedDay && (
      <View
        style={[
          styles.stickyHeader,
          {
            top: insets.top,
            minHeight: stickyRowHeight,
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.outlineVariant,
          },
        ]}
      >
        <View style={styles.stickyHeaderContent}>
          <Pressable style={styles.stickyMainPressArea} onPress={handleStickyHeaderPress}>
            <View style={styles.stickyLeftIcon}>
              <MaterialCommunityIcons name="calendar-today" size={24} color={theme.colors.primary} />
            </View>
            <View style={styles.stickyTextContainer}>
              <Text variant="titleLarge" style={[styles.stickyTitle, { color: theme.colors.onSurface }]}>
                Day {expandedDay.day_number} - {expandedDay.date_display}
              </Text>
              <Text
                variant="bodyMedium"
                style={[styles.stickyDescription, { color: theme.colors.onSurfaceVariant }]}
                numberOfLines={2}
              >
                {expandedDay.theme}
              </Text>
            </View>
            <View style={styles.stickyChevronSlot}>
              <MaterialCommunityIcons name="chevron-up" size={20} color={theme.colors.primary} />
            </View>
          </Pressable>

          <IconButton
            icon={editingDayNumber === expandedDay.day_number ? 'check' : 'pencil'}
            size={22}
            onPress={handleStickyEditPress}
            disabled={editLoading}
            style={styles.stickyEditButton}
            containerColor={theme.colors.surface}
            iconColor={theme.colors.primary}
          />
        </View>
      </View>
    )}
    <ScrollView
      ref={itineraryScrollRef}
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      onScroll={(event) => setScrollY(event.nativeEvent.contentOffset.y)}
      scrollEventThrottle={16}
    >
      <View style={styles.backButtonRow}>
        <IconButton
          icon="chevron-left"
          size={24}
          onPress={handleBackPress}
          accessibilityLabel="Back to My Trips"
        />
      </View>

      {/* Header Card */}
      <Card style={styles.headerCard}>
        <Card.Content>
          <View style={styles.headerTop}>
            <Text variant="headlineMedium" style={styles.title}>
              {itinerary.title}
            </Text>
            <Chip
              icon={statusConfig.icon}
              style={[styles.statusChip, { backgroundColor: statusConfig.containerColor }]}
              textStyle={{ color: statusConfig.color, fontWeight: 'bold' }}
            >
              {statusConfig.label}
            </Chip>
          </View>

          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="map-marker" size={20} color={theme.colors.primary} />
            <Text variant="titleMedium" style={styles.infoText}>
              {itinerary.province_country_name
                ? `${itinerary.province_name}, ${itinerary.province_country_name}`
                : itinerary.province_name}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="calendar-range" size={20} color={theme.colors.primary} />
            <Text variant="bodyLarge" style={styles.infoText}>
              {itinerary.start_date} to {itinerary.end_date}
            </Text>
          </View>

          {itinerary.summary && (
            <Text variant="bodyLarge" style={styles.summary}>
              {itinerary.summary}
            </Text>
          )}

          <View style={styles.headerActions}>
            <Button
              mode="outlined"
              icon="history"
              onPress={handleOpenHistory}
              loading={historyLoading}
              disabled={historyLoading}
            >
              View Update History
            </Button>
          </View>

          {/* Trip Stats */}
          <View style={styles.stats}>
            {itinerary.preferences.budget_range && (
              <Chip icon="cash" style={styles.statChip}>
                {itinerary.preferences.budget_range}
              </Chip>
            )}
            {itinerary.preferences.pace && (
              <Chip icon="walk" style={styles.statChip}>
                {itinerary.preferences.pace}
              </Chip>
            )}
            {itinerary.preferences.group_type && (
              <Chip icon="account-group" style={styles.statChip}>
                {itinerary.preferences.group_type}
              </Chip>
            )}
            <Chip icon="account-multiple" style={styles.statChip}>
              {itinerary.group_size} {itinerary.group_size === 1 ? 'person' : 'people'}
            </Chip>
          </View>

          {itinerary.preferences.interests && itinerary.preferences.interests.length > 0 && (
            <View style={styles.interests}>
              <Text variant="labelLarge" style={styles.interestsLabel}>
                Interests:
              </Text>
              <View style={styles.interestsChips}>
                {itinerary.preferences.interests.map((interest, index) => (
                  <Chip key={index} style={styles.interestChip} compact>
                    {interest}
                  </Chip>
                ))}
              </View>
            </View>
          )}
        </Card.Content>
      </Card>

      {/* Timeline */}
      {(itinerary.status === 'ready' || itinerary.status === 'updating') && itinerary.days.length > 0 && (
        <View
          style={styles.timelineContainer}
          onLayout={(event) => setTimelineTopY(event.nativeEvent.layout.y)}
        >
          {itinerary.status === 'updating' && (
            <View style={[styles.updatingBanner, { backgroundColor: theme.colors.secondaryContainer }]}> 
              <MaterialCommunityIcons name="progress-clock" size={18} color={theme.colors.onSecondaryContainer} />
              <Text variant="bodyMedium" style={[styles.updatingBannerText, { color: theme.colors.onSecondaryContainer }]}>
                Updating itinerary… changes are processing in the background.
              </Text>
            </View>
          )}
          <Text variant="titleLarge" style={styles.timelineTitle}>
            Your Itinerary
          </Text>
          <ItineraryTimeline
            days={itinerary.days}
            itineraryId={itinerary.id}
            provinceCountrySlug={itinerary.province_country_slug}
            provinceSlug={itinerary.province_slug}
            provinceName={itinerary.province_name}
            onActivityAdded={handleActivityAdded}
            onActivityReplaced={handleActivityReplaced}
            onActivityDeleted={handleActivityDeleted}
            isLoading={editLoading || itinerary.status === 'updating'}
            onExpandedDayChange={handleExpandedDayChange}
            onDayHeaderLayout={(dayNumber, layout) => {
              setDayHeaderLayouts((current) => ({ ...current, [dayNumber]: layout }));
            }}
            collapseSignal={collapseSignal}
            onEditingDayChange={setEditingDayNumber}
            editToggleSignal={editToggleSignal}
            editToggleDayNumber={expandedDayNumber}
          />
        </View>
      )}

      {/* Error state */}
      {itinerary.status === 'failed' && (
        <View style={styles.errorContainer}>
          <ErrorCard
            message={itinerary.error_message || 'Failed to generate itinerary'}
            onRetry={handleRegenerate}
            retryLabel="Regenerate"
          />
        </View>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <Button
          mode="contained"
          onPress={() => (navigation as any).navigate('GenerateTab', { screen: 'Generate' })}
          icon="plus"
          style={styles.actionButton}
        >
          Generate Another
        </Button>
      </View>

      {/* Edit error */}
      {editError && (
        <View style={styles.errorContainer}>
          <ErrorCard
            message={editError}
            onRetry={() => setEditError(null)}
            retryLabel="Dismiss"
          />
        </View>
      )}

      {/* Loading overlay during AI adjustments */}
      <LoadingOverlay
        visible={editLoading}
        message="AI is adjusting your itinerary..."
      />

      {/* Adjustment summary modal */}
      <AdjustmentSummaryModal
        visible={adjustmentSummaryVisible}
        onDismiss={() => setAdjustmentSummaryVisible(false)}
        summary={adjustmentSummary}
      />

      <Portal>
        <Modal
          visible={historyVisible}
          onDismiss={() => setHistoryVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface, maxHeight: historyModalMaxHeight }]}>
            <Text variant="titleLarge" style={styles.modalTitle}>
              Adjustment History
            </Text>
            <ScrollView>
              {historyItems.length === 0 ? (
                <View style={styles.historyEmptyState}>
                  <MaterialCommunityIcons
                    name="history"
                    size={30}
                    color={theme.colors.onSurfaceVariant}
                  />
                  <Text variant="titleMedium" style={styles.historyEmptyTitle}>
                    No updates yet
                  </Text>
                  <Text variant="bodyMedium" style={[styles.modalMessage, { color: theme.colors.onSurfaceVariant }]}> 
                    AI update history will appear here after you add, replace, delete, or regenerate activities.
                  </Text>
                </View>
              ) : (
                historyItems.map((item) => (
                  <View key={item.id} style={[styles.historyItem, { borderBottomColor: theme.colors.outlineVariant }]}> 
                    <Text variant="labelLarge">
                      {item.operation_display} • {item.status_display}
                    </Text>
                    {!!item.summary && (
                      <View style={styles.historySummaryContainer}>
                        {getSummaryBullets(item.summary).map((bullet, index) => (
                          <Text key={`${item.id}-bullet-${index}`} variant="bodyMedium" style={styles.historySummaryBullet}>
                            • {bullet}
                          </Text>
                        ))}
                      </View>
                    )}
                    {!!item.error_message && (
                      <Text variant="bodySmall" style={{ color: theme.colors.error }}>
                        {item.error_message}
                      </Text>
                    )}
                    {item.completed_at && (
                      <Text variant="bodySmall" style={styles.historyMeta}>
                        Completed: {new Date(item.completed_at).toLocaleString()}
                      </Text>
                    )}
                  </View>
                ))
              )}
            </ScrollView>
            <Button mode="contained" onPress={() => setHistoryVisible(false)}>
              Close
            </Button>
          </View>
        </Modal>
      </Portal>
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  backButtonRow: {
    alignItems: 'flex-start',
    paddingHorizontal: 8,
    paddingTop: 4,
  },
  headerCard: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  title: {
    fontWeight: 'bold',
    flex: 1,
    marginRight: 12,
  },
  statusChip: {
    height: 32,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoText: {
    marginLeft: 8,
  },
  summary: {
    marginTop: 8,
    lineHeight: 24,
    opacity: 0.8,
  },
  headerActions: {
    marginTop: 12,
  },
  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 16,
  },
  statChip: {
    marginRight: 8,
    marginBottom: 8,
    height: 32,
  },
  interests: {
    marginTop: 12,
  },
  interestsLabel: {
    opacity: 0.7,
    marginBottom: 8,
  },
  interestsChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  interestChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  timelineContainer: {
    margin: 16,
    marginTop: 0,
  },
  updatingBanner: {
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  updatingBannerText: {
    marginLeft: 8,
    flex: 1,
  },
  timelineTitle: {
    fontWeight: 'bold',
    marginBottom: 16,
  },
  stickyHeader: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 20,
    justifyContent: 'center',
    borderRadius: 0,
    borderTopWidth: 0,
    borderBottomWidth: 1,
    elevation: 0,
  },
  stickyHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 10,
  },
  stickyMainPressArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  stickyLeftIcon: {
    width: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stickyTextContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingRight: 8,
  },
  stickyTitle: {
    fontWeight: '700',
    fontSize: 20,
    lineHeight: 24,
  },
  stickyDescription: {
    fontSize: 16,
    marginTop: 0,
    lineHeight: 20,
  },
  stickyChevronSlot: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stickyEditButton: {
    margin: 0,
    width: 42,
    height: 42,
    alignSelf: 'center',
  },
  errorContainer: {
    margin: 16,
  },
  actions: {
    padding: 16,
  },
  actionButton: {
    paddingVertical: 6,
  },
  modalContainer: {
    margin: 12,
  },
  modalContent: {
    borderRadius: 12,
    padding: 20,
    gap: 12,
  },
  modalTitle: {
    fontWeight: '700',
  },
  modalMessage: {
    lineHeight: 22,
    textAlign: 'center',
  },
  historyEmptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 8,
  },
  historyEmptyTitle: {
    fontWeight: '700',
  },
  historyItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  historySummaryContainer: {
    marginTop: 4,
    gap: 4,
  },
  historySummaryBullet: {
    lineHeight: 20,
  },
  historyMeta: {
    marginTop: 6,
    opacity: 0.7,
  },
});

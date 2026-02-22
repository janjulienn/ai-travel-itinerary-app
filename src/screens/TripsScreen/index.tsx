// Trips screen - user's itineraries list

import React from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Button, ActivityIndicator, Snackbar, useTheme } from 'react-native-paper';
import { useNavigation, useFocusEffect, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AxiosError } from 'axios';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ErrorCard } from '../../components/common/ErrorCard';
import { DeleteItineraryModal } from '../../components/DeleteItineraryModal';
import { ItineraryCard } from '../../components/ItineraryCard';
import { useItineraries } from '../../hooks/useItineraries';
import { useApp } from '../../store/store';
import { itinerariesApi } from '../../services/api/itineraries';
import type { IItineraryList } from '../../types/dtos/itinerary';
import { TripsStackParamList } from '../../types/navigation';

type NavigationProp = NativeStackNavigationProp<TripsStackParamList>;
type TripsRouteProp = RouteProp<TripsStackParamList, 'Trips'>;

export default function TripsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<TripsRouteProp>();
  const theme = useTheme();
  const { state } = useApp();
  const { itineraries, loading, error, refresh } = useItineraries();
  const insets = useSafeAreaInsets();
  const [showPullToRefreshHint, setShowPullToRefreshHint] = React.useState(false);
  const [isPullRefreshing, setIsPullRefreshing] = React.useState(false);
  const [itineraryToDelete, setItineraryToDelete] = React.useState<IItineraryList | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    const message = route.params?.toastMessage;
    if (!message) {
      return;
    }

    setToastMessage(message);
    navigation.setParams({ toastMessage: undefined });
  }, [navigation, route.params?.toastMessage]);

  // Refetch itineraries when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      refresh();
    }, [refresh])
  );

  React.useEffect(() => {
    const hasInFlight = itineraries.some(
      (item) => item.status === 'generating' || item.status === 'updating'
    );

    if (!hasInFlight) {
      return;
    }

    const timer = setInterval(() => {
      refresh();
    }, 5000);

    return () => clearInterval(timer);
  }, [itineraries, refresh]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    setShowPullToRefreshHint(offsetY < -24 && !loading);
  };

  const handlePullRefresh = async () => {
    setIsPullRefreshing(true);
    try {
      await refresh();
    } finally {
      setIsPullRefreshing(false);
    }
  };

  const handleItineraryPress = (id: string) => {
    navigation.navigate('ItineraryDetail', { id });
  };

  const getDeleteErrorMessage = (error: unknown): string => {
    const axiosError = error as AxiosError<{ error?: { message?: string } }>;
    const backendMessage = axiosError?.response?.data?.error?.message;

    if (backendMessage) {
      return backendMessage;
    }

    if (error instanceof Error && error.message) {
      return error.message;
    }

    return 'Failed to delete itinerary. Please try again.';
  };

  const handleDeletePress = (itinerary: IItineraryList) => {
    setDeleteError(null);
    setItineraryToDelete(itinerary);
  };

  const handleDeleteDismiss = () => {
    if (isDeleting) {
      return;
    }

    setDeleteError(null);
    setItineraryToDelete(null);
  };

  const handleDeleteConfirm = async () => {
    if (!itineraryToDelete) {
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await itinerariesApi.deleteItinerary(itineraryToDelete.id);
      setItineraryToDelete(null);
      await refresh();
    } catch (error) {
      setDeleteError(getDeleteErrorMessage(error));
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading && (!itineraries || itineraries.length === 0)) {
    return (
      <SafeAreaView style={styles.centerContainer} edges={['top']}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text variant="bodyLarge" style={styles.loadingText}>
          Loading itineraries...
        </Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.centerContainer} edges={['top']}>
        <ErrorCard message={error} onRetry={refresh} />
      </SafeAreaView>
    );
  }

  // Empty state for guests
  if (state.isGuest && (!itineraries || itineraries.length === 0)) {
    return (
      <SafeAreaView style={styles.centerContainer} edges={['top']}>
        <MaterialCommunityIcons name="map-outline" size={80} color={theme.colors.primary} />
        <Text variant="headlineSmall" style={styles.emptyTitle}>
          No itineraries yet
        </Text>
        <Text variant="bodyLarge" style={styles.emptySubtitle}>
          Your generated itineraries will appear here.
        </Text>
        <Text variant="bodyMedium" style={styles.emptyNote}>
          💡 Create an account to save and access your itineraries across devices
        </Text>
        <Button
          mode="contained"
          onPress={() => (navigation as any).navigate('ProfileTab')}
          style={styles.emptyButton}
        >
          Create Account
        </Button>
      </SafeAreaView>
    );
  }

  // Empty state for logged-in users
  if (!itineraries || itineraries.length === 0) {
    return (
      <SafeAreaView style={styles.centerContainer} edges={['top']}>
        <MaterialCommunityIcons name="map-plus" size={80} color={theme.colors.primary} />
        <Text variant="headlineSmall" style={styles.emptyTitle}>
          No itineraries yet
        </Text>
        <Text variant="bodyLarge" style={styles.emptySubtitle}>
          Start planning your adventure!
        </Text>
        <Button
          mode="contained"
          onPress={() => (navigation as any).navigate('GenerateTab', { screen: 'Generate' })}
          style={styles.emptyButton}
          icon="plus"
        >
          Generate Itinerary
        </Button>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      {showPullToRefreshHint && (
        <View
          style={[
            styles.pullHintContainer,
            {
              top: insets.top + 4,
              backgroundColor: theme.colors.surfaceVariant,
            },
          ]}
        >
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            Pull down to refresh your trips
          </Text>
        </View>
      )}
      <FlatList
        data={itineraries || []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ItineraryCard
            itinerary={item}
            onPress={() => handleItineraryPress(item.id)}
            onDelete={state.isGuest ? undefined : () => handleDeletePress(item)}
            deleting={isDeleting && itineraryToDelete?.id === item.id}
          />
        )}
        contentContainerStyle={[styles.list, { paddingTop: insets.top + 8 }]}
        ListHeaderComponent={
          isPullRefreshing && itineraries.length > 0 ? (
            <View style={styles.listLoadingContainer}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
            </View>
          ) : null
        }
        onScroll={handleScroll}
        onScrollEndDrag={() => setShowPullToRefreshHint(false)}
        onMomentumScrollEnd={() => setShowPullToRefreshHint(false)}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={isPullRefreshing}
            onRefresh={handlePullRefresh}
            title="Pull down to refresh"
          />
        }
      />
      <DeleteItineraryModal
        visible={Boolean(itineraryToDelete)}
        onDismiss={handleDeleteDismiss}
        onConfirm={handleDeleteConfirm}
        itineraryTitle={itineraryToDelete?.title}
        loading={isDeleting}
        errorMessage={deleteError}
      />
      <Snackbar visible={Boolean(toastMessage)} onDismiss={() => setToastMessage(null)} duration={3500}>
        {toastMessage}
      </Snackbar>
    </View>
  );
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
  list: {
    padding: 8,
  },
  listLoadingContainer: {
    paddingVertical: 6,
    alignItems: 'center',
  },
  pullHintContainer: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  emptyTitle: {
    fontWeight: 'bold',
    marginTop: 24,
    marginBottom: 8,
  },
  emptySubtitle: {
    opacity: 0.7,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyNote: {
    opacity: 0.6,
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 24,
    paddingHorizontal: 32,
  },
  emptyButton: {
    marginTop: 8,
  },
});

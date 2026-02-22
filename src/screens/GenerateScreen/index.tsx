// Generate screen - itinerary generation wizard

import React, { useCallback, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from 'react-native-paper';
import { GenerateWizard } from '../../components/GenerateWizard';
import { ErrorCard } from '../../components/common/ErrorCard';
import { useProvinces } from '../../hooks/useProvinces';
import { itinerariesApi } from '../../services/api/itineraries';
import { addPendingItinerary } from '../../services/pendingItineraries';
import type { GenerateStackParamList } from '../../types/navigation';
import type { IItineraryCreateRequest } from '../../types/dtos/itinerary';

type NavigationProp = NativeStackNavigationProp<any>;
type RoutePropType = RouteProp<GenerateStackParamList, 'Generate'>;

export default function GenerateScreen() {
  const navigation = useNavigation<NavigationProp>();
  const theme = useTheme();
  const route = useRoute<RoutePropType>();
  const { provinces } = useProvinces();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastRequestData, setLastRequestData] = useState<IItineraryCreateRequest | null>(null);
  const [wizardResetKey, setWizardResetKey] = useState(0);

  useFocusEffect(
    useCallback(() => {
      setError('');
    }, [])
  );

  const handleGenerate = async (data: IItineraryCreateRequest) => {
    try {
      setLoading(true);
      setError('');
      setLastRequestData(data);
      
      const itinerary = await itinerariesApi.createItinerary(data);

      await addPendingItinerary(itinerary.id);

      setWizardResetKey((prev) => prev + 1);
      navigation.navigate(
        'TripsTab',
        {
          screen: 'Trips',
          params: { toastMessage: 'Itinerary generation is ongoing. You can check back shortly.' },
        } as any
      );
    } catch (err: any) {
      console.error('Error generating itinerary:', err);
      
      // Extract error message from various possible formats
      const errorMessage = 
        err.response?.data?.error?.message ||
        err.response?.data?.error_message ||
        err.message ||
        'Failed to generate itinerary. Please try again.';
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    if (lastRequestData) {
      handleGenerate(lastRequestData);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {error ? (
          <ErrorCard
            message={error}
            onRetry={lastRequestData ? handleRetry : undefined}
            retryLabel="Try Again"
          />
        ) : (
          <GenerateWizard
            provinces={provinces}
            initialProvinceSlug={route.params?.provinceSlug}
            onGenerate={handleGenerate}
            loading={loading}
            resetTrigger={wizardResetKey}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
});

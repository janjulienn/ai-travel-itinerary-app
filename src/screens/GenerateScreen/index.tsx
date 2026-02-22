// Generate screen - itinerary generation wizard

import React, { useCallback, useRef, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button, useTheme } from 'react-native-paper';
import { GenerateWizard } from '../../components/GenerateWizard';
import { ErrorCard } from '../../components/common/ErrorCard';
import { useCountries } from '../../hooks/useProvinces';
import { itinerariesApi } from '../../services/api/itineraries';
import { addPendingItinerary } from '../../services/pendingItineraries';
import { useApp } from '../../store/store';
import type { GenerateStackParamList } from '../../types/navigation';
import type { IItineraryCreateRequest } from '../../types/dtos/itinerary';

type NavigationProp = NativeStackNavigationProp<any>;
type RoutePropType = RouteProp<GenerateStackParamList, 'Generate'>;

export default function GenerateScreen() {
  const navigation = useNavigation<NavigationProp>();
  const theme = useTheme();
  const route = useRoute<RoutePropType>();
  const { state } = useApp();
  const initialCountrySlug = route.params?.countrySlug;
  const initialProvinceSlug = route.params?.provinceSlug;
  const { countries } = useCountries();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastRequestData, setLastRequestData] = useState<IItineraryCreateRequest | null>(null);
  const [wizardResetKey, setWizardResetKey] = useState(0);
  const [prefillCountrySlug, setPrefillCountrySlug] = useState(initialCountrySlug);
  const [prefillProvinceSlug, setPrefillProvinceSlug] = useState(initialProvinceSlug);
  const skipNextAutoClearRef = useRef(false);

  React.useEffect(() => {
    if (!initialCountrySlug && !initialProvinceSlug) {
      return;
    }

    setPrefillCountrySlug(initialCountrySlug);
    setPrefillProvinceSlug(initialProvinceSlug);
    skipNextAutoClearRef.current = true;
    navigation.setParams({ countrySlug: undefined, provinceSlug: undefined } as never);
  }, [initialCountrySlug, initialProvinceSlug, navigation]);

  useFocusEffect(
    useCallback(() => {
      setError('');

      if (skipNextAutoClearRef.current) {
        skipNextAutoClearRef.current = false;
        return;
      }

      setPrefillCountrySlug(undefined);
      setPrefillProvinceSlug(undefined);
      setWizardResetKey((prev) => prev + 1);
    }, [])
  );

  const handleGenerate = async (data: IItineraryCreateRequest) => {
    try {
      setLoading(true);
      setError('');
      setLastRequestData(data);
      
      const itinerary = await itinerariesApi.createItinerary(data);

      if (state.isGuest) {
        await addPendingItinerary(itinerary.id);
      }

      setPrefillCountrySlug(undefined);
      setPrefillProvinceSlug(undefined);
      setWizardResetKey((prev) => prev + 1);
      navigation.setParams({ countrySlug: undefined, provinceSlug: undefined } as never);

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

  const handleClearForm = () => {
    setError('');
    setLastRequestData(null);
    setPrefillCountrySlug(undefined);
    setPrefillProvinceSlug(undefined);
    skipNextAutoClearRef.current = false;
    setWizardResetKey((prev) => prev + 1);
    navigation.setParams({ countrySlug: undefined, provinceSlug: undefined } as never);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <View style={styles.headerActions}>
        <Button mode="text" icon="refresh" onPress={handleClearForm} compact>
          Clear form
        </Button>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {error ? (
          <ErrorCard
            message={error}
            onRetry={lastRequestData ? handleRetry : undefined}
            retryLabel="Try Again"
          />
        ) : (
          <GenerateWizard
            countries={countries}
            initialCountrySlug={prefillCountrySlug}
            initialProvinceSlug={prefillProvinceSlug}
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
  headerActions: {
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 4,
  },
  scrollContent: {
    flexGrow: 1,
  },
});

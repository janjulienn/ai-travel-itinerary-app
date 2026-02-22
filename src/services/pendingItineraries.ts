import AsyncStorage from '@react-native-async-storage/async-storage';

import type { IGuestPendingItinerary } from '../types/dtos/itinerary';

const PENDING_ITINERARIES_KEY = '@ai_travel_itinerary/pending_itineraries';

export const getPendingItineraries = async (): Promise<IGuestPendingItinerary[]> => {
  try {
    const value = await AsyncStorage.getItem(PENDING_ITINERARIES_KEY);
    if (!value) {
      return [];
    }

    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      (item: any): item is IGuestPendingItinerary =>
        typeof item?.id === 'string' && typeof item?.created_at === 'string'
    );
  } catch (error) {
    console.error('Error reading pending itineraries:', error);
    return [];
  }
};

export const addPendingItinerary = async (id: string): Promise<void> => {
  const current = await getPendingItineraries();
  const next = [
    { id, created_at: new Date().toISOString() },
    ...current.filter((item) => item.id !== id),
  ];

  await AsyncStorage.setItem(PENDING_ITINERARIES_KEY, JSON.stringify(next));
};

export const removePendingItinerary = async (id: string): Promise<void> => {
  const current = await getPendingItineraries();
  const next = current.filter((item) => item.id !== id);
  await AsyncStorage.setItem(PENDING_ITINERARIES_KEY, JSON.stringify(next));
};

export const clearPendingItineraries = async (): Promise<void> => {
  await AsyncStorage.removeItem(PENDING_ITINERARIES_KEY);
};

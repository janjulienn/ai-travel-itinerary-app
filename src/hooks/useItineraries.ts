// Custom hook for fetching itineraries

import { useState, useEffect, useCallback } from 'react';
import { itinerariesApi } from '../services/api/itineraries';
import type { IItineraryList, IItineraryDetail } from '../types/dtos/itinerary';
import { useApp } from '../store/store';
import {
  getPendingItineraries,
  removePendingItinerary,
} from '../services/pendingItineraries';

const mapDetailToList = (item: IItineraryDetail): IItineraryList => ({
  id: item.id,
  province_name: item.province_name,
  province_slug: item.province_slug,
  start_date: item.start_date,
  end_date: item.end_date,
  num_days: item.num_days,
  title: item.title,
  summary: item.summary,
  status: item.status,
  status_display: item.status_display,
  created_at: item.created_at,
});

export const useItineraries = () => {
  const { state } = useApp();
  const [itineraries, setItineraries] = useState<IItineraryList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchItineraries = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (state.isGuest) {
        const pending = await getPendingItineraries();

        if (pending.length === 0) {
          setItineraries([]);
          return;
        }

        const details = await Promise.all(
          pending.map(async (item) => {
            try {
              const detail = await itinerariesApi.getItinerary(item.id);
              return detail;
            } catch {
              await removePendingItinerary(item.id);
              return null;
            }
          })
        );

        const guestItineraries = details
          .filter((item): item is IItineraryDetail => item !== null)
          .map(mapDetailToList)
          .sort(
            (a, b) =>
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );

        setItineraries(guestItineraries);
        return;
      }

      const data = await itinerariesApi.getItineraries();
      setItineraries(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch itineraries');
      console.error('Error fetching itineraries:', err);
    } finally {
      setLoading(false);
    }
  }, [state.isGuest]);

  // Refetch itineraries when auth token changes (login/logout)
  useEffect(() => {
    fetchItineraries();
  }, [state.token, fetchItineraries]);

  return {
    itineraries,
    loading,
    error,
    refresh: fetchItineraries,
  };
};

export const useItineraryDetail = (id: string) => {
  const [itinerary, setItinerary] = useState<IItineraryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchItinerary = useCallback(async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);
      const data = await itinerariesApi.getItinerary(id);
      setItinerary(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch itinerary');
      console.error('Error fetching itinerary:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchItinerary();
  }, [fetchItinerary]);

  return {
    itinerary,
    loading,
    error,
    refresh: fetchItinerary,
  };
};

// Custom hook for fetching provinces

import { useState, useEffect, useCallback } from 'react';
import { provincesApi } from '../services/api/provinces';
import type { ICountry, IProvinceList, IProvinceDetail } from '../types/dtos/province';

export const useCountries = () => {
  const [countries, setCountries] = useState<ICountry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCountries = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await provincesApi.getCountries();
      setCountries(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch countries');
      console.error('Error fetching countries:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCountries();
  }, [fetchCountries]);

  return {
    countries,
    loading,
    error,
    refresh: fetchCountries,
  };
};

export const useProvinces = (countrySlug: string) => {
  const [provinces, setProvinces] = useState<IProvinceList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProvinces = useCallback(async () => {
    if (!countrySlug) {
      setProvinces([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await provincesApi.getProvinces(countrySlug);
      setProvinces(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch provinces');
      console.error('Error fetching provinces:', err);
    } finally {
      setLoading(false);
    }
  }, [countrySlug]);

  useEffect(() => {
    fetchProvinces();
  }, [fetchProvinces]);

  return {
    provinces,
    loading,
    error,
    refresh: fetchProvinces,
  };
};

export const useProvinceDetail = (countrySlug: string, slug: string) => {
  const [province, setProvince] = useState<IProvinceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProvinceDetail = useCallback(async () => {
    if (!countrySlug || !slug) return;

    try {
      setLoading(true);
      setError(null);
      const data = await provincesApi.getProvinceDetail(countrySlug, slug);
      setProvince(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch province details');
      console.error('Error fetching province details:', err);
    } finally {
      setLoading(false);
    }
  }, [countrySlug, slug]);

  useEffect(() => {
    fetchProvinceDetail();
  }, [fetchProvinceDetail]);

  return {
    province,
    loading,
    error,
    refresh: fetchProvinceDetail,
  };
};

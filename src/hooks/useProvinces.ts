// Custom hook for fetching provinces

import { useState, useEffect, useCallback } from 'react';
import { provincesApi } from '../services/api/provinces';
import type { IProvinceList, IProvinceDetail } from '../types/dtos/province';

export const useProvinces = () => {
  const [provinces, setProvinces] = useState<IProvinceList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProvinces = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await provincesApi.getProvinces();
      setProvinces(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch provinces');
      console.error('Error fetching provinces:', err);
    } finally {
      setLoading(false);
    }
  }, []);

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

export const useProvinceDetail = (slug: string) => {
  const [province, setProvince] = useState<IProvinceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProvinceDetail = useCallback(async () => {
    if (!slug) return;

    try {
      setLoading(true);
      setError(null);
      const data = await provincesApi.getProvinceDetail(slug);
      setProvince(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch province details');
      console.error('Error fetching province details:', err);
    } finally {
      setLoading(false);
    }
  }, [slug]);

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

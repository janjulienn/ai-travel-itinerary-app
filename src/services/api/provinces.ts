// Province API endpoints

import { apiClient } from './apiClient';
import type { IProvinceList, IProvinceDetail, IPlace } from '../../types/dtos/province';

export const provincesApi = {
  /**
   * Get list of all active provinces
   * GET /provinces/
   */
  getProvinces: async (): Promise<IProvinceList[]> => {
    const response = await apiClient.get<{ results: IProvinceList[] }>('/provinces/');
    return response.results || [];
  },

  /**
   * Get province detail with top places
   * GET /provinces/{slug}/
   */
  getProvinceDetail: async (slug: string): Promise<IProvinceDetail> => {
    return apiClient.get<IProvinceDetail>(`/provinces/${slug}/`);
  },

  /**
   * Get places in a province with optional filters
   * GET /provinces/{slug}/places/
   */
  getProvincePlaces: async (
    slug: string,
    params?: {
      category?: string;
      featured?: boolean;
    }
  ): Promise<IPlace[]> => {
    const response = await apiClient.get<{ results: IPlace[] }>(`/provinces/${slug}/places/`, { params });
    return response.results || [];
  },

  /**
   * Autocomplete places in a province
   * GET /provinces/{slug}/places-autocomplete/
   */
  autocompleteProvincePlaces: async (
    slug: string,
    params: {
      q: string;
      category?: string;
    }
  ): Promise<IPlace[]> => {
    return apiClient.get<IPlace[]>(`/provinces/${slug}/places-autocomplete/`, { params });
  },
};

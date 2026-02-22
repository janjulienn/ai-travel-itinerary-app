// Province API endpoints

import { apiClient } from './apiClient';
import type {
  ICountry,
  IProvinceList,
  IProvinceDetail,
  IPlace,
} from '../../types/dtos/province';

export const provincesApi = {
  /**
   * Get list of all active countries
   * GET /countries/
   */
  getCountries: async (): Promise<ICountry[]> => {
    const response = await apiClient.get<{ results: ICountry[] }>('/countries/');
    return response.results || [];
  },

  /**
   * Get list of active provinces in a country
   * GET /countries/{countrySlug}/provinces/
   */
  getProvinces: async (countrySlug: string): Promise<IProvinceList[]> => {
    const response = await apiClient.get<{ results: IProvinceList[] }>(
      `/countries/${countrySlug}/provinces/`
    );
    return response.results || [];
  },

  /**
   * Get province detail with top places
   * GET /countries/{countrySlug}/provinces/{slug}/
   */
  getProvinceDetail: async (countrySlug: string, slug: string): Promise<IProvinceDetail> => {
    return apiClient.get<IProvinceDetail>(`/countries/${countrySlug}/provinces/${slug}/`);
  },

  /**
   * Get places in a province with optional filters
   * GET /countries/{countrySlug}/provinces/{slug}/places/
   */
  getProvincePlaces: async (
    countrySlug: string,
    slug: string,
    params?: {
      category?: string;
      featured?: boolean;
    }
  ): Promise<IPlace[]> => {
    const response = await apiClient.get<{ results: IPlace[] }>(
      `/countries/${countrySlug}/provinces/${slug}/places/`,
      { params }
    );
    return response.results || [];
  },

  /**
   * Autocomplete places in a province
   * GET /countries/{countrySlug}/provinces/{slug}/places-autocomplete/
   */
  autocompleteProvincePlaces: async (
    countrySlug: string,
    slug: string,
    params: {
      q: string;
      category?: string;
    }
  ): Promise<IPlace[]> => {
    return apiClient.get<IPlace[]>(
      `/countries/${countrySlug}/provinces/${slug}/places-autocomplete/`,
      { params }
    );
  },
};

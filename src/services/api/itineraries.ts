// Itinerary API endpoints

import { apiClient } from './apiClient';
import type {
  IItineraryList,
  IItineraryDetail,
  IItineraryCreateRequest,
  IItineraryAsyncAccepted,
  IActivityAddRequest,
  IActivityReplaceRequest,
  IActivityDeleteRequest,
  IItineraryAdjustmentResponse,
} from '../../types/dtos/itinerary';

export const itinerariesApi = {
  /**
   * Create a new itinerary (AI generation)
   * POST /itineraries/
   */
  createItinerary: async (data: IItineraryCreateRequest): Promise<IItineraryAsyncAccepted> => {
    return apiClient.post<IItineraryAsyncAccepted>('/itineraries/', data);
  },

  /**
   * Get list of user's itineraries
   * GET /itineraries/
   * Returns empty array for anonymous users
   */
  getItineraries: async (): Promise<IItineraryList[]> => {
    const response = await apiClient.get<{ results: IItineraryList[] }>('/itineraries/');
    return response.results || [];
  },

  /**
   * Get single itinerary by ID
   * GET /itineraries/{id}/
   * Anyone with the UUID can access this
   */
  getItinerary: async (id: string): Promise<IItineraryDetail> => {
    return apiClient.get<IItineraryDetail>(`/itineraries/${id}/`);
  },

  /**
   * Regenerate a failed itinerary
   * POST /itineraries/{id}/regenerate/
   */
  regenerateItinerary: async (id: string): Promise<IItineraryAsyncAccepted> => {
    return apiClient.post<IItineraryAsyncAccepted>(`/itineraries/${id}/regenerate/`);
  },

  /**
   * Delete an itinerary
   * DELETE /itineraries/{id}/
   */
  deleteItinerary: async (id: string): Promise<void> => {
    await apiClient.delete<void>(`/itineraries/${id}/`);
  },

  /**
   * Add a new activity to a day
   * POST /itineraries/{id}/add-activity/
   */
  addActivity: async (id: string, data: IActivityAddRequest): Promise<IItineraryAdjustmentResponse> => {
    // No timeout - AI adjustment may take a while
    return apiClient.post<IItineraryAdjustmentResponse>(`/itineraries/${id}/add-activity/`, data, { timeout: 0 });
  },

  /**
   * Replace an existing activity
   * POST /itineraries/{id}/replace-activity/
   */
  replaceActivity: async (id: string, data: IActivityReplaceRequest): Promise<IItineraryAdjustmentResponse> => {
    // No timeout - AI adjustment may take a while
    return apiClient.post<IItineraryAdjustmentResponse>(`/itineraries/${id}/replace-activity/`, data, { timeout: 0 });
  },

  /**
   * Delete an activity
   * POST /itineraries/{id}/delete-activity/
   */
  deleteActivity: async (id: string, data: IActivityDeleteRequest): Promise<IItineraryAdjustmentResponse> => {
    // No timeout - AI adjustment may take a while
    return apiClient.post<IItineraryAdjustmentResponse>(`/itineraries/${id}/delete-activity/`, data, { timeout: 0 });
  },
};

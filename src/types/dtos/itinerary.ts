// Itinerary DTOs matching backend serializers

import { IPlace } from './province';

export type ActivityCategory = 
  | 'breakfast' 
  | 'lunch' 
  | 'dinner' 
  | 'merienda' 
  | 'food_trip' 
  | 'sightseeing' 
  | 'activity' 
  | 'nature' 
  | 'cultural' 
  | 'beach' 
  | 'travel' 
  | 'check_in' 
  | 'free_time';

export type ItineraryStatus = 'generating' | 'ready' | 'failed';

export type BudgetRange = 'budget' | 'moderate' | 'comfortable' | 'luxury';

export type Pace = 'relaxed' | 'moderate' | 'packed';

export type GroupType = 'solo' | 'couple' | 'family' | 'group';

export interface IItineraryActivity {
  id: number;
  order: number;
  category: ActivityCategory;
  category_display: string;
  title: string;
  description: string;
  time_start: string; // Format: "07:00 AM"
  time_end: string;
  duration_minutes: number;
  location_name: string;
  location_address: string | null;
  cost_estimate: string;
  notes: string | null;
  place_detail?: IPlace;
}

export interface IItineraryDay {
  id: number;
  day_number: number;
  date: string; // YYYY-MM-DD
  date_display: string; // "Sunday, March 1, 2026"
  theme: string;
  summary: string;
  activities: IItineraryActivity[];
}

export interface IItineraryPreferences {
  budget_range?: BudgetRange;
  pace?: Pace;
  interests?: string[];
  group_type?: GroupType;
  special_notes?: string;
}

export interface IItineraryList {
  id: string; // UUID
  province_name: string;
  province_slug: string;
  start_date: string; // YYYY-MM-DD
  end_date: string;
  num_days: number;
  title: string;
  summary: string;
  status: ItineraryStatus;
  status_display: string;
  created_at: string; // ISO datetime
}

export interface IItineraryDetail extends IItineraryList {
  preferences: IItineraryPreferences;
  group_size: number;
  error_message: string | null;
  days: IItineraryDay[];
}

export interface IItineraryCreateRequest {
  province: string; // Province slug
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  group_size?: number; // 1-50, default 1
  budget_range?: BudgetRange;
  pace?: Pace;
  interests?: string[];
  group_type?: GroupType;
  special_notes?: string; // max 500 chars
}

export interface IItineraryAsyncAccepted {
  id: string;
  status: 'generating';
}

export interface IGuestPendingItinerary {
  id: string;
  created_at: string;
}

export interface IActivityAddRequest {
  day_id: number;
  place_id: number;
  time_start: string; // HH:MM format
  time_end: string; // HH:MM format
  duration_minutes: number;
  insert_after_order?: number; // 0 or omit = insert at beginning
}

export interface IActivityReplaceRequest {
  activity_id: number;
  new_place_id: number;
  time_start: string; // HH:MM format
  time_end: string; // HH:MM format
  duration_minutes: number;
}

export interface IActivityDeleteRequest {
  activity_id: number;
}

export interface IItineraryAdjustmentResponse extends IItineraryDetail {
  adjustment_summary?: string;
}

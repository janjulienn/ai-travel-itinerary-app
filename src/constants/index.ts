// Application constants

import type { ActivityCategory, BudgetRange, Pace, GroupType } from '../types/dtos/itinerary';

// API Configuration
export const API_BASE_URL = 'http://192.168.68.62:8000/api/v1';
export const API_TIMEOUT = 90000; // 90 seconds (note: itinerary generation uses no timeout)

// Trip Constraints
export const MAX_TRIP_DAYS = 14;
export const MIN_GROUP_SIZE = 1;
export const MAX_GROUP_SIZE = 50;
export const MAX_SPECIAL_NOTES_LENGTH = 500;

// Activity Category Configuration
export const ACTIVITY_CATEGORIES: Record<
  ActivityCategory,
  { icon: string; label: string; color: string }
> = {
  breakfast: { icon: 'coffee', label: 'Breakfast', color: '#FF9800' },
  lunch: { icon: 'food', label: 'Lunch', color: '#FF5722' },
  dinner: { icon: 'silverware-fork-knife', label: 'Dinner', color: '#F44336' },
  merienda: { icon: 'cookie', label: 'Merienda', color: '#FFC107' },
  food_trip: { icon: 'food-variant', label: 'Food Trip', color: '#F57C00' },
  sightseeing: { icon: 'camera', label: 'Sightseeing', color: '#2196F3' },
  activity: { icon: 'run', label: 'Activity', color: '#4CAF50' },
  nature: { icon: 'tree', label: 'Nature', color: '#4CAF50' },
  cultural: { icon: 'bank', label: 'Cultural', color: '#9C27B0' },
  beach: { icon: 'beach', label: 'Beach', color: '#00BCD4' },
  travel: { icon: 'car', label: 'Travel', color: '#607D8B' },
  check_in: { icon: 'home', label: 'Check-in', color: '#795548' },
  free_time: { icon: 'clock-outline', label: 'Free Time', color: '#9E9E9E' },
};

// Budget Options
export const BUDGET_OPTIONS: Array<{
  value: BudgetRange;
  label: string;
  icon: string;
  description: string;
}> = [
  {
    value: 'budget',
    label: 'Budget',
    icon: 'currency-php',
    description: 'Affordable and economical',
  },
  {
    value: 'moderate',
    label: 'Moderate',
    icon: 'wallet',
    description: 'Good value for money',
  },
  {
    value: 'comfortable',
    label: 'Comfortable',
    icon: 'cash-multiple',
    description: 'Quality experience',
  },
  {
    value: 'luxury',
    label: 'Luxury',
    icon: 'diamond',
    description: 'Premium and exclusive',
  },
];

// Pace Options
export const PACE_OPTIONS: Array<{
  value: Pace;
  label: string;
  icon: string;
  description: string;
}> = [
  {
    value: 'relaxed',
    label: 'Relaxed',
    icon: 'sleep',
    description: 'Take it slow and enjoy',
  },
  {
    value: 'moderate',
    label: 'Moderate',
    icon: 'walk',
    description: 'Balanced mix of activities',
  },
  {
    value: 'packed',
    label: 'Packed',
    icon: 'run-fast',
    description: 'See and do everything',
  },
];

// Group Type Options
export const GROUP_TYPE_OPTIONS: Array<{
  value: GroupType;
  label: string;
  icon: string;
  description: string;
}> = [
  {
    value: 'solo',
    label: 'Solo',
    icon: 'account',
    description: 'Traveling alone',
  },
  {
    value: 'couple',
    label: 'Couple',
    icon: 'account-multiple',
    description: 'Romantic getaway',
  },
  {
    value: 'family',
    label: 'Family',
    icon: 'account-group',
    description: 'With kids and family',
  },
  {
    value: 'group',
    label: 'Group',
    icon: 'account-multiple-outline',
    description: 'Friends or larger group',
  },
];

// Interest Options
export const INTEREST_OPTIONS = [
  { value: 'beaches', label: 'Beaches', icon: 'beach' },
  { value: 'local food', label: 'Local Food', icon: 'food' },
  { value: 'nature', label: 'Nature', icon: 'tree' },
  { value: 'culture', label: 'Culture & History', icon: 'bank' },
  { value: 'adventure', label: 'Adventure', icon: 'hiking' },
  { value: 'shopping', label: 'Shopping', icon: 'shopping' },
  { value: 'nightlife', label: 'Nightlife', icon: 'glass-cocktail' },
  { value: 'photography', label: 'Photography', icon: 'camera' },
  { value: 'wellness', label: 'Wellness & Spa', icon: 'spa' },
  { value: 'diving', label: 'Diving & Snorkeling', icon: 'diving' },
];

// Status Configuration
export const STATUS_CONFIG = {
  generating: {
    label: 'Generating',
    color: '#FF9800',
    icon: 'loading',
  },
  updating: {
    label: 'Updating',
    color: '#03A9F4',
    icon: 'loading',
  },
  ready: {
    label: 'Ready',
    color: '#4CAF50',
    icon: 'check-circle',
  },
  failed: {
    label: 'Failed',
    color: '#F44336',
    icon: 'alert-circle',
  },
};

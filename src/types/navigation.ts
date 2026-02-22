// Navigation types

import { NavigatorScreenParams } from '@react-navigation/native';

export type RootTabParamList = {
  HomeTab: undefined;
  GenerateTab: NavigatorScreenParams<GenerateStackParamList>;
  TripsTab: NavigatorScreenParams<TripsStackParamList>;
  ProfileTab: undefined;
};

export type HomeStackParamList = {
  Home: undefined;
  ProvinceDetail: { slug: string };
};

export type GenerateStackParamList = {
  Generate: { provinceSlug?: string };
};

export type TripsStackParamList = {
  Trips: undefined;
  ItineraryDetail: { id: string };
};

export type ProfileStackParamList = {
  Profile: undefined;
};

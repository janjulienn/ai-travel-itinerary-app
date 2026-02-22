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
  CountryProvinces: { countrySlug: string; countryName: string };
  ProvinceDetail: { countrySlug: string; slug: string };
};

export type GenerateStackParamList = {
  Generate: { countrySlug?: string; provinceSlug?: string };
};

export type TripsStackParamList = {
  Trips:
    | {
        toastMessage?: string;
      }
    | undefined;
  ItineraryDetail: { id: string };
};

export type ProfileStackParamList = {
  Profile: undefined;
};

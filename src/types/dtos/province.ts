// Province DTOs matching backend serializers

export interface IPlaceHighlight {
  id: number;
  title: string;
  body: string;
  order: number;
}

export interface ICountry {
  id: number;
  code: string;
  name: string;
  slug: string;
  description: string;
  image_url: string;
  photos: string[];
  display_order: number;
}

export interface IPlace {
  google_place_id: string;
  name: string;
  category: 'attraction' | 'activity' | 'restaurant' | 'food_trip' | 'accommodation' | 'landmark' | 'nature' | 'beach';
  category_display: string;
  description: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  google_maps_url: string | null;
  rating: number | null;
  total_ratings: number | null;
  price_level: number | null;
  price_level_display: string;
  operating_hours: Record<string, any> | null;
  photos: string[] | null;
  tags: string[] | null;
  typical_duration_minutes: number | null;
  highlights?: IPlaceHighlight[];
}

export interface ITopPlacesCategoryGroup {
  category: IPlace['category'];
  category_display: string;
  places: IPlace[];
}

export interface IProvinceList {
  id: number;
  name: string;
  slug: string;
  region: string;
  region_display: string;
  country_code: string;
  country_name: string;
  country_slug: string;
  description: string;
  image_url: string | null;
  photos: string[];
  display_order: number;
}

export interface IProvinceDetail extends IProvinceList {
  top_places_by_category: ITopPlacesCategoryGroup[];
}

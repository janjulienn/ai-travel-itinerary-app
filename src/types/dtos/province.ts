// Province DTOs matching backend serializers

export interface IPlaceHighlight {
  id: number;
  title: string;
  body: string;
  order: number;
}

export interface IPlace {
  id: number;
  name: string;
  category: 'attraction' | 'activity' | 'restaurant' | 'food_trip' | 'accommodation' | 'landmark' | 'nature' | 'beach';
  category_display: string;
  description: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  google_place_id: string | null;
  google_maps_url: string | null;
  rating: number | null;
  total_ratings: number | null;
  price_level: number | null;
  price_level_display: string;
  operating_hours: Record<string, any> | null;
  photos: string[] | null;
  tags: string[] | null;
  typical_duration_minutes: number | null;
  highlights: IPlaceHighlight[];
}

export interface IProvinceList {
  id: number;
  name: string;
  slug: string;
  region: string;
  region_display: string;
  description: string;
  image_url: string | null;
  photos: string[];
  display_order: number;
}

export interface IProvinceDetail extends IProvinceList {
  top_places: IPlace[];
}

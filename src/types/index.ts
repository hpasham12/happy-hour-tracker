export interface Restaurant {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  is_inkind: boolean;
  created_at: string;
}

export interface HappyHour {
  id: string;
  restaurant_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  food_deals: string;
  drink_deals: string;
  daily_specials: string;
  created_at: string;
}

export interface RestaurantWithHappyHours extends Restaurant {
  happy_hours: HappyHour[];
}

export const DAYS_OF_WEEK = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

export type DayOfWeek = (typeof DAYS_OF_WEEK)[number];

import type { HappyHour, RestaurantWithHappyHours } from '../types';
import { lowestDealPrice } from './price';
import { isWithinWindow, timeToMinutes } from './time';

export interface TimeRange {
  start: string; // "HH:MM"
  end: string; // "HH:MM"
}

export interface RestaurantFilters {
  days: number[]; // selected days of week (0 = Sunday .. 6 = Saturday)
  happeningNow: boolean;
  timeRange: TimeRange | null;
  maxFoodPrice: number | null;
  maxDrinkPrice: number | null;
  inkindOnly: boolean;
}

export const emptyFilters: RestaurantFilters = {
  days: [],
  happeningNow: false,
  timeRange: null,
  maxFoodPrice: null,
  maxDrinkPrice: null,
  inkindOnly: false,
};

// Each entry is an independently-active filter dimension. Restaurants match when
// they satisfy ANY active dimension (OR semantics, per product spec).
function activePredicates(
  filters: RestaurantFilters,
  nowMinutes: number
): Array<(restaurant: RestaurantWithHappyHours) => boolean> {
  const predicates: Array<(restaurant: RestaurantWithHappyHours) => boolean> = [];

  if (filters.days.length > 0) {
    predicates.push((restaurant) =>
      restaurant.happy_hours.some((hh) => filters.days.includes(hh.day_of_week))
    );
  }

  if (filters.happeningNow) {
    const today = new Date().getDay();
    predicates.push((restaurant) =>
      restaurant.happy_hours.some(
        (hh) =>
          hh.day_of_week === today &&
          isWithinWindow(hh.start_time, hh.end_time, nowMinutes)
      )
    );
  }

  if (filters.timeRange) {
    const range = filters.timeRange;
    predicates.push((restaurant) =>
      restaurant.happy_hours.some((hh) => windowsOverlap(hh, range))
    );
  }

  if (filters.maxFoodPrice !== null) {
    const max = filters.maxFoodPrice;
    predicates.push((restaurant) =>
      restaurant.happy_hours.some((hh) => {
        const price = lowestDealPrice(hh.food_deals);
        return price !== null && price <= max;
      })
    );
  }

  if (filters.maxDrinkPrice !== null) {
    const max = filters.maxDrinkPrice;
    predicates.push((restaurant) =>
      restaurant.happy_hours.some((hh) => {
        const price = lowestDealPrice(hh.drink_deals);
        return price !== null && price <= max;
      })
    );
  }

  if (filters.inkindOnly) {
    predicates.push((restaurant) => restaurant.is_inkind);
  }

  return predicates;
}

// True if a happy-hour window overlaps the requested [start, end] range.
function windowsOverlap(happyHour: HappyHour, range: TimeRange): boolean {
  const hhStart = timeToMinutes(happyHour.start_time);
  const hhEnd = timeToMinutes(happyHour.end_time);
  const qStart = timeToMinutes(range.start);
  const qEnd = timeToMinutes(range.end);

  // Treat an end <= start happy-hour window as crossing midnight (split it).
  if (hhEnd < hhStart) {
    return overlaps(hhStart, 24 * 60, qStart, qEnd) || overlaps(0, hhEnd, qStart, qEnd);
  }

  return overlaps(hhStart, hhEnd, qStart, qEnd);
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}

export function hasActiveFilters(filters: RestaurantFilters): boolean {
  return activeFilterCount(filters) > 0;
}

export function activeFilterCount(filters: RestaurantFilters): number {
  let count = 0;
  if (filters.days.length > 0) count += 1;
  if (filters.happeningNow) count += 1;
  if (filters.timeRange) count += 1;
  if (filters.maxFoodPrice !== null) count += 1;
  if (filters.maxDrinkPrice !== null) count += 1;
  if (filters.inkindOnly) count += 1;
  return count;
}

// Returns restaurants matching ANY active filter (OR). With no active filters,
// every restaurant is returned unchanged.
export function filterRestaurants(
  restaurants: RestaurantWithHappyHours[],
  filters: RestaurantFilters,
  nowMinutes: number
): RestaurantWithHappyHours[] {
  const predicates = activePredicates(filters, nowMinutes);
  if (predicates.length === 0) return restaurants;

  return restaurants.filter((restaurant) =>
    predicates.some((predicate) => predicate(restaurant))
  );
}

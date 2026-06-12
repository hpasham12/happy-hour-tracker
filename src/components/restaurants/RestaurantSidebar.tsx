import { useMemo } from 'react';
import { Clock, List, MapPin, Navigation } from 'lucide-react';
import type { HappyHour, RestaurantWithHappyHours } from '../../types';
import { formatAddress } from '../../utils/address';
import { formatTime, isWithinWindow, timeToMinutes } from '../../utils/time';
import { formatDistanceMiles, haversineMiles, type Coordinates } from '../../utils/distance';
import type { LocationStatus } from '../../hooks/useUserLocation';
import type { RestaurantFilters } from '../../utils/filters';
import { hasActiveFilters } from '../../utils/filters';
import { FilterPanel } from '../filters/FilterPanel';

interface RestaurantSidebarProps {
  restaurants: RestaurantWithHappyHours[];
  totalCount: number;
  selectedRestaurant: RestaurantWithHappyHours | null;
  isOpen: boolean;
  onClose: () => void;
  onOpen: () => void;
  onSelectRestaurant: (restaurant: RestaurantWithHappyHours) => void;
  userCoords: Coordinates | null;
  locationStatus: LocationStatus;
  filters: RestaurantFilters;
  onUpdateFilters: (patch: Partial<RestaurantFilters>) => void;
  onToggleDay: (day: number) => void;
  onClearFilters: () => void;
}

function displayAddress(address: string) {
  return formatAddress({ display_name: address });
}

function getHappyHoursForDay(happyHours: HappyHour[], dayOfWeek: number) {
  return happyHours
    .filter((happyHour) => happyHour.day_of_week === dayOfWeek)
    .sort((a, b) => a.start_time.localeCompare(b.start_time));
}

function formatHappyHourTimes(happyHours: HappyHour[]) {
  return happyHours
    .map((happyHour) => `${formatTime(happyHour.start_time)} - ${formatTime(happyHour.end_time)}`)
    .join(', ');
}

// Earliest happy-hour start (minutes since midnight) for the given day, or Infinity if none.
function earliestStartMinutes(happyHours: HappyHour[]) {
  if (happyHours.length === 0) return Number.POSITIVE_INFINITY;
  return Math.min(...happyHours.map((hh) => timeToMinutes(hh.start_time)));
}

export function RestaurantSidebar({
  restaurants,
  totalCount,
  selectedRestaurant,
  isOpen,
  onClose,
  onOpen,
  onSelectRestaurant,
  userCoords,
  locationStatus,
  filters,
  onUpdateFilters,
  onToggleDay,
  onClearFilters,
}: RestaurantSidebarProps) {
  const today = new Date().getDay();
  const filtersActive = hasActiveFilters(filters);
  const nowMinutes = useMemo(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  }, []);

  // When the user's location is known, sort nearest-first. Otherwise fall back to
  // sorting by today's happy-hour start time (restaurants active/earliest first).
  const sortedRestaurants = useMemo(() => {
    const list = [...restaurants];

    if (userCoords) {
      return list.sort((a, b) => {
        const da = haversineMiles(userCoords, { latitude: a.latitude, longitude: a.longitude });
        const db = haversineMiles(userCoords, { latitude: b.latitude, longitude: b.longitude });
        return da - db;
      });
    }

    return list.sort(
      (a, b) =>
        earliestStartMinutes(getHappyHoursForDay(a.happy_hours, today)) -
        earliestStartMinutes(getHappyHoursForDay(b.happy_hours, today))
    );
  }, [restaurants, userCoords, today]);

  return (
    <>
      {isOpen && <div onClick={onClose} className="fixed inset-0 z-20 bg-black/40 md:hidden" />}

      <div
        className={`fixed inset-x-0 bottom-0 z-30 flex max-h-[75vh] flex-col overflow-hidden rounded-t-2xl border-gray-200 bg-white shadow-2xl transition-transform duration-300 ${
          isOpen ? 'translate-y-0' : 'translate-y-full'
        } md:static md:z-10 md:h-full md:max-h-none md:min-h-0 md:rounded-none md:border-r md:shadow-none md:transition-[width] md:translate-y-0 ${
          isOpen ? 'md:w-96' : 'md:w-0'
        }`}
      >
        <div className="flex justify-center pb-1 pt-2 md:hidden">
          <div className="h-1.5 w-10 rounded-full bg-gray-300" />
        </div>
        <div className="flex items-center justify-between border-b border-gray-200 p-4">
          <h2 className="font-semibold text-gray-800">
            {filtersActive
              ? `${restaurants.length} of ${totalCount} Restaurant${totalCount !== 1 ? 's' : ''}`
              : `${restaurants.length} Restaurant${restaurants.length !== 1 ? 's' : ''}`}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="-mr-1 p-2 text-lg leading-none text-gray-500 hover:text-gray-700 md:text-base"
          >
            x
          </button>
        </div>
        {locationStatus === 'denied' || locationStatus === 'unavailable' ? (
          <p className="border-b border-gray-100 bg-gray-50 px-4 py-2 text-xs text-gray-500">
            Enable location to sort by distance. Sorted by today's happy hour time.
          </p>
        ) : null}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="border-b border-gray-100 p-3 md:hidden">
            <FilterPanel
              filters={filters}
              onUpdate={onUpdateFilters}
              onToggleDay={onToggleDay}
              onClear={onClearFilters}
              className="border-0 shadow-none"
            />
          </div>
          {sortedRestaurants.map((restaurant) => {
            const todaysHappyHours = getHappyHoursForDay(restaurant.happy_hours, today);
            const hasHappyHourToday = todaysHappyHours.length > 0;
            const happeningNow = todaysHappyHours.some((hh) =>
              isWithinWindow(hh.start_time, hh.end_time, nowMinutes)
            );
            const distanceMiles = userCoords
              ? haversineMiles(userCoords, {
                  latitude: restaurant.latitude,
                  longitude: restaurant.longitude,
                })
              : null;

            return (
              <button
                key={restaurant.id}
                type="button"
                onClick={() => onSelectRestaurant(restaurant)}
                className={`w-full border-b border-gray-100 p-4 text-left transition-colors hover:bg-gray-50 ${
                  selectedRestaurant?.id === restaurant.id ? 'border-l-4 border-l-blue-600 bg-blue-50' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{restaurant.name}</h3>
                      {restaurant.is_inkind && (
                        <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs text-yellow-800">
                          inKind
                        </span>
                      )}
                      {happeningNow && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
                          Happening now
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-gray-600">{displayAddress(restaurant.address)}</p>
                    {distanceMiles !== null && (
                      <div className="mt-1 flex items-center gap-1.5 text-sm text-gray-500">
                        <Navigation className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
                        <span>{formatDistanceMiles(distanceMiles)}</span>
                      </div>
                    )}
                    <div
                      className={`mt-2 flex items-center gap-1.5 text-sm ${
                        hasHappyHourToday ? 'font-medium text-blue-700' : 'text-gray-500'
                      }`}
                    >
                      <Clock
                        className={`h-4 w-4 flex-shrink-0 ${
                          hasHappyHourToday ? 'text-blue-600' : 'text-gray-400'
                        }`}
                      />
                      <span className="min-w-0 truncate">
                        {hasHappyHourToday
                          ? formatHappyHourTimes(todaysHappyHours)
                          : 'No happy hour today'}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
          {restaurants.length === 0 &&
            (filtersActive ? (
              <div className="p-8 text-center text-gray-500">
                <MapPin className="mx-auto mb-3 h-12 w-12 text-gray-300" />
                <p>No restaurants match your filters.</p>
                <button
                  type="button"
                  onClick={onClearFilters}
                  className="mt-2 text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500">
                <MapPin className="mx-auto mb-3 h-12 w-12 text-gray-300" />
                <p>No restaurants yet.</p>
                <p className="mt-1 text-sm">Click on the map or the Add button to add one!</p>
              </div>
            ))}
        </div>
      </div>

      {!isOpen && (
        <button
          type="button"
          onClick={onOpen}
          className="absolute bottom-6 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-medium shadow-lg transition-colors hover:bg-gray-50 md:bottom-auto md:left-4 md:top-20 md:translate-x-0 md:rounded-lg md:px-4 md:py-2 md:shadow-md"
        >
          <List className="h-4 w-4 md:hidden" />
          <span className="md:hidden">Restaurants</span>
          <span className="hidden md:inline">Show List</span>
        </button>
      )}
    </>
  );
}

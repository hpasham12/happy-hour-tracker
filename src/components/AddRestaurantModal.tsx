import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Plus, Trash2, Search, MapPin } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { DAYS_OF_WEEK, type DealItem } from '../types';
import {
  formatAddress,
  normalizeRestaurantIdentity,
  type StructuredAddress,
} from '../utils/address';
import { cleanDeals, emptyDeal } from '../utils/deals';
import { DealRows } from './DealRows';
import { TimeSelect } from './common/TimeSelect';

interface AddRestaurantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialCoords?: { lat: number; lng: number } | null;
}

interface HappyHourInput {
  day_of_week: number;
  start_time: string;
  end_time: string;
  food_deals: DealItem[];
  drink_deals: DealItem[];
  daily_specials: string;
}

interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
  address?: StructuredAddress;
  name?: string;
  type: string;
  class?: string;
  importance?: number;
  namedetails?: {
    name?: string;
    ['name:en']?: string;
    official_name?: string;
  };
}

type DealField = 'food_deals' | 'drink_deals';

const CHICAGO_BOUNDS = {
  north: 42.03,
  south: 41.64,
  east: -87.52,
  west: -87.94,
};

const VENUE_TYPES = new Set([
  'bar',
  'biergarten',
  'cafe',
  'fast_food',
  'food_court',
  'ice_cream',
  'pub',
  'restaurant',
]);

const SEARCH_STOP_WORDS = new Set([
  'bar',
  'cafe',
  'chicago',
  'il',
  'illinois',
  'pub',
  'restaurant',
  'restaurants',
]);

interface ExistingRestaurant {
  id: string;
  name: string;
  address: string;
  is_inkind: boolean;
  happy_hours?: Array<{
    id: string;
    day_of_week: number;
  }>;
}

function getHappyHoursToInsert(
  happyHours: HappyHourInput[],
  copyFirstHappyHourDays: number[]
) {
  return happyHours.length === 1
    ? [
        happyHours[0],
        ...copyFirstHappyHourDays.map((day) => ({
          ...happyHours[0],
          day_of_week: day,
          food_deals: happyHours[0].food_deals.map((deal) => ({ ...deal })),
          drink_deals: happyHours[0].drink_deals.map((deal) => ({ ...deal })),
          daily_specials: '',
        })),
      ]
    : happyHours;
}

function findDuplicateDays(happyHours: HappyHourInput[]) {
  const seenDays = new Set<number>();
  const duplicateDays = new Set<number>();

  happyHours.forEach((happyHour) => {
    if (seenDays.has(happyHour.day_of_week)) {
      duplicateDays.add(happyHour.day_of_week);
      return;
    }

    seenDays.add(happyHour.day_of_week);
  });

  return [...duplicateDays].sort((a, b) => a - b);
}

function formatDayList(days: number[]) {
  return days.map((day) => DAYS_OF_WEEK[day]).join(', ');
}

function getSearchResultName(result: SearchResult) {
  return (
    result.namedetails?.name ??
    result.namedetails?.['name:en'] ??
    result.namedetails?.official_name ??
    result.name ??
    result.address?.amenity ??
    result.address?.shop ??
    result.address?.tourism ??
    result.display_name.split(',')[0]?.trim() ??
    ''
  );
}

function tokenizeSearchValue(value: string) {
  return normalizeRestaurantIdentity(value)
    .split(' ')
    .filter((token) => token && !SEARCH_STOP_WORDS.has(token));
}

function isInsideChicagoBounds(result: SearchResult) {
  const lat = Number(result.lat);
  const lon = Number(result.lon);

  return (
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    lat >= CHICAGO_BOUNDS.south &&
    lat <= CHICAGO_BOUNDS.north &&
    lon >= CHICAGO_BOUNDS.west &&
    lon <= CHICAGO_BOUNDS.east
  );
}

function scoreSearchResult(result: SearchResult, query: string) {
  const queryTokens = tokenizeSearchValue(query);
  const name = normalizeRestaurantIdentity(getSearchResultName(result));
  const searchableText = normalizeRestaurantIdentity(
    [getSearchResultName(result), result.display_name, formatAddress(result)].join(' ')
  );
  const matchingTokens = queryTokens.filter((token) => searchableText.includes(token)).length;
  const allTokensMatch = queryTokens.length === 0 || matchingTokens === queryTokens.length;
  const isVenueType = result.class === 'amenity' && VENUE_TYPES.has(result.type);

  let score = 0;

  if (allTokensMatch) score += 40;
  score += matchingTokens * 12;
  if (queryTokens.length > 0 && queryTokens.every((token) => name.includes(token))) score += 30;
  if (queryTokens.length > 0 && name.startsWith(queryTokens.join(' '))) score += 20;
  if (isVenueType) score += 25;
  if (isInsideChicagoBounds(result)) score += 20;
  score += Math.min((result.importance ?? 0) * 10, 10);

  return score;
}

function rankSearchResults(results: SearchResult[], query: string) {
  const uniqueResults = new Map<string, SearchResult>();

  results
    .filter(isInsideChicagoBounds)
    .forEach((result) => {
      const key = normalizeRestaurantIdentity(`${getSearchResultName(result)} ${formatAddress(result)}`);
      if (key) uniqueResults.set(key, result);
    });

  return [...uniqueResults.values()]
    .map((result) => ({ result, score: scoreSearchResult(result, query) }))
    .filter(({ score }) => score >= 20)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map(({ result }) => result);
}

export function AddRestaurantModal({ isOpen, onClose, onSuccess, initialCoords }: AddRestaurantModalProps) {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState('41.8781');
  const [longitude, setLongitude] = useState('-87.6298');
  const [isInkind, setIsInkind] = useState(false);
  const [happyHours, setHappyHours] = useState<HappyHourInput[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [copyFirstHappyHourDays, setCopyFirstHappyHourDays] = useState<number[]>([]);
  const latestSearchId = useRef(0);
  const searchAbortController = useRef<AbortController | null>(null);

  useEffect(() => {
    if (initialCoords) {
      setLatitude(initialCoords.lat.toFixed(6));
      setLongitude(initialCoords.lng.toFixed(6));
    }
  }, [initialCoords]);

  const resetForm = useCallback(() => {
    setName('');
    setAddress('');
    setLatitude('41.8781');
    setLongitude('-87.6298');
    setIsInkind(false);
    setHappyHours([]);
    setError('');
    setSearchQuery('');
    setSearchResults([]);
    setCopyFirstHappyHourDays([]);
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  const searchRestaurants = useCallback(async (query: string) => {
    const trimmedQuery = query.trim();
    const searchId = latestSearchId.current + 1;
    latestSearchId.current = searchId;
    searchAbortController.current?.abort();

    if (!trimmedQuery) {
      setSearchResults([]);
      setShowResults(false);
      setSearching(false);
      return;
    }

    const controller = new AbortController();
    searchAbortController.current = controller;
    setSearching(true);

    try {
      const searchParams = new URLSearchParams({
        format: 'json',
        q: `${trimmedQuery}, Chicago, IL`,
        limit: '10',
        addressdetails: '1',
        namedetails: '1',
        extratags: '1',
        dedupe: '1',
        countrycodes: 'us',
        bounded: '1',
        viewbox: `${CHICAGO_BOUNDS.west},${CHICAGO_BOUNDS.north},${CHICAGO_BOUNDS.east},${CHICAGO_BOUNDS.south}`,
      });
      const response = await fetch(`https://nominatim.openstreetmap.org/search?${searchParams}`, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'ChiHappyHours/1.0',
        },
      });

      if (!response.ok) {
        throw new Error(`Search failed with status ${response.status}`);
      }

      const data = (await response.json()) as SearchResult[];
      if (latestSearchId.current !== searchId) return;

      setSearchResults(rankSearchResults(data, trimmedQuery));
      setShowResults(true);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      console.error('Search error:', err);
    } finally {
      if (latestSearchId.current === searchId) {
        setSearching(false);
      }
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      searchRestaurants(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, searchRestaurants]);

  const selectSearchResult = (result: SearchResult) => {
    const restaurantName = getSearchResultName(result);
    const formattedAddress = formatAddress(result);

    setName(restaurantName);
    setAddress(formattedAddress);
    setLatitude(parseFloat(result.lat).toFixed(6));
    setLongitude(parseFloat(result.lon).toFixed(6));
    setSearchQuery('');
    setSearchResults([]);
    setShowResults(false);
  };

  const addHappyHour = () => {
    if (happyHours.length > 0) {
      setCopyFirstHappyHourDays([]);
    }

    setHappyHours([
      ...happyHours,
      {
        day_of_week: 0,
        start_time: '16:00',
        end_time: '18:00',
        food_deals: [emptyDeal()],
        drink_deals: [emptyDeal()],
        daily_specials: '',
      },
    ]);
  };

  const removeHappyHour = (index: number) => {
    setHappyHours(happyHours.filter((_, i) => i !== index));
    setCopyFirstHappyHourDays([]);
  };

  const updateHappyHour = (
    index: number,
    field: 'day_of_week' | 'start_time' | 'end_time' | 'daily_specials',
    value: string | number
  ) => {
    const updated = [...happyHours];
    updated[index] = { ...updated[index], [field]: value };
    setHappyHours(updated);

    if (index === 0 && field === 'day_of_week') {
      setCopyFirstHappyHourDays((days) => days.filter((day) => day !== value));
    }
  };

  const toggleCopyFirstHappyHourDay = (dayIndex: number) => {
    setCopyFirstHappyHourDays((days) =>
      days.includes(dayIndex)
        ? days.filter((day) => day !== dayIndex)
        : [...days, dayIndex].sort((a, b) => a - b)
    );
  };

  const addDeal = (happyHourIndex: number, field: DealField) => {
    const updated = [...happyHours];
    updated[happyHourIndex] = {
      ...updated[happyHourIndex],
      [field]: [...updated[happyHourIndex][field], emptyDeal()],
    };
    setHappyHours(updated);
  };

  const removeDeal = (happyHourIndex: number, field: DealField, dealIndex: number) => {
    const updated = [...happyHours];
    const nextDeals = updated[happyHourIndex][field].filter((_, index) => index !== dealIndex);
    updated[happyHourIndex] = {
      ...updated[happyHourIndex],
      [field]: nextDeals.length > 0 ? nextDeals : [emptyDeal()],
    };
    setHappyHours(updated);
  };

  const updateDeal = (
    happyHourIndex: number,
    field: DealField,
    dealIndex: number,
    dealField: keyof DealItem,
    value: string
  ) => {
    const updated = [...happyHours];
    const nextDeals = [...updated[happyHourIndex][field]];
    nextDeals[dealIndex] = { ...nextDeals[dealIndex], [dealField]: value };
    updated[happyHourIndex] = { ...updated[happyHourIndex], [field]: nextDeals };
    setHappyHours(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !address) {
      setError('Select a restaurant from the search results before saving.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const happyHoursToInsert = getHappyHoursToInsert(happyHours, copyFirstHappyHourDays);
      const duplicateSubmittedDays = findDuplicateDays(happyHoursToInsert);

      if (duplicateSubmittedDays.length > 0) {
        setError(`You already added ${formatDayList(duplicateSubmittedDays)} in this form.`);
        return;
      }

      const normalizedName = normalizeRestaurantIdentity(name);
      const normalizedAddress = normalizeRestaurantIdentity(address);
      const { data: existingRestaurants, error: existingRestaurantsError } = await supabase
        .from('restaurants')
        .select('id, name, address, is_inkind, happy_hours(id, day_of_week)');

      if (existingRestaurantsError) throw existingRestaurantsError;

      const existingRestaurant = (existingRestaurants as ExistingRestaurant[] | null)?.find(
        (restaurant) =>
          normalizeRestaurantIdentity(restaurant.name) === normalizedName &&
          normalizeRestaurantIdentity(restaurant.address) === normalizedAddress
      );

      let restaurantId = existingRestaurant?.id;

      if (existingRestaurant) {
        if (existingRestaurant.is_inkind !== isInkind) {
          const { error: restaurantUpdateError } = await supabase
            .from('restaurants')
            .update({ is_inkind: isInkind })
            .eq('id', existingRestaurant.id);

          if (restaurantUpdateError) throw restaurantUpdateError;
        }
      } else {
        const { data: restaurant, error: restaurantError } = await supabase
          .from('restaurants')
          .insert({
            name,
            address,
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
            is_inkind: isInkind,
          })
          .select()
          .single();

        if (restaurantError) throw restaurantError;
        restaurantId = restaurant.id;
      }

      if (!restaurantId) {
        throw new Error('Could not find or create this restaurant.');
      }

      if (existingRestaurant) {
        if (happyHoursToInsert.length === 0) {
          setError('That restaurant is already in the tracker.');
          return;
        }

        const existingDays = new Set(
          existingRestaurant.happy_hours?.map((happyHour) => happyHour.day_of_week) ?? []
        );
        const duplicateExistingDays = happyHoursToInsert
          .map((happyHour) => happyHour.day_of_week)
          .filter((day) => existingDays.has(day));

        if (duplicateExistingDays.length > 0) {
          setError(
            `That restaurant already has an entry for ${formatDayList(duplicateExistingDays)}.`
          );
          return;
        }
      }

      if (happyHoursToInsert.length > 0) {
        const { error: happyHoursError } = await supabase.from('happy_hours').insert(
          happyHoursToInsert.map((hh) => ({
            day_of_week: hh.day_of_week,
            start_time: hh.start_time,
            end_time: hh.end_time,
            food_deals: cleanDeals(hh.food_deals),
            drink_deals: cleanDeals(hh.drink_deals),
            daily_specials: hh.daily_specials,
            restaurant_id: restaurantId,
          }))
        );

        if (happyHoursError) throw happyHoursError;
      }

      resetForm();
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Enter' && e.target instanceof HTMLElement && e.target.tagName !== 'TEXTAREA') {
      e.preventDefault();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-stretch md:items-center justify-center z-50 p-0 md:p-4">
      <div className="bg-white rounded-none md:rounded-xl shadow-2xl w-full max-w-2xl h-full md:h-auto max-h-full md:max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 z-10 bg-white md:static flex items-center justify-between p-4 md:p-6 border-b border-gray-200">
          <h2 className="text-xl md:text-2xl font-bold text-gray-900">Add New Restaurant</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="p-4 md:p-6 space-y-5 md:space-y-6">
          {error && (
            <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg">{error}</div>
          )}

          <div className="space-y-4">
            {/* Restaurant Search */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search for Restaurant
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => searchResults.length > 0 && setShowResults(true)}
                  onBlur={() => setTimeout(() => setShowResults(false), 200)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Search by name or address..."
                />
                {searching && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  </div>
                )}
              </div>

              {showResults && searchResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {searchResults.map((result, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => selectSearchResult(result)}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-0 flex items-start gap-3"
                    >
                      <MapPin className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {result.display_name.split(', ')[0]}
                        </p>
                        <p className="text-sm text-gray-500 truncate">
                          {formatAddress(result)}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {name && address && (
              <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" />
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900">{name}</p>
                    <p className="text-sm text-gray-600">{address}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="inkind"
                checked={isInkind}
                onChange={(e) => setIsInkind(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <label htmlFor="inkind" className="text-sm font-medium text-gray-700">
                Available on inKind
              </label>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Happy Hours</h3>
              <button
                type="button"
                onClick={addHappyHour}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Happy Hour
              </button>
            </div>

            <div className="space-y-4">
              {happyHours.map((hh, index) => (
                <div
                  key={index}
                  className="bg-gray-50 p-4 rounded-lg space-y-3 relative"
                >
                  <button
                    type="button"
                    onClick={() => removeHappyHour(index)}
                    className="absolute top-2 right-2 p-1 hover:bg-gray-200 rounded transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Day
                      </label>
                      <select
                        value={hh.day_of_week}
                        onChange={(e) =>
                          updateHappyHour(index, 'day_of_week', parseInt(e.target.value))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        {DAYS_OF_WEEK.map((day, i) => (
                          <option key={i} value={i}>
                            {day}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Start Time
                      </label>
                      <TimeSelect
                        ariaLabel="Start time"
                        value={hh.start_time}
                        onChange={(value) => updateHappyHour(index, 'start_time', value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        End Time
                      </label>
                      <TimeSelect
                        ariaLabel="End time"
                        value={hh.end_time}
                        onChange={(value) => updateHappyHour(index, 'end_time', value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <DealRows
                    title="Food Deals"
                    deals={hh.food_deals}
                    onAdd={() => addDeal(index, 'food_deals')}
                    onRemove={(dealIndex) => removeDeal(index, 'food_deals', dealIndex)}
                    onChange={(dealIndex, field, value) =>
                      updateDeal(index, 'food_deals', dealIndex, field, value)
                    }
                    itemPlaceholder="e.g., Half-price appetizers"
                  />

                  <DealRows
                    title="Drink Deals"
                    deals={hh.drink_deals}
                    onAdd={() => addDeal(index, 'drink_deals')}
                    onRemove={(dealIndex) => removeDeal(index, 'drink_deals', dealIndex)}
                    onChange={(dealIndex, field, value) =>
                      updateDeal(index, 'drink_deals', dealIndex, field, value)
                    }
                    itemPlaceholder="e.g., Draft beer"
                  />

                  {name && address && happyHours.length === 1 && index === 0 && (
                    <div className="rounded-lg border border-gray-200 bg-white p-3">
                      <p className="mb-2 text-sm font-medium text-gray-700">Apply to Days</p>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {DAYS_OF_WEEK.map((day, dayIndex) => {
                          const isCurrentDay = dayIndex === hh.day_of_week;

                          return (
                            <label
                              key={day}
                              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                                isCurrentDay
                                  ? 'border-gray-200 bg-gray-100 text-gray-400'
                                  : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={
                                  isCurrentDay || copyFirstHappyHourDays.includes(dayIndex)
                                }
                                disabled={isCurrentDay}
                                onChange={() => toggleCopyFirstHappyHourDay(dayIndex)}
                                className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500 disabled:opacity-60"
                              />
                              <span>{day}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Daily Specials
                    </label>
                    <input
                      type="text"
                      value={hh.daily_specials}
                      onChange={(e) =>
                        updateHappyHour(index, 'daily_specials', e.target.value)
                      }
                      placeholder="e.g., Taco Tuesday specials"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              ))}

              {happyHours.length === 0 && (
                <p className="text-gray-500 text-center py-4">
                  No happy hours added yet. Click "Add Happy Hour" to add one.
                </p>
              )}
            </div>
          </div>

          <div className="sticky bottom-0 z-10 -mx-4 px-4 md:mx-0 md:px-0 bg-white md:static flex gap-3 border-t border-gray-200 py-4 md:py-0 md:pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name || !address}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Adding...' : 'Add Restaurant'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

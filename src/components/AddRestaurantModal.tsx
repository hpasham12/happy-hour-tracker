import { useState, useEffect, useCallback } from 'react';
import { X, Plus, Trash2, Search, MapPin } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { DAYS_OF_WEEK, type DealItem } from '../types';
import { formatAddress, type StructuredAddress } from '../utils/address';

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
}

type DealField = 'food_deals' | 'drink_deals';

const emptyDeal = (): DealItem => ({ name: '', price: '' });

function cleanDeals(deals: DealItem[]) {
  return deals
    .map((deal) => ({
      name: deal.name.trim(),
      price: deal.price?.trim() ?? '',
    }))
    .filter((deal) => deal.name);
}

function DealRows({
  title,
  deals,
  onAdd,
  onRemove,
  onChange,
  itemPlaceholder,
}: {
  title: string;
  deals: DealItem[];
  onAdd: () => void;
  onRemove: (dealIndex: number) => void;
  onChange: (dealIndex: number, field: keyof DealItem, value: string) => void;
  itemPlaceholder: string;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <label className="block text-sm font-medium text-gray-700">{title}</label>
        <button
          type="button"
          onClick={onAdd}
          className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800"
        >
          <Plus className="h-4 w-4" />
          Add Item
        </button>
      </div>

      <div className="space-y-2">
        {deals.map((deal, dealIndex) => (
          <div key={dealIndex} className="grid grid-cols-[minmax(0,1fr)_7rem_2rem] gap-2">
            <input
              type="text"
              value={deal.name}
              onChange={(e) => onChange(dealIndex, 'name', e.target.value)}
              placeholder={itemPlaceholder}
              className="w-full min-w-0 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              value={deal.price ?? ''}
              onChange={(e) => onChange(dealIndex, 'price', e.target.value)}
              placeholder="$"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={() => onRemove(dealIndex)}
              className="flex h-10 w-8 items-center justify-center rounded-lg text-red-500 transition-colors hover:bg-gray-200"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
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
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query + ' restaurant chicago'
        )}&limit=5&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'ChiHappyHours/1.0',
          },
        }
      );
      const data = await response.json();
      setSearchResults(data);
      setShowResults(true);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        searchRestaurants(searchQuery);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, searchRestaurants]);

  const selectSearchResult = (result: SearchResult) => {
    const parts = result.display_name.split(', ');
    const restaurantName = parts[0];
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

      const happyHoursToInsert =
        happyHours.length === 1
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

      if (happyHoursToInsert.length > 0) {
        const { error: happyHoursError } = await supabase.from('happy_hours').insert(
          happyHoursToInsert.map((hh) => ({
            day_of_week: hh.day_of_week,
            start_time: hh.start_time,
            end_time: hh.end_time,
            food_deals: cleanDeals(hh.food_deals),
            drink_deals: cleanDeals(hh.drink_deals),
            daily_specials: hh.daily_specials,
            restaurant_id: restaurant.id,
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Add New Restaurant</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="p-6 space-y-6">
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

                  <div className="grid grid-cols-3 gap-3">
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
                      <input
                        type="time"
                        value={hh.start_time}
                        onChange={(e) =>
                          updateHappyHour(index, 'start_time', e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        End Time
                      </label>
                      <input
                        type="time"
                        value={hh.end_time}
                        onChange={(e) =>
                          updateHappyHour(index, 'end_time', e.target.value)
                        }
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

          <div className="flex gap-3 pt-4 border-t border-gray-200">
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

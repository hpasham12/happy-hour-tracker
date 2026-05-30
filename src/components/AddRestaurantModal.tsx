import { useState, useEffect, useCallback } from 'react';
import { X, Plus, Trash2, Search, MapPin } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { DAYS_OF_WEEK } from '../types';

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
  food_deals: string;
  drink_deals: string;
  daily_specials: string;
}

interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
  name?: string;
  type: string;
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
    const fullAddress = result.display_name;

    setName(restaurantName);
    setAddress(fullAddress);
    setLatitude(parseFloat(result.lat).toFixed(6));
    setLongitude(parseFloat(result.lon).toFixed(6));
    setSearchQuery('');
    setSearchResults([]);
    setShowResults(false);
  };

  const addHappyHour = () => {
    setHappyHours([
      ...happyHours,
      {
        day_of_week: 0,
        start_time: '16:00',
        end_time: '18:00',
        food_deals: '',
        drink_deals: '',
        daily_specials: '',
      },
    ]);
  };

  const removeHappyHour = (index: number) => {
    setHappyHours(happyHours.filter((_, i) => i !== index));
  };

  const updateHappyHour = (index: number, field: keyof HappyHourInput, value: string | number) => {
    const updated = [...happyHours];
    updated[index] = { ...updated[index], [field]: value };
    setHappyHours(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

      if (happyHours.length > 0) {
        const { error: happyHoursError } = await supabase.from('happy_hours').insert(
          happyHours.map((hh) => ({
            ...hh,
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

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
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
                          {result.display_name}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="text-center text-sm text-gray-500">-- or enter manually --</div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Restaurant Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., The Empty Bottle"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address *
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., 1035 N Western Ave, Chicago, IL"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Latitude *
                </label>
                <input
                  type="text"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Longitude *
                </label>
                <input
                  type="text"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

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

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Food Deals
                    </label>
                    <input
                      type="text"
                      value={hh.food_deals}
                      onChange={(e) =>
                        updateHappyHour(index, 'food_deals', e.target.value)
                      }
                      placeholder="e.g., Half-price appetizers"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Drink Deals
                    </label>
                    <input
                      type="text"
                      value={hh.drink_deals}
                      onChange={(e) =>
                        updateHappyHour(index, 'drink_deals', e.target.value)
                      }
                      placeholder="e.g., $5 drafts, $7 cocktails"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

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
              disabled={loading}
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

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { DAYS_OF_WEEK, type DealItem, type HappyHour } from '../types';
import { DealRows } from './DealRows';
import { cleanDeals, emptyDeal, normalizeDealsForForm } from '../utils/deals';

interface EditHappyHourModalProps {
  happyHour: HappyHour | null;
  onClose: () => void;
  onSuccess: () => void | Promise<void>;
}

type DealField = 'food_deals' | 'drink_deals';

export function EditHappyHourModal({ happyHour, onClose, onSuccess }: EditHappyHourModalProps) {
  const [dayOfWeek, setDayOfWeek] = useState(0);
  const [startTime, setStartTime] = useState('16:00');
  const [endTime, setEndTime] = useState('18:00');
  const [foodDeals, setFoodDeals] = useState<DealItem[]>([emptyDeal()]);
  const [drinkDeals, setDrinkDeals] = useState<DealItem[]>([emptyDeal()]);
  const [dailySpecials, setDailySpecials] = useState('');
  const [applyToDays, setApplyToDays] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!happyHour) return;

    setDayOfWeek(happyHour.day_of_week);
    setStartTime(happyHour.start_time.slice(0, 5));
    setEndTime(happyHour.end_time.slice(0, 5));
    setFoodDeals(normalizeDealsForForm(happyHour.food_deals));
    setDrinkDeals(normalizeDealsForForm(happyHour.drink_deals));
    setDailySpecials(happyHour.daily_specials ?? '');
    setApplyToDays([]);
    setError('');
  }, [happyHour]);

  const toggleApplyToDay = (dayIndex: number) => {
    setApplyToDays((days) =>
      days.includes(dayIndex)
        ? days.filter((day) => day !== dayIndex)
        : [...days, dayIndex].sort((a, b) => a - b)
    );
  };

  const addDeal = (field: DealField) => {
    if (field === 'food_deals') {
      setFoodDeals((deals) => [...deals, emptyDeal()]);
      return;
    }

    setDrinkDeals((deals) => [...deals, emptyDeal()]);
  };

  const removeDeal = (field: DealField, dealIndex: number) => {
    const removeAtIndex = (deals: DealItem[]) => {
      const nextDeals = deals.filter((_, index) => index !== dealIndex);
      return nextDeals.length > 0 ? nextDeals : [emptyDeal()];
    };

    if (field === 'food_deals') {
      setFoodDeals(removeAtIndex);
      return;
    }

    setDrinkDeals(removeAtIndex);
  };

  const updateDeal = (
    field: DealField,
    dealIndex: number,
    dealField: keyof DealItem,
    value: string
  ) => {
    const updateAtIndex = (deals: DealItem[]) =>
      deals.map((deal, index) =>
        index === dealIndex ? { ...deal, [dealField]: value } : deal
      );

    if (field === 'food_deals') {
      setFoodDeals(updateAtIndex);
      return;
    }

    setDrinkDeals(updateAtIndex);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Enter' && e.target instanceof HTMLElement && e.target.tagName !== 'TEXTAREA') {
      e.preventDefault();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!happyHour) return;

    setLoading(true);
    setError('');

    try {
      const cleanedFoodDeals = cleanDeals(foodDeals);
      const cleanedDrinkDeals = cleanDeals(drinkDeals);
      const trimmedDailySpecials = dailySpecials.trim();
      const happyHourChanges = {
        start_time: startTime,
        end_time: endTime,
        food_deals: cleanedFoodDeals,
        drink_deals: cleanedDrinkDeals,
        daily_specials: trimmedDailySpecials,
      };

      const { error: happyHourError } = await supabase
        .from('happy_hours')
        .update({
          day_of_week: dayOfWeek,
          ...happyHourChanges,
        })
        .eq('id', happyHour.id)
        .select('id')
        .single();

      if (happyHourError) throw happyHourError;

      if (applyToDays.length > 0) {
        const { data: existingHappyHours, error: existingHappyHoursError } = await supabase
          .from('happy_hours')
          .select('id, day_of_week')
          .eq('restaurant_id', happyHour.restaurant_id)
          .in('day_of_week', applyToDays);

        if (existingHappyHoursError) throw existingHappyHoursError;

        const existingHappyHourIds = existingHappyHours?.map((existing) => existing.id) ?? [];

        if (existingHappyHourIds.length > 0) {
          const { data: updatedHappyHours, error: updatedHappyHoursError } = await supabase
            .from('happy_hours')
            .update(happyHourChanges)
            .in('id', existingHappyHourIds)
            .select('id');

          if (updatedHappyHoursError) throw updatedHappyHoursError;

          if (updatedHappyHours.length !== existingHappyHourIds.length) {
            throw new Error('Some selected days could not be updated. Check database write permissions.');
          }
        }

        const existingDays = new Set(existingHappyHours?.map((existing) => existing.day_of_week));
        const daysToInsert = applyToDays.filter((day) => !existingDays.has(day));

        const { error: copiedHappyHoursError } =
          daysToInsert.length > 0
            ? await supabase.from('happy_hours').insert(
                daysToInsert.map((day) => ({
                  day_of_week: day,
                  ...happyHourChanges,
                  food_deals: cleanedFoodDeals.map((deal) => ({ ...deal })),
                  drink_deals: cleanedDrinkDeals.map((deal) => ({ ...deal })),
                  restaurant_id: happyHour.restaurant_id,
                }))
              )
            : { error: null };

        if (copiedHappyHoursError) throw copiedHappyHoursError;
      }

      await onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (!happyHour) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-black bg-opacity-50 p-0 md:items-center md:p-4">
      <div className="h-full max-h-full w-full max-w-2xl overflow-y-auto rounded-none bg-white shadow-2xl md:h-auto md:max-h-[90vh] md:rounded-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white p-4 md:static md:p-6">
          <h2 className="text-xl md:text-2xl font-bold text-gray-900">Edit Happy Hour</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 transition-colors hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="space-y-5 p-4 md:space-y-6 md:p-6">
          {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-red-700">{error}</div>}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Day</label>
              <select
                value={dayOfWeek}
                onChange={(e) => setDayOfWeek(parseInt(e.target.value))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500"
              >
                {DAYS_OF_WEEK.map((day, index) => (
                  <option key={day} value={index}>
                    {day}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Start Time</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">End Time</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <DealRows
            title="Food Deals"
            deals={foodDeals}
            onAdd={() => addDeal('food_deals')}
            onRemove={(dealIndex) => removeDeal('food_deals', dealIndex)}
            onChange={(dealIndex, field, value) =>
              updateDeal('food_deals', dealIndex, field, value)
            }
            itemPlaceholder="e.g., Half-price appetizers"
          />

          <DealRows
            title="Drink Deals"
            deals={drinkDeals}
            onAdd={() => addDeal('drink_deals')}
            onRemove={(dealIndex) => removeDeal('drink_deals', dealIndex)}
            onChange={(dealIndex, field, value) =>
              updateDeal('drink_deals', dealIndex, field, value)
            }
            itemPlaceholder="e.g., Draft beer"
          />

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Daily Specials</label>
            <input
              type="text"
              value={dailySpecials}
              onChange={(e) => setDailySpecials(e.target.value)}
              placeholder="e.g., Taco Tuesday specials"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <p className="mb-2 text-sm font-medium text-gray-700">Apply to Days</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {DAYS_OF_WEEK.map((day, dayIndex) => {
                const isCurrentDay = dayIndex === dayOfWeek;

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
                      checked={isCurrentDay || applyToDays.includes(dayIndex)}
                      disabled={isCurrentDay}
                      onChange={() => toggleApplyToDay(dayIndex)}
                      className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500 disabled:opacity-60"
                    />
                    <span>{day}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="sticky bottom-0 z-10 -mx-4 flex gap-3 border-t border-gray-200 bg-white px-4 py-4 md:static md:mx-0 md:px-0 md:py-0 md:pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

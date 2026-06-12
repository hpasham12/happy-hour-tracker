import { useState } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { activeFilterCount, type RestaurantFilters } from '../../utils/filters';

const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

interface FilterPanelProps {
  filters: RestaurantFilters;
  onUpdate: (patch: Partial<RestaurantFilters>) => void;
  onToggleDay: (day: number) => void;
  onClear: () => void;
  className?: string;
}

export function FilterPanel({
  filters,
  onUpdate,
  onToggleDay,
  onClear,
  className = '',
}: FilterPanelProps) {
  const [open, setOpen] = useState(false);
  const count = activeFilterCount(filters);

  const parsePriceInput = (value: string): number | null => {
    if (value.trim() === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  return (
    <div className={`rounded-xl border border-gray-200 bg-white shadow-md ${className}`}>
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="flex items-center gap-2 text-sm font-medium text-gray-800"
        >
          <SlidersHorizontal className="h-4 w-4 text-gray-600" />
          Filters
          {count > 0 && (
            <span className="rounded-full bg-blue-600 px-1.5 py-0.5 text-xs font-semibold text-white">
              {count}
            </span>
          )}
        </button>
        {count > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
          >
            <X className="h-3 w-3" />
            Clear
          </button>
        )}
      </div>

      {open && (
        <div className="max-h-[60vh] space-y-4 overflow-y-auto border-t border-gray-100 px-3 py-3">
          <section>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">Day</p>
            <div className="flex flex-wrap gap-1.5">
              {DAY_LABELS.map((label, day) => {
                const selected = filters.days.includes(day);
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => onToggleDay(day)}
                    className={`h-8 w-8 rounded-full text-xs font-medium transition-colors ${
                      selected
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </section>

          <section>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">Time</p>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={filters.happeningNow}
                onChange={(event) => onUpdate({ happeningNow: event.target.checked })}
                className="h-4 w-4 rounded border-gray-300"
              />
              Happening now
            </label>
            <div className="mt-2 flex items-center gap-2">
              <input
                type="time"
                value={filters.timeRange?.start ?? ''}
                onChange={(event) =>
                  onUpdate({
                    timeRange: event.target.value
                      ? { start: event.target.value, end: filters.timeRange?.end ?? '23:59' }
                      : filters.timeRange?.end
                        ? { start: '00:00', end: filters.timeRange.end }
                        : null,
                  })
                }
                className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
              />
              <span className="text-xs text-gray-400">to</span>
              <input
                type="time"
                value={filters.timeRange?.end ?? ''}
                onChange={(event) =>
                  onUpdate({
                    timeRange: event.target.value
                      ? { start: filters.timeRange?.start ?? '00:00', end: event.target.value }
                      : filters.timeRange?.start
                        ? { start: filters.timeRange.start, end: '23:59' }
                        : null,
                  })
                }
                className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
              />
            </div>
          </section>

          <section>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Max price
            </p>
            <div className="space-y-2">
              <label className="flex items-center justify-between gap-2 text-sm text-gray-700">
                <span>Food</span>
                <div className="flex items-center gap-1">
                  <span className="text-gray-400">$</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="any"
                    value={filters.maxFoodPrice ?? ''}
                    onChange={(event) =>
                      onUpdate({ maxFoodPrice: parsePriceInput(event.target.value) })
                    }
                    className="w-20 rounded-md border border-gray-300 px-2 py-1 text-sm"
                  />
                </div>
              </label>
              <label className="flex items-center justify-between gap-2 text-sm text-gray-700">
                <span>Drinks</span>
                <div className="flex items-center gap-1">
                  <span className="text-gray-400">$</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="any"
                    value={filters.maxDrinkPrice ?? ''}
                    onChange={(event) =>
                      onUpdate({ maxDrinkPrice: parsePriceInput(event.target.value) })
                    }
                    className="w-20 rounded-md border border-gray-300 px-2 py-1 text-sm"
                  />
                </div>
              </label>
            </div>
          </section>

          <section>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={filters.inkindOnly}
                onChange={(event) => onUpdate({ inkindOnly: event.target.checked })}
                className="h-4 w-4 rounded border-gray-300"
              />
              inKind only
            </label>
          </section>

          {count > 1 && (
            <p className="rounded-md bg-gray-50 px-2 py-1.5 text-xs text-gray-500">
              Showing restaurants matching any selected filter.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

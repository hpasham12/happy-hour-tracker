import { useCallback, useState } from 'react';
import { emptyFilters, type RestaurantFilters } from '../utils/filters';

export function useRestaurantFilters() {
  const [filters, setFilters] = useState<RestaurantFilters>(emptyFilters);

  const updateFilters = useCallback((patch: Partial<RestaurantFilters>) => {
    setFilters((current) => ({ ...current, ...patch }));
  }, []);

  const toggleDay = useCallback((day: number) => {
    setFilters((current) => ({
      ...current,
      days: current.days.includes(day)
        ? current.days.filter((d) => d !== day)
        : [...current.days, day],
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(emptyFilters);
  }, []);

  return { filters, updateFilters, toggleDay, clearFilters };
}

import { useEffect, useState } from 'react';
import { DAYS_OF_WEEK, type HappyHour } from '../../types';
import { HappyHourCard } from './HappyHourCard';

interface HappyHoursForSelectedDayProps {
  happyHours: HappyHour[];
  onEdit: (happyHour: HappyHour) => void;
  compact?: boolean;
}

export function HappyHoursForSelectedDay({
  happyHours,
  onEdit,
  compact = false,
}: HappyHoursForSelectedDayProps) {
  const availableDays = Array.from(new Set(happyHours.map((happyHour) => happyHour.day_of_week))).sort(
    (a, b) => a - b
  );
  const defaultDay = availableDays.includes(1) ? 1 : availableDays[0];
  const [selectedDay, setSelectedDay] = useState(defaultDay);

  useEffect(() => {
    setSelectedDay(defaultDay);
  }, [defaultDay]);

  const filteredHappyHours = happyHours.filter((happyHour) => happyHour.day_of_week === selectedDay);

  if (happyHours.length === 0) {
    return <p className="text-sm text-gray-500">No happy hour info added yet.</p>;
  }

  return (
    <div>
      <h4 className={`font-semibold text-gray-800 ${compact ? 'mb-2 text-sm' : 'mb-2'}`}>
        Happy Hours
      </h4>
      <div className="mb-2 flex flex-wrap gap-1">
        {availableDays.map((day) => {
          const isSelected = day === selectedDay;

          return (
            <button
              key={day}
              type="button"
              onClick={() => setSelectedDay(day)}
              className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                isSelected
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {DAYS_OF_WEEK[day].slice(0, 3)}
            </button>
          );
        })}
      </div>
      {filteredHappyHours.map((happyHour) => (
        <HappyHourCard
          key={happyHour.id}
          happyHour={happyHour}
          onEdit={() => onEdit(happyHour)}
        />
      ))}
    </div>
  );
}

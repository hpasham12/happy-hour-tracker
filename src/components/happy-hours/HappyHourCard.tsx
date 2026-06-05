import { Clock, Pencil, Star, Utensils, Wine } from 'lucide-react';
import type { HappyHour } from '../../types';
import { formatTime } from '../../utils/time';
import { DealList } from './DealList';

interface HappyHourCardProps {
  happyHour: HappyHour;
  onEdit?: () => void;
}

export function HappyHourCard({ happyHour, onEdit }: HappyHourCardProps) {
  return (
    <div className="mt-2 rounded-lg bg-gray-50 p-3">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
          <Clock className="h-4 w-4 text-blue-600" />
          {formatTime(happyHour.start_time)} - {formatTime(happyHour.end_time)}
        </div>
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-800"
            title="Edit happy hour"
          >
            <Pencil className="h-4 w-4" />
          </button>
        )}
      </div>
      <DealList deals={happyHour.drink_deals} icon={Wine} iconClassName="text-red-500" />
      <DealList deals={happyHour.food_deals} icon={Utensils} iconClassName="text-orange-500" />
      {happyHour.daily_specials && (
        <div className="mt-1 flex items-start gap-2 text-sm text-gray-700">
          <Star className="mt-0.5 h-4 w-4 flex-shrink-0 text-yellow-500" />
          <span>{happyHour.daily_specials}</span>
        </div>
      )}
    </div>
  );
}

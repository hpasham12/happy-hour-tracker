import { ExternalLink } from 'lucide-react';
import type { HappyHour, RestaurantWithHappyHours } from '../../types';
import { formatAddress } from '../../utils/address';
import { HappyHoursForSelectedDay } from '../happy-hours/HappyHoursForSelectedDay';

interface RestaurantPopupProps {
  restaurant: RestaurantWithHappyHours;
  onEditHappyHour: (happyHour: HappyHour) => void;
}

function displayAddress(address: string) {
  return formatAddress({ display_name: address });
}

export function RestaurantPopup({ restaurant, onEditHappyHour }: RestaurantPopupProps) {
  return (
    <div className="p-1">
      <div className="flex items-start justify-between">
        <h3 className="text-lg font-bold text-gray-900">{restaurant.name}</h3>
        {restaurant.is_inkind && (
          <span className="ml-2 rounded-full bg-yellow-100 px-2 py-0.5 text-xs text-yellow-800">
            inKind
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-gray-600">{displayAddress(restaurant.address)}</p>

      <div className="mt-3">
        <HappyHoursForSelectedDay
          happyHours={restaurant.happy_hours}
          onEdit={onEditHappyHour}
          compact
        />
      </div>

      <a
        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          restaurant.address
        )}`}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
      >
        <ExternalLink className="h-3 w-3" />
        View on Google Maps
      </a>
    </div>
  );
}

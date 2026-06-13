import type { Marker as LeafletMarker } from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import type { HappyHour, RestaurantWithHappyHours } from '../../types';
import type { RestaurantFilters } from '../../utils/filters';
import { FilterPanel } from '../filters/FilterPanel';
import {
  defaultRestaurantIcon,
  inkindRestaurantIcon,
  selectedRestaurantIcon,
} from './icons';
import { MapClickHandler } from './MapClickHandler';
import { RestaurantPopup } from './RestaurantPopup';
import { SelectedRestaurantController } from './SelectedRestaurantController';

interface RestaurantMapProps {
  restaurants: RestaurantWithHappyHours[];
  selectedRestaurant: RestaurantWithHappyHours | null;
  markerRefs: React.MutableRefObject<Record<string, LeafletMarker | null>>;
  isMobileViewport: boolean;
  onMapClick: (lat: number, lng: number) => void;
  onSelectRestaurant: (restaurant: RestaurantWithHappyHours) => void;
  onEditHappyHour: (happyHour: HappyHour) => void;
  filters: RestaurantFilters;
  onUpdateFilters: (patch: Partial<RestaurantFilters>) => void;
  onToggleDay: (day: number) => void;
  onClearFilters: () => void;
}

export function RestaurantMap({
  restaurants,
  selectedRestaurant,
  markerRefs,
  isMobileViewport,
  onMapClick,
  onSelectRestaurant,
  onEditHappyHour,
  filters,
  onUpdateFilters,
  onToggleDay,
  onClearFilters,
}: RestaurantMapProps) {
  return (
    <div className="relative z-0 flex-1">
      <FilterPanel
        filters={filters}
        onUpdate={onUpdateFilters}
        onToggleDay={onToggleDay}
        onClear={onClearFilters}
        className="absolute left-3 top-3 z-[1000] hidden w-64 md:block"
      />
      <MapContainer
        center={[41.8781, -87.6298]}
        zoom={11}
        className="h-full w-full"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapClickHandler onMapClick={onMapClick} />
        <SelectedRestaurantController
          selectedRestaurant={selectedRestaurant}
          markerRefs={markerRefs}
        />

        {restaurants.map((restaurant) => {
          const isSelected = selectedRestaurant?.id === restaurant.id;

          return (
            <Marker
              key={restaurant.id}
              ref={(ref) => {
                markerRefs.current[restaurant.id] = ref;
              }}
              position={[restaurant.latitude, restaurant.longitude]}
              icon={
                isSelected
                  ? selectedRestaurantIcon
                  : restaurant.is_inkind
                    ? inkindRestaurantIcon
                    : defaultRestaurantIcon
              }
              zIndexOffset={isSelected ? 1000 : 0}
              eventHandlers={{
                click: () => onSelectRestaurant(restaurant),
              }}
            >
              <Popup
                maxWidth={400}
                offset={isMobileViewport ? [0, -12] : [0, 0]}
                keepInView
                autoPanPaddingTopLeft={[20, 20]}
                autoPanPaddingBottomRight={[20, 20]}
              >
                <RestaurantPopup restaurant={restaurant} onEditHappyHour={onEditHappyHour} />
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}

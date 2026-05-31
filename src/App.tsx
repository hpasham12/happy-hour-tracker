import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import { Icon } from 'leaflet';
import type { Marker as LeafletMarker } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Plus, MapPin, Clock, Utensils, Wine, Star, ExternalLink, Pencil, List } from 'lucide-react';
import { supabase } from './lib/supabase';
import { AddRestaurantModal } from './components/AddRestaurantModal';
import { EditHappyHourModal } from './components/EditHappyHourModal';
import type { DealItem, DealListValue, RestaurantWithHappyHours, HappyHour } from './types';
import { DAYS_OF_WEEK } from './types';
import { formatAddress } from './utils/address';

const customIcon = new Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  shadowSize: [41, 41],
});

const inkindIcon = new Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  shadowSize: [41, 41],
});

// Larger green marker used to highlight the currently selected restaurant's pin.
const selectedIcon = new Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  iconSize: [33, 54],
  iconAnchor: [16, 54],
  popupAnchor: [1, -46],
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  shadowSize: [54, 54],
});

function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Pans the map to the selected restaurant and opens its marker popup.
function SelectedRestaurantController({
  selectedRestaurant,
  markerRefs,
}: {
  selectedRestaurant: RestaurantWithHappyHours | null;
  markerRefs: React.MutableRefObject<Record<string, LeafletMarker | null>>;
}) {
  const map = useMap();

  useEffect(() => {
    if (!selectedRestaurant) return;
    const marker = markerRefs.current[selectedRestaurant.id];
    const targetZoom = Math.max(map.getZoom(), 14);
  
    map.once('moveend', () => marker?.openPopup());
    map.flyTo(
      [selectedRestaurant.latitude, selectedRestaurant.longitude],
      targetZoom,
      { duration: 0.6 }
    );
  }, [selectedRestaurant, map, markerRefs]);

  return null;
}

function formatTime(time: string): string {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
}

function displayAddress(address: string) {
  return formatAddress({ display_name: address });
}

function normalizeDealItems(deals: DealListValue): DealItem[] {
  if (!deals) return [];

  if (typeof deals === 'string') {
    const trimmed = deals.trim();
    return trimmed ? [{ name: trimmed }] : [];
  }

  return deals.filter((deal) => deal.name.trim());
}

function DealList({
  deals,
  icon: IconComponent,
  iconClassName,
}: {
  deals: DealListValue;
  icon: typeof Wine;
  iconClassName: string;
}) {
  const items = normalizeDealItems(deals);

  if (items.length === 0) return null;

  return (
    <div className="flex items-start gap-2 text-sm text-gray-700 mt-1">
      <IconComponent className={`w-4 h-4 flex-shrink-0 mt-0.5 ${iconClassName}`} />
      <ul className="min-w-0 flex-1 space-y-1">
        {items.map((deal, index) => (
          <li key={`${deal.name}-${index}`} className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 flex-1 break-words">{deal.name}</span>
            {deal.price && (
              <span className="flex-shrink-0 font-medium text-gray-900">{deal.price}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function HappyHourCard({ happyHour, onEdit }: { happyHour: HappyHour; onEdit?: () => void }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3 mt-2">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
          <Clock className="w-4 h-4 text-blue-600" />
          {formatTime(happyHour.start_time)} -{' '}
          {formatTime(happyHour.end_time)}
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
        <div className="flex items-start gap-2 text-sm text-gray-700 mt-1">
          <Star className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
          <span>{happyHour.daily_specials}</span>
        </div>
      )}
    </div>
  );
}

function HappyHoursForSelectedDay({
  happyHours,
  onEdit,
  compact = false,
}: {
  happyHours: HappyHour[];
  onEdit: (happyHour: HappyHour) => void;
  compact?: boolean;
}) {
  const availableDays = Array.from(new Set(happyHours.map((hh) => hh.day_of_week))).sort(
    (a, b) => a - b
  );
  const defaultDay = availableDays.includes(1) ? 1 : availableDays[0];
  const [selectedDay, setSelectedDay] = useState(defaultDay);

  useEffect(() => {
    setSelectedDay(defaultDay);
  }, [defaultDay]);

  const filteredHappyHours = happyHours.filter((hh) => hh.day_of_week === selectedDay);

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
      {filteredHappyHours.map((hh) => (
        <HappyHourCard key={hh.id} happyHour={hh} onEdit={() => onEdit(hh)} />
      ))}
    </div>
  );
}

function App() {
  const [restaurants, setRestaurants] = useState<RestaurantWithHappyHours[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mapClickCoords, setMapClickCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedRestaurant, setSelectedRestaurant] = useState<RestaurantWithHappyHours | null>(null);
  const [editingHappyHour, setEditingHappyHour] = useState<HappyHour | null>(null);
  const [isMobileViewport, setIsMobileViewport] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < 768
  );
  const [sidebarOpen, setSidebarOpen] = useState(
    () => (typeof window === 'undefined' ? true : window.innerWidth >= 768)
  );
  const markerRefs = useRef<Record<string, LeafletMarker | null>>({});

  useEffect(() => {
    fetchRestaurants();
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setIsMobileViewport(window.innerWidth < 768);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  async function fetchRestaurants() {
    const { data: restaurantsData, error } = await supabase
      .from('restaurants')
      .select(
        `
        *,
        happy_hours (*)
      `
      )
      .order('created_at', { ascending: false });

    if (!error && restaurantsData) {
      const nextRestaurants = restaurantsData as RestaurantWithHappyHours[];
      setRestaurants(nextRestaurants);
      setSelectedRestaurant((currentRestaurant) =>
        currentRestaurant
          ? nextRestaurants.find((restaurant) => restaurant.id === currentRestaurant.id) ?? null
          : null
      );
    }
  }

  const handleMapClick = (lat: number, lng: number) => {
    setMapClickCoords({ lat, lng });
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setMapClickCoords(null);
  };

  return (
    <div className="flex h-dvh w-screen flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 px-4 py-3 md:px-6 md:py-4 z-10">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 truncate">Happy Hours</h1>
            <p className="text-xs md:text-sm text-gray-500 truncate">Track the best happy hour deals</p>
          </div>
          <button
            onClick={() => {
              setMapClickCoords(null);
              setIsModalOpen(true);
            }}
            className="flex flex-shrink-0 items-center gap-2 px-4 py-2.5 md:px-6 md:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-sm hover:shadow-md font-medium"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">Add Restaurant</span>
          </button>
        </div>
      </header>

      <div className="flex-1 flex relative z-20">
        {/* Mobile backdrop (only when the bottom sheet is open) */}
        {sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-20 bg-black/40 md:hidden"
          />
        )}

        {/* Restaurant list: bottom sheet on mobile, side panel on desktop */}
        <div
          className={`bg-white border-gray-200 flex flex-col overflow-hidden
            fixed inset-x-0 bottom-0 z-30 max-h-[75vh] rounded-t-2xl shadow-2xl
            transition-transform duration-300 ${sidebarOpen ? 'translate-y-0' : 'translate-y-full'}
            md:static md:z-10 md:max-h-none md:h-full md:rounded-none md:shadow-none md:border-r
            md:translate-y-0 md:transition-[width] ${sidebarOpen ? 'md:w-96' : 'md:w-0'}`}
        >
          {/* Drag handle (mobile only) */}
          <div className="md:hidden flex justify-center pt-2 pb-1">
            <div className="h-1.5 w-10 rounded-full bg-gray-300" />
          </div>
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">
              {restaurants.length} Restaurant{restaurants.length !== 1 ? 's' : ''}
            </h2>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-gray-500 hover:text-gray-700 p-2 -mr-1 text-lg leading-none md:text-base"
            >
              ×
            </button>
          </div>
          <div className="overflow-y-auto flex-1 overscroll-contain">
            {restaurants.map((restaurant) => (
              <button
                key={restaurant.id}
                onClick={() => {
                  setSelectedRestaurant(restaurant);
                  if (typeof window !== 'undefined' && window.innerWidth < 768) {
                    setSidebarOpen(false);
                  }
                }}
                className={`w-full text-left p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                  selectedRestaurant?.id === restaurant.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{restaurant.name}</h3>
                      {restaurant.is_inkind && (
                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">
                          inKind
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{displayAddress(restaurant.address)}</p>
                    {/*
                    <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                      <MapPin className="w-3 h-3" />
                      <span>
                        {restaurant.happy_hours.length} happy hour
                        {restaurant.happy_hours.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    */}
                  </div>
                </div>
              </button>
            ))}
            {restaurants.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                <MapPin className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No restaurants yet.</p>
                <p className="text-sm mt-1">Click on the map or the Add button to add one!</p>
              </div>
            )}
          </div>
        </div>

        {/* Toggle sidebar button: bottom pill on mobile, top-left on desktop */}
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="absolute z-30 flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-medium shadow-lg transition-colors hover:bg-gray-50 bottom-6 left-1/2 -translate-x-1/2 md:bottom-auto md:left-4 md:top-4 md:translate-x-0 md:rounded-lg md:px-4 md:py-2 md:shadow-md"
          >
            <List className="h-4 w-4 md:hidden" />
            <span className="md:hidden">Restaurants</span>
            <span className="hidden md:inline">Show List</span>
          </button>
        )}

        {/* Map */}
        <div className="flex-1 relative z-0">
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
            <MapClickHandler onMapClick={handleMapClick} />
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
                icon={isSelected ? selectedIcon : restaurant.is_inkind ? inkindIcon : customIcon}
                zIndexOffset={isSelected ? 1000 : 0}
                eventHandlers={{
                  click: () => setSelectedRestaurant(restaurant),
                }}
              >
                <Popup
                  maxWidth={400}
                  offset={isMobileViewport ? [0, -12] : [0, 0]}
                  keepInView
                  autoPanPaddingTopLeft={[20, 20]}
                  autoPanPaddingBottomRight={[20, 20]}
                >
                  <div className="p-1">
                    <div className="flex items-start justify-between">
                      <h3 className="font-bold text-gray-900 text-lg">{restaurant.name}</h3>
                      {restaurant.is_inkind && (
                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full ml-2">
                          inKind
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{displayAddress(restaurant.address)}</p>

                    <div className="mt-3">
                      <HappyHoursForSelectedDay
                        happyHours={restaurant.happy_hours}
                        onEdit={setEditingHappyHour}
                        compact
                      />
                    </div>

                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                        restaurant.address
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 mt-3"
                    >
                      <ExternalLink className="w-3 h-3" />
                      View on Google Maps
                    </a>
                  </div>
                </Popup>
              </Marker>
              );
            })}
          </MapContainer>

          {/* Restaurant detail overlay when selected — disabled in favor of map popup */}
          {/*
          {selectedRestaurant && (
            <div className="absolute bottom-4 left-4 right-4 z-[1000] bg-white rounded-xl shadow-xl p-4 md:left-auto md:right-4 md:w-96 max-h-[60vh] overflow-y-auto">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-gray-900 text-xl">{selectedRestaurant.name}</h3>
                  {selectedRestaurant.is_inkind && (
                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full mt-1 inline-block">
                      Available on inKind
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setSelectedRestaurant(null)}
                  className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                >
                  ×
                </button>
              </div>
              <p className="text-sm text-gray-600 mb-3">{displayAddress(selectedRestaurant.address)}</p>

              <HappyHoursForSelectedDay
                happyHours={selectedRestaurant.happy_hours}
                onEdit={setEditingHappyHour}
              />

              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  selectedRestaurant.address
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full mt-4 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
              >
                <ExternalLink className="w-4 h-4" />
                Open in Google Maps
              </a>
            </div>
          )}
          */}
        </div>
      </div>

      {/* Add Restaurant Modal */}
      <AddRestaurantModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSuccess={() => {
          fetchRestaurants();
        }}
        initialCoords={mapClickCoords}
      />
      <EditHappyHourModal
        happyHour={editingHappyHour}
        onClose={() => setEditingHappyHour(null)}
        onSuccess={async () => {
          await fetchRestaurants();
        }}
      />

      <style>{`
        .leaflet-popup-content-wrapper {
          border-radius: 12px;
        }
        .leaflet-popup-content {
          margin: 12px 16px;
        }
        @media (max-width: 640px) {
          .leaflet-popup {
            max-width: calc(100vw - 16px);
          }
          .leaflet-popup-content-wrapper {
            max-width: calc(100vw - 32px) !important;
          }
          .leaflet-popup-content {
            width: min(340px, calc(100vw - 56px)) !important;
            max-width: calc(100vw - 56px) !important;
            max-height: min(420px, calc(100dvh - 180px));
            overflow-y: auto;
            margin: 10px 12px;
          }
        }
      `}</style>
    </div>
  );
}

export default App;

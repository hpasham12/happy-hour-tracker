import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import { Icon } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Plus, MapPin, Clock, Utensils, Wine, Star, ExternalLink } from 'lucide-react';
import { supabase } from './lib/supabase';
import { AddRestaurantModal } from './components/AddRestaurantModal';
import type { DealItem, DealListValue, RestaurantWithHappyHours, HappyHour } from './types';
import { DAYS_OF_WEEK } from './types';

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

function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function formatTime(time: string): string {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
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

function HappyHourCard({ happyHour }: { happyHour: HappyHour }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3 mt-2">
      <div className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-2">
        <Clock className="w-4 h-4 text-blue-600" />
        {DAYS_OF_WEEK[happyHour.day_of_week]}: {formatTime(happyHour.start_time)} -{' '}
        {formatTime(happyHour.end_time)}
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

function App() {
  const [restaurants, setRestaurants] = useState<RestaurantWithHappyHours[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mapClickCoords, setMapClickCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedRestaurant, setSelectedRestaurant] = useState<RestaurantWithHappyHours | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    fetchRestaurants();
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
      setRestaurants(restaurantsData as RestaurantWithHappyHours[]);
    }
  }

  const handleMapClick = (lat: number, lng: number) => {
    setMapClickCoords({ lat, lng });
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setMapClickCoords(null);
  };

  return (
    <div className="h-screen w-screen flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Chi Happy Hours</h1>
            <p className="text-sm text-gray-500">Track the best happy hour deals in Chicagoland</p>
          </div>
          <button
            onClick={() => {
              setMapClickCoords(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-sm hover:shadow-md font-medium"
          >
            <Plus className="w-5 h-5" />
            Add Restaurant
          </button>
        </div>
      </header>

      <div className="flex-1 flex relative z-20">
        {/* Sidebar */}
        <div
          className={`${
            sidebarOpen ? 'w-96' : 'w-0'
          } transition-all duration-300 bg-white border-r border-gray-200 overflow-hidden z-10 flex flex-col`}
        >
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">
              {restaurants.length} Restaurant{restaurants.length !== 1 ? 's' : ''}
            </h2>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-gray-500 hover:text-gray-700 p-1"
            >
              ×
            </button>
          </div>
          <div className="overflow-y-auto flex-1">
            {restaurants.map((restaurant) => (
              <button
                key={restaurant.id}
                onClick={() => setSelectedRestaurant(restaurant)}
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
                    <p className="text-sm text-gray-600 mt-1">{restaurant.address}</p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                      <MapPin className="w-3 h-3" />
                      <span>
                        {restaurant.happy_hours.length} happy hour
                        {restaurant.happy_hours.length !== 1 ? 's' : ''}
                      </span>
                    </div>
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

        {/* Toggle sidebar button */}
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="absolute left-4 top-4 z-20 bg-white shadow-md rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Show List
          </button>
        )}

        {/* Map */}
        <div className="flex-1 relative">
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

            {restaurants.map((restaurant) => (
              <Marker
                key={restaurant.id}
                position={[restaurant.latitude, restaurant.longitude]}
                icon={restaurant.is_inkind ? inkindIcon : customIcon}
                eventHandlers={{
                  click: () => setSelectedRestaurant(restaurant),
                }}
              >
                <Popup maxWidth={300} minWidth={250}>
                  <div className="p-1">
                    <div className="flex items-start justify-between">
                      <h3 className="font-bold text-gray-900 text-lg">{restaurant.name}</h3>
                      {restaurant.is_inkind && (
                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full ml-2">
                          inKind
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{restaurant.address}</p>

                    {restaurant.happy_hours.length > 0 ? (
                      <div className="mt-3">
                        <h4 className="font-semibold text-sm text-gray-700 mb-2">Happy Hours</h4>
                        {restaurant.happy_hours.map((hh) => (
                          <HappyHourCard key={hh.id} happyHour={hh} />
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 mt-3">No happy hour info added yet.</p>
                    )}

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
            ))}
          </MapContainer>

          {/* Restaurant detail overlay when selected */}
          {selectedRestaurant && (
            <div className="absolute bottom-4 left-4 right-4 bg-white rounded-xl shadow-xl p-4 md:left-auto md:right-4 md:w-96 z-1000 max-h-[60vh] overflow-y-auto">
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
              <p className="text-sm text-gray-600 mb-3">{selectedRestaurant.address}</p>

              {selectedRestaurant.happy_hours.length > 0 ? (
                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">Happy Hours</h4>
                  {selectedRestaurant.happy_hours.map((hh) => (
                    <HappyHourCard key={hh.id} happyHour={hh} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No happy hour info added yet.</p>
              )}

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

      <style>{`
        .leaflet-popup-content-wrapper {
          border-radius: 12px;
        }
        .leaflet-popup-content {
          margin: 12px 16px;
        }
      `}</style>
    </div>
  );
}

export default App;

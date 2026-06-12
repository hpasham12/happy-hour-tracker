import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Marker as LeafletMarker } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { AddRestaurantModal } from './components/AddRestaurantModal';
import { AppHeader } from './components/AppHeader';
import { EditHappyHourModal } from './components/EditHappyHourModal';
import { LeafletPopupStyles } from './components/LeafletPopupStyles';
import { RestaurantMap } from './components/map/RestaurantMap';
import { RestaurantSidebar } from './components/restaurants/RestaurantSidebar';
import { useMobileViewport } from './hooks/useMobileViewport';
import { useResponsiveSidebar } from './hooks/useResponsiveSidebar';
import { useRestaurantFilters } from './hooks/useRestaurantFilters';
import { useUserLocation } from './hooks/useUserLocation';
import { fetchRestaurantsWithHappyHours } from './services/restaurants';
import { filterRestaurants } from './utils/filters';
import type { HappyHour, RestaurantWithHappyHours } from './types';

function App() {
  const [restaurants, setRestaurants] = useState<RestaurantWithHappyHours[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mapClickCoords, setMapClickCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedRestaurant, setSelectedRestaurant] = useState<RestaurantWithHappyHours | null>(null);
  const [editingHappyHour, setEditingHappyHour] = useState<HappyHour | null>(null);
  const [sidebarOpen, setSidebarOpen] = useResponsiveSidebar();
  const isMobileViewport = useMobileViewport();
  const userLocation = useUserLocation();
  const { filters, updateFilters, toggleDay, clearFilters } = useRestaurantFilters();
  const markerRefs = useRef<Record<string, LeafletMarker | null>>({});

  const nowMinutes = useMemo(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  }, []);

  const filteredRestaurants = useMemo(
    () => filterRestaurants(restaurants, filters, nowMinutes),
    [restaurants, filters, nowMinutes]
  );

  const fetchRestaurants = useCallback(async () => {
    const nextRestaurants = await fetchRestaurantsWithHappyHours();

    setRestaurants(nextRestaurants);
    setSelectedRestaurant((currentRestaurant) =>
      currentRestaurant
        ? nextRestaurants.find((restaurant) => restaurant.id === currentRestaurant.id) ?? null
        : null
    );
  }, []);

  useEffect(() => {
    void fetchRestaurants();
  }, [fetchRestaurants]);

  const openAddRestaurantModal = () => {
    setMapClickCoords(null);
    setIsModalOpen(true);
  };

  const handleMapClick = (lat: number, lng: number) => {
    setMapClickCoords({ lat, lng });
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setMapClickCoords(null);
  };

  const handleRestaurantSelect = (restaurant: RestaurantWithHappyHours) => {
    setSelectedRestaurant(restaurant);

    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  return (
    <div className="flex h-dvh w-screen flex-col">
      <AppHeader onAddRestaurant={openAddRestaurantModal} />

      <div className="relative z-20 flex min-h-0 flex-1">
        <RestaurantSidebar
          restaurants={filteredRestaurants}
          totalCount={restaurants.length}
          selectedRestaurant={selectedRestaurant}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onOpen={() => setSidebarOpen(true)}
          onSelectRestaurant={handleRestaurantSelect}
          userCoords={userLocation.coords}
          locationStatus={userLocation.status}
          filters={filters}
          onUpdateFilters={updateFilters}
          onToggleDay={toggleDay}
          onClearFilters={clearFilters}
        />

        <RestaurantMap
          restaurants={filteredRestaurants}
          selectedRestaurant={selectedRestaurant}
          markerRefs={markerRefs}
          isMobileViewport={isMobileViewport}
          onMapClick={handleMapClick}
          onSelectRestaurant={setSelectedRestaurant}
          onEditHappyHour={setEditingHappyHour}
          filters={filters}
          onUpdateFilters={updateFilters}
          onToggleDay={toggleDay}
          onClearFilters={clearFilters}
        />
      </div>

      <AddRestaurantModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSuccess={() => {
          void fetchRestaurants();
        }}
        initialCoords={mapClickCoords}
      />
      <EditHappyHourModal
        happyHour={editingHappyHour}
        onClose={() => setEditingHappyHour(null)}
        onSuccess={fetchRestaurants}
      />

      <LeafletPopupStyles />
    </div>
  );
}

export default App;

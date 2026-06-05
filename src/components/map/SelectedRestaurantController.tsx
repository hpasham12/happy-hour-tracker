import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import type { Marker as LeafletMarker } from 'leaflet';
import type { RestaurantWithHappyHours } from '../../types';

interface SelectedRestaurantControllerProps {
  selectedRestaurant: RestaurantWithHappyHours | null;
  markerRefs: React.MutableRefObject<Record<string, LeafletMarker | null>>;
}

export function SelectedRestaurantController({
  selectedRestaurant,
  markerRefs,
}: SelectedRestaurantControllerProps) {
  const map = useMap();

  useEffect(() => {
    if (!selectedRestaurant) return;

    const marker = markerRefs.current[selectedRestaurant.id];
    const targetZoom = Math.max(map.getZoom(), 14);

    map.once('moveend', () => marker?.openPopup());
    map.flyTo([selectedRestaurant.latitude, selectedRestaurant.longitude], targetZoom, {
      duration: 0.6,
    });
  }, [selectedRestaurant, map, markerRefs]);

  return null;
}

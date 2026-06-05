import { useMapEvents } from 'react-leaflet';

interface MapClickHandlerProps {
  onMapClick: (lat: number, lng: number) => void;
}

export function MapClickHandler({ onMapClick }: MapClickHandlerProps) {
  useMapEvents({
    click: (event) => {
      onMapClick(event.latlng.lat, event.latlng.lng);
    },
  });

  return null;
}

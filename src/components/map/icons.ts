import { Icon } from 'leaflet';

const markerShadowUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png';

export const defaultRestaurantIcon = new Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: markerShadowUrl,
  shadowSize: [41, 41],
});

export const inkindRestaurantIcon = new Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: markerShadowUrl,
  shadowSize: [41, 41],
});

export const selectedRestaurantIcon = new Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  iconSize: [33, 54],
  iconAnchor: [16, 54],
  popupAnchor: [1, -46],
  shadowUrl: markerShadowUrl,
  shadowSize: [54, 54],
});

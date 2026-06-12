import { useEffect, useState } from 'react';
import type { Coordinates } from '../utils/distance';

export type LocationStatus = 'prompt' | 'granted' | 'denied' | 'unavailable';

interface UserLocationState {
  coords: Coordinates | null;
  status: LocationStatus;
}

// Requests the browser geolocation once on mount and exposes the result + status.
export function useUserLocation(): UserLocationState {
  const [state, setState] = useState<UserLocationState>({
    coords: null,
    status: 'prompt',
  });

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setState({ coords: null, status: 'unavailable' });
      return;
    }

    let cancelled = false;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (cancelled) return;
        setState({
          coords: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          },
          status: 'granted',
        });
      },
      (error) => {
        if (cancelled) return;
        setState({
          coords: null,
          status: error.code === error.PERMISSION_DENIED ? 'denied' : 'unavailable',
        });
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

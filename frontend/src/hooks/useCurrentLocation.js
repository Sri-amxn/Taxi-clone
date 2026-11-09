import { useState, useEffect, useCallback } from 'react';

export function useCurrentLocation() {
  const [location, setLocation] = useState(null);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision((n) => n + 1), []);
  useEffect(() => {
    if (!navigator.geolocation) {
      setError('This browser does not support location. Search for an address instead.');
      return;
    }
    let disposed = false;
    const success = (p) => {
      if (disposed) return;
      setLocation({
        lat: p.coords.latitude,
        lng: p.coords.longitude,
        accuracy: p.coords.accuracy,
        updated: p.timestamp,
      });
      setError('');
    };
    const failure = (e) => {
      if (disposed) return;
      setError(
        e.code === 1
          ? 'Location permission denied. Enable it in browser settings, then refresh location.'
          : e.code === 3
            ? 'Location timed out. Your last position may be outdated; refresh to try again.'
            : 'Current location is unavailable. Check device location services or choose an address.',
      );
    };
    const options = { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 };
    const id = navigator.geolocation.watchPosition(success, failure, options);
    const fresh = () => {
      if (!document.hidden) navigator.geolocation.getCurrentPosition(success, failure, options);
    };
    document.addEventListener('visibilitychange', fresh);
    return () => {
      disposed = true;
      navigator.geolocation.clearWatch(id);
      document.removeEventListener('visibilitychange', fresh);
    };
  }, [revision]);
  return { location, error, refresh };
}

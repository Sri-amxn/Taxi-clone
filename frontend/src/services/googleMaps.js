let loading;
export function loadMaps() {
  const key = import.meta.env.VITE_GOOGLE_MAPS_BROWSER_KEY;
  if (!key)
    return Promise.reject(
      Error('Add your Google Maps browser key to frontend/.env.local and restart Vite.'),
    );
  if (!loading)
    loading = new Promise((resolve, reject) => {
      if (window.google?.maps) {
        resolve(window.google.maps);
        return;
      }
      const script = document.createElement('script');
      const timer = setTimeout(
        () => reject(Error('Google Maps timed out. Check network access and API restrictions.')),
        15000,
      );
      window.gm_authFailure = () => {
        clearTimeout(timer);
        reject(
          Error(
            'Google Maps rejected the key. Check billing, enabled APIs and website restrictions.',
          ),
        );
      };
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly&libraries=places,geometry`;
      script.onload = () => {
        clearTimeout(timer);
        resolve(window.google.maps);
      };
      script.onerror = () => {
        clearTimeout(timer);
        reject(Error('Google Maps could not load. Check network access.'));
      };
      document.head.appendChild(script);
    });
  return loading;
}

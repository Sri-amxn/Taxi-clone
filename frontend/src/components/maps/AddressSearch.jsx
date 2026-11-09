import React, { useState, useEffect, useRef } from 'react';

import { loadMaps } from '../../services/googleMaps.js';
export function AddressSearch({ onChange, label }) {
  const host = useRef();
  const callback = useRef(onChange);
  callback.current = onChange;
  const [error, setError] = useState('');
  useEffect(() => {
    let disposed = false;
    let widget;
    let listener;
    loadMaps()
      .then(async () => {
        const { PlaceAutocompleteElement } = await google.maps.importLibrary('places');
        if (disposed) return;
        widget = new PlaceAutocompleteElement();
        widget.style.colorScheme = 'light';
        widget.setAttribute('aria-label', label);
        host.current.replaceChildren(widget);
        listener = async (event) => {
          try {
            const place = event.placePrediction.toPlace();
            await place.fetchFields({ fields: ['location', 'formattedAddress'] });
            if (!disposed && place.location) {
              setError('');
              callback.current(
                `${place.location.lat()},${place.location.lng()}`,
                place.formattedAddress,
              );
            }
          } catch {
            setError('Address lookup failed. Try again or use coordinates.');
          }
        };
        widget.addEventListener('gmp-select', listener);
        widget.addEventListener('gmp-error', () =>
          setError('Address search unavailable. Check Places API (New) access.'),
        );
      })
      .catch((e) => !disposed && setError(e.message));
    return () => {
      disposed = true;
      if (widget && listener) widget.removeEventListener('gmp-select', listener);
      host.current?.replaceChildren();
    };
  }, [label]);
  return (
    <div className="address-search">
      <div className="address-search-host" ref={host} />
      {error && (
        <small className="address-error" role="alert">
          {error}
        </small>
      )}
    </div>
  );
}

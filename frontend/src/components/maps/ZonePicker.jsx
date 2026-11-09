import React, { useState } from 'react';
import { LiveMap } from './LiveMap.jsx';
import { AddressSearch } from './AddressSearch.jsx';
import { useCurrentLocation } from '../../hooks/useCurrentLocation.js';

export function ZonePicker({ value, onChange, radius }) {
  const { location, error } = useCurrentLocation();
  const [address, setAddress] = useState('');
  const parsed = value?.split(',').map(Number);
  const center =
    parsed?.length === 2 && parsed.every(Number.isFinite)
      ? { lat: parsed[0], lng: parsed[1] }
      : location;
  return (
    <div>
      <AddressSearch
        label="Search surge area"
        onChange={(v, label) => {
          onChange(v);
          setAddress(label);
        }}
      />
      <p>{address || 'Search an area or click its center on the map.'}</p>
      {error && !value && <small>{error}</small>}
      <LiveMap
        currentLocation={center}
        onPick={(v) => {
          onChange(v);
          setAddress('Selected map location');
        }}
        radius={radius}
      />
      {value && <small>Zone center selected · adjust radius below</small>}
    </div>
  );
}

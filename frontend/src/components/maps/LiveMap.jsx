import React, { useState, useEffect, useRef } from 'react';
import { Alert, Switch } from 'antd';

import { loadMaps } from '../../services/googleMaps.js';
export function LiveMap({
  quote,
  driverLocation,
  currentLocation,
  onPick,
  radius,
  pickLabel = 'Zone center',
}) {
  const host = useRef();
  const map = useRef();
  const own = useRef();
  const circle = useRef();
  const picker = useRef(onPick);
  picker.current = onPick;
  const overlays = useRef([]);
  const traffic = useRef();
  const driver = useRef();
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const [trafficOn, setTrafficOn] = useState(true);
  useEffect(() => {
    let disposed = false;
    loadMaps()
      .then((m) => {
        if (disposed) return;
        map.current = new m.Map(host.current, {
          center: { lat: 0, lng: 0 },
          zoom: 2,
          mapTypeControl: false,
          streetViewControl: false,
        });
        map.current.addListener('click', (e) =>
          picker.current?.(`${e.latLng.lat()},${e.latLng.lng()}`),
        );
        traffic.current = new m.TrafficLayer();
        traffic.current.setMap(map.current);
        setReady(true);
      })
      .catch((e) => !disposed && setError(e.message));
    return () => {
      disposed = true;
      overlays.current.forEach((x) => x.setMap(null));
      driver.current?.setMap(null);
      traffic.current?.setMap(null);
    };
  }, []);
  useEffect(() => {
    if (!ready) return;
    own.current?.setMap(null);
    circle.current?.setMap(null);
    if (currentLocation) {
      const position = { lat: currentLocation.lat, lng: currentLocation.lng };
      own.current = new google.maps.Marker({
        map: map.current,
        position,
        title: onPick ? pickLabel : 'Your location',
        label: onPick ? (pickLabel === 'Zone center' ? 'Z' : 'P') : 'You',
      });
      if (!quote) {
        map.current.panTo(position);
        map.current.setZoom(14);
      }
      if (radius)
        circle.current = new google.maps.Circle({
          map: map.current,
          center: position,
          radius: Number(radius),
          fillColor: '#6558e8',
          fillOpacity: 0.15,
          strokeColor: '#6558e8',
          strokeWeight: 2,
        });
    }
    return () => {
      own.current?.setMap(null);
      circle.current?.setMap(null);
    };
  }, [ready, currentLocation?.lat, currentLocation?.lng, radius, !!quote]);
  useEffect(() => {
    if (!ready) return;
    traffic.current.setMap(trafficOn ? map.current : null);
  }, [ready, trafficOn]);
  useEffect(() => {
    if (!ready) return;
    overlays.current.forEach((x) => x.setMap(null));
    overlays.current = [];
    if (!quote) return;
    const bounds = new google.maps.LatLngBounds();
    [quote.origin, quote.destination].forEach(([lat, lng], i) => {
      overlays.current.push(
        new google.maps.Marker({ map: map.current, position: { lat, lng }, label: i ? 'B' : 'A' }),
      );
      bounds.extend({ lat, lng });
    });
    if (quote.polyline)
      overlays.current.push(
        new google.maps.Polyline({
          map: map.current,
          path: google.maps.geometry.encoding.decodePath(quote.polyline),
          strokeColor: '#6558e8',
          strokeWeight: 5,
        }),
      );
    map.current.fitBounds(bounds, 60);
  }, [ready, quote?.polyline, JSON.stringify(quote?.origin), JSON.stringify(quote?.destination)]);
  useEffect(() => {
    driver.current?.setMap(null);
    if (ready && driverLocation)
      driver.current = new google.maps.Marker({
        map: map.current,
        position: { lat: driverLocation.lat, lng: driverLocation.lng },
        label: 'D',
        title: 'Assigned driver · latest GPS update',
      });
  }, [ready, driverLocation?.lat, driverLocation?.lng]);
  return (
    <section>
      {error && <Alert type="warning" message={error} showIcon />}
      {!currentLocation && !quote && (
        <p className="muted">Allow location access or search an address to center your map.</p>
      )}
      <div ref={host} className={error ? 'map map-unavailable' : 'map'} />
      {ready && (
        <p>
          <Switch checked={trafficOn} onChange={setTrafficOn} size="small" /> Show live traffic{' '}
          <small> · Coverage varies by location</small>
        </p>
      )}
    </section>
  );
}

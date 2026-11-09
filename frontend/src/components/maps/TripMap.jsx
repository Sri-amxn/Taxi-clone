import React, { useState, useEffect } from 'react';
import { Button, Alert } from 'antd';
import { LiveMap } from './LiveMap.jsx';

export function TripMap({ ride, request, currentLocation }) {
  const [route, setRoute] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function refresh() {
    setBusy(true);
    try {
      const result = await request(`/rides/${ride.id}/route`);
      setRoute(result);
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 60000);
    return () => clearInterval(timer);
  }, [ride.id, ride.driver_status]);
  const display = route || ride.quote;
  return (
    <>
      <LiveMap
        quote={display}
        driverLocation={ride.driver_location}
        currentLocation={currentLocation}
      />
      {error && <Alert message={error} type="warning" />}
      {route && (
        <p>
          {route.leg === 'pickup' ? 'Driver to pickup' : 'Trip to destination'} ·{' '}
          {route.km.toFixed(1)} km · estimated {Math.ceil(route.minutes)} min ·{' '}
          {Math.ceil(route.traffic_delay_minutes)} min traffic delay
          <br />
          Estimated arrival{' '}
          {new Date(route.arrival_at * 1000).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}{' '}
          · updated {new Date(route.calculated_at * 1000).toLocaleTimeString()}
          <br />
          <small>Estimates change with traffic. Your confirmed fare stays unchanged.</small>
        </p>
      )}
      <Button loading={busy} onClick={refresh}>
        Refresh ETA
      </Button>
    </>
  );
}

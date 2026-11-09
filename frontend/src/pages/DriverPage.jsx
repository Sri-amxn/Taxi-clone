import React, { useState, useEffect } from 'react';
import { Button, Card, Modal, Statistic, Space } from 'antd';
import { api } from '../api/client.js';
import { Availability } from '../components/driver/Availability.jsx';
import { Status } from '../components/common/Status.jsx';
import { LiveMap } from '../components/maps/LiveMap.jsx';
import { TripMap } from '../components/maps/TripMap.jsx';
import { useCurrentLocation } from '../hooks/useCurrentLocation.js';
import { History } from '../components/trips/TripHistory.jsx';
import { StartRide } from '../components/driver/StartRide.jsx';
import { Earnings } from '../components/driver/Earnings.jsx';

export function Driver({ data, action, refresh }) {
  const { location, error: locationError, refresh: refreshLocation } = useCurrentLocation();
  const [gps, setGps] = useState('');
  const active = data.rides.find((r) => r.status === 'ASSIGNED');
  const [clock, setClock] = useState(Date.now());
  async function sendLocation() {
    return new Promise((resolve, reject) =>
      navigator.geolocation.getCurrentPosition(
        async (p) => {
          try {
            await api('/driver/location', 'PUT', {
              lat: p.coords.latitude,
              lng: p.coords.longitude,
              accuracy: p.coords.accuracy,
              recorded: p.timestamp / 1000,
            });
            setGps('Location updated');
            resolve();
          } catch (e) {
            setGps(e.message);
            reject(e);
          }
        },
        (e) => {
          setGps('Location permission required');
          reject(e);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
      ),
    );
  }
  useEffect(() => {
    const t = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (!data.status || ['offline', 'suspended'].includes(data.status)) return;
    sendLocation().catch(() => {});
    const t = setInterval(() => sendLocation().catch(() => {}), 30000);
    return () => clearInterval(t);
  }, [data.status]);
  const next = { ride_accepted: 'arriving_at_pickup', arriving_at_pickup: 'waiting_for_rider' };
  return (
    <>
      <div className="driver-heading">
        <p className="eyebrow">DRIVER HOME</p>
        <h1>Your day, at a glance.</h1>
        <p className="muted">
          Manage your availability, follow your trip, and track your earnings.
        </p>
      </div>
      <div className="features">
        <Card>
          <Statistic title="Your earnings" prefix="₹" value={data.earnings || 0} />
        </Card>
        <Card>
          <h3>
            <Status value={data.status} />
          </h3>
          <Availability status={data.status} request={api} onChanged={refresh} />
          <p>{locationError || gps}</p>
          <Button type="link" onClick={refreshLocation}>
            ⌖ Refresh my location
          </Button>
        </Card>
        <Card>
          <Statistic title="Your current share" value={data.revenue_share?.driver_pct} suffix="%" />
          <p>Company share {data.revenue_share?.company_pct}% · applied at trip completion</p>
        </Card>
      </div>
      {!active && <LiveMap currentLocation={location} />}
      {active && (
        <Card>
          <h2>Active trip #GZ{active.id}</h2>
          <TripMap ride={active} request={api} currentLocation={location} />
          <p>
            Fare ₹{active.quote.total} · Your estimated share ₹
            {((active.quote.total * (data.revenue_share?.driver_pct || 0)) / 100).toFixed(2)} (
            {data.revenue_share?.driver_pct}%)
          </p>
          {data.status === 'waiting_for_rider' && <StartRide ride={active} action={action} />}
          {next[data.status] && (
            <Button
              type="primary"
              onClick={() => action('/driver/status', { status: next[data.status] })}
            >
              {
                { arriving_at_pickup: 'Head to pickup', waiting_for_rider: 'I have arrived' }[
                  next[data.status]
                ]
              }
            </Button>
          )}
          {data.status === 'ongoing_ride' && (
            <Button type="primary" onClick={() => action(`/rides/${active.id}/complete`)}>
              Complete trip & settle
            </Button>
          )}
        </Card>
      )}
      <Modal
        open={!!data.invitations?.length}
        title="A new journey is waiting"
        footer={null}
        closable={false}
      >
        {data.invitations?.map((r) => (
          <div key={r.id}>
            <h2>₹{r.quote.total}</h2>
            <p>
              {r.quote.km.toFixed(1)} km · {Math.max(0, Math.ceil(r.deadline - clock / 1000))}{' '}
              seconds remaining
            </p>
            <p>Pickup: {r.quote.origin.join(', ')}</p>
            <Space>
              <Button type="primary" onClick={() => action(`/rides/${r.id}/accept`)}>
                Accept ride
              </Button>
              <Button onClick={() => action(`/rides/${r.id}/reject`)}>Decline</Button>
              <Button onClick={() => action('/driver/status', { status: 'offline' })}>
                Go offline
              </Button>
            </Space>
          </div>
        ))}
      </Modal>
      <Earnings rides={data.rides} />
      <h2>Recent journeys</h2>
      <History rides={data.rides} />
    </>
  );
}

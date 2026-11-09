import React, { useState, useEffect, useRef } from 'react';
import { Button, Card, Tag, Statistic, message } from 'antd';
import { api } from '../api/client.js';
import { Status } from '../components/common/Status.jsx';
import { statusText } from '../utils/status.js';
import { LiveMap } from '../components/maps/LiveMap.jsx';
import { AddressSearch } from '../components/maps/AddressSearch.jsx';
import { TripMap } from '../components/maps/TripMap.jsx';
import { useCurrentLocation } from '../hooks/useCurrentLocation.js';

export function Rider({ data, action }) {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const { location, error: locationError, refresh: refreshLocation } = useCurrentLocation();
  const [followLocation, setFollowLocation] = useState(true);
  const [pickupLabel, setPickupLabel] = useState('');
  const [destinationLabel, setDestinationLabel] = useState('');
  const routeRef = useRef('');
  routeRef.current = origin + '|' + destination;
  const [quote, setQuote] = useState(null);
  const [busy, setBusy] = useState(false);
  const active = data.rides.find((r) => ['SEARCHING', 'ASSIGNED'].includes(r.status));
  useEffect(() => {
    if (!location || !followLocation || active) return;
    const next = `${location.lat},${location.lng}`;
    if (next !== origin) {
      setOrigin(next);
      setQuote(null);
    }
    setPickupLabel('Live current location');
  }, [location?.lat, location?.lng, followLocation, !!active]);
  const [clock, setClock] = useState(Date.now());
  useEffect(() => {
    let t = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <>
      <div className="page-title">
        <div>
          <p className="eyebrow">LET’S GET MOVING</p>
          <h1>Where are we headed?</h1>
          <p className="muted">A comfortable ride, a clear price. That’s the plan.</p>
        </div>
        <Tag color="purple">Your city. Your journey.</Tag>
      </div>
      <div className="booking-grid">
        {active ? (
          <Card className="booking">
            <p className="eyebrow">YOUR CURRENT RIDE</p>
            <h2>{active.status === 'SEARCHING' ? 'Finding your driver' : 'You’re on your way'}</h2>
            <Status value={active.status} />
            <p className="muted">
              Your pickup and fare are confirmed. Follow your ride on the map.
            </p>
            <Statistic title="Confirmed fare" prefix="₹" value={active.quote.total} />
            <p className="muted">
              {active.driver_name
                ? 'Driver: ' + active.driver_name
                : 'Nearby drivers are being notified.'}
            </p>
          </Card>
        ) : (
          <Card className="booking">
            <div className="booking-heading">
              <span className="booking-kicker">YOUR NEXT JOURNEY</span>
              <h2>Where to?</h2>
              <p>Set your pickup and choose a destination.</p>
            </div>
            <div className="journey-fields">
              <div className="journey-field pickup-field">
                <span className="journey-dot" aria-hidden="true" />
                <div className="journey-field-content">
                  <div className="field-caption">PICKUP</div>
                  <AddressSearch
                    label="Search pickup address"
                    onChange={(v, label) => {
                      setFollowLocation(false);
                      setOrigin(v);
                      setPickupLabel(label);
                      setQuote(null);
                    }}
                  />
                  <div className="location-summary" role="status">
                    <span className="location-summary-label">
                      {pickupLabel ? 'Pickup set' : 'Location'}
                    </span>
                    <span>
                      {pickupLabel || 'Waiting for device location or an address selection'}
                    </span>
                  </div>
                  <Button
                    type="link"
                    disabled={!!active}
                    onClick={() => {
                      setFollowLocation(true);
                      refreshLocation();
                    }}
                  >
                    ⌖ {followLocation ? 'Refresh current location' : 'Use live current location'}
                  </Button>
                  <small className="muted">
                    {active
                      ? 'Your booked pickup stays fixed for this ride.'
                      : followLocation
                        ? 'Pickup follows your location until you book.'
                        : 'Using your selected address.'}
                  </small>
                  {followLocation && location && (
                    <small className="muted">
                      Device accuracy:{' '}
                      {Number.isFinite(location.accuracy)
                        ? `approximately ±${Math.ceil(location.accuracy)} m`
                        : 'unknown'}
                      .{' '}
                      {location.accuracy > 100
                        ? 'Low accuracy — choose a pickup address or refine the pin on the map.'
                        : 'Click the map to refine the pickup pin before booking.'}
                    </small>
                  )}
                  {locationError && (
                    <small className="location-warning" role="status">
                      {locationError}
                    </small>
                  )}
                </div>
              </div>
              <div className="journey-field destination-field">
                <span className="journey-dot" aria-hidden="true" />
                <div className="journey-field-content">
                  <div className="field-caption">DESTINATION</div>
                  <AddressSearch
                    label="Search destination address"
                    onChange={(v, label) => {
                      setDestination(v);
                      setDestinationLabel(label);
                      setQuote(null);
                    }}
                  />
                  <div className="location-summary" role="status">
                    <span className="location-summary-label">
                      {destinationLabel ? 'Destination set' : 'Next step'}
                    </span>
                    <span>
                      {destinationLabel || 'Select an address from the search suggestions'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="ride-type">
              <span className="car">▰</span>
              <div>
                <strong>GenZ Comfort</strong>
                <p>Everyday rides, comfortably.</p>
              </div>
              <Tag>4 seats</Tag>
            </div>
            <Button
              type={quote ? 'default' : 'primary'}
              size="large"
              block
              loading={busy}
              disabled={!!active || !origin || !destination}
              onClick={async () => {
                const snapshot = routeRef.current;
                setBusy(true);
                setQuote(null);
                try {
                  const params = new URLSearchParams({
                    origin,
                    destination,
                    origin_label: pickupLabel,
                    destination_label: destinationLabel,
                  });
                  const result = await api('/fares/quote?' + params);
                  if (routeRef.current === snapshot) setQuote(result);
                  else message.info('Locations changed. Please request a fresh estimate.');
                } catch (e) {
                  message.error(e.message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {quote ? 'Refresh estimate' : 'See fare estimate'}
            </Button>
            <p className="fine">
              Refresh to get current road distance and traffic. The confirmed fare stays locked
              after booking.
            </p>
          </Card>
        )}
        {active?.status === 'ASSIGNED' ? (
          <TripMap ride={active} request={api} currentLocation={location} />
        ) : (
          <LiveMap
            pickLabel="Pickup"
            quote={active?.quote || quote}
            onPick={
              active
                ? undefined
                : (v) => {
                    setFollowLocation(false);
                    setOrigin(v);
                    setPickupLabel('Pickup selected on map');
                    setQuote(null);
                  }
            }
            currentLocation={
              origin
                ? { lat: Number(origin.split(',')[0]), lng: Number(origin.split(',')[1]) }
                : location
            }
          />
        )}
      </div>
      {quote && !active && (
        <Card className="quote">
          <div>
            <h2>Your ride, itemized</h2>
            <Tag color={quote.demo ? 'orange' : 'blue'}>
              {quote.demo ? 'Demo estimate · not road routing' : 'Traffic-aware estimate'}
            </Tag>
            <p>
              {quote.km.toFixed(1)} km · approximately {Math.ceil(quote.minutes)} min
            </p>
            <p>
              {quote.demo
                ? 'Demo mode: traffic is not live.'
                : `Traffic delay: ${Math.max(0, Math.ceil(quote.minutes - quote.baseline))} min above baseline.`}
            </p>
            <p>
              {quote.expires * 1000 < clock
                ? 'Quote expired — refresh the estimate before booking.'
                : `Estimate valid for ${Math.ceil((quote.expires * 1000 - clock) / 1000)} seconds.`}
            </p>
          </div>
          <div>
            <p>
              Base ₹{quote.base} + distance ₹{quote.distance_amount} + time ₹{quote.duration_amount}
            </p>
            <p>
              Surge {quote.multiplier}× · {quote.reasons.join(', ') || 'Standard pricing'}
            </p>
            <strong className="price">₹{quote.total}</strong>
            <Button
              type="primary"
              onClick={() => action('/rides', { quote_id: quote.id })}
              disabled={
                busy ||
                quote.expires * 1000 < clock ||
                quote.origin.join(',') !== origin ||
                quote.destination.join(',') !== destination
              }
            >
              Confirm & find driver
            </Button>
          </div>
        </Card>
      )}
      {active && (
        <Card className="quote">
          <div>
            <Status value={active.status} />
            <h2>
              {active.status === 'SEARCHING'
                ? 'Finding your perfect ride…'
                : 'Your driver is on the way'}
            </h2>
            <p>
              {active.status === 'SEARCHING'
                ? `Searching ${active.radius} m · next round in ${Math.max(0, Math.ceil(active.expires - clock / 1000))}s`
                : `${active.driver_name || 'Your driver'} · ${statusText(active.driver_status)}`}
            </p>
          </div>
          {active.status === 'ASSIGNED' && active.driver_status !== 'ongoing_ride' && (
            <div className="ride-code">
              <small>Share only when you meet your driver</small>
              <h2>{active.start_code || 'Code expired or locked'}</h2>
              <Button type="link" onClick={() => action(`/rides/${active.id}/renew-code`)}>
                Get a new code
              </Button>
            </div>
          )}
          {active.status === 'SEARCHING' && (
            <Button onClick={() => action(`/rides/${active.id}/cancel`)}>Cancel search</Button>
          )}
        </Card>
      )}
      <div className="features">
        <Card>
          <b>Transparent by design</b>
          <p>See every fare component before booking.</p>
        </Card>
        <Card>
          <b>A smarter match</b>
          <p>Nearby drivers first. A wider search when needed.</p>
        </Card>
        <Card>
          <b>Your journey matters</b>
          <p>Location shared only to support your ride.</p>
        </Card>
      </div>
    </>
  );
}

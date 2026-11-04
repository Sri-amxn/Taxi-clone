# GenZ Taxi

A responsive React + Ant Design + SCSS frontend connected to a Flask API. The implementation is based on the supplied GenZ@Work guide. It is an initial development implementation, not a launch-ready transport platform.

## Run locally

Python 3.11+ and Node 22+ recommended. From the repository root:

```bash
python -m venv .venv
.venv/bin/pip install -r backend/requirements.txt
cd backend
export DEMO_MODE=1
export SECRET_KEY='your-long-random-session-secret'
export USER_CODE_SECRET='your-other-stable-random-secret'
../.venv/bin/flask --app app init-demo
../.venv/bin/python app.py
```

In another terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the Vite address shown in the terminal. Register a rider and a driver in separate browsers (session tokens are per tab). Allow driver location, go available, then choose a pickup within 500 m of the driver. Confirm a quote, accept the request in the driver window, and advance through arriving, waiting, ongoing and complete. No simulated driver automatically accepts rides. Google-independent demo route estimates are explicitly labelled and are not accurate road routes.

Create an administrator interactively from `backend`: `../.venv/bin/flask --app app create-admin`. There are no default credentials and public registration cannot create admins.

Tests: `cd backend && ../.venv/bin/pytest -q`. Frontend build: `cd frontend && npm run build`.

## Google Maps: where to get your keys

1. Open https://console.cloud.google.com/ and create/select a project.
2. Attach billing, then enable **Maps JavaScript API** and **Routes API** in APIs & Services → Library.
3. In APIs & Services → Credentials → Create credentials → API key, create two distinct keys.
4. Browser key: restrict to **Websites (HTTP referrers)**, allowing your local Vite origin and eventual deployed domain. Restrict API access to Maps JavaScript API. Put `VITE_GOOGLE_MAPS_BROWSER_KEY=...` in `frontend/.env.local`, then restart Vite. This key is intentionally visible to browsers; restrictions are essential.
5. Server key: restrict API access to Routes API and restrict to the backend's outbound IP where supported. Export `GOOGLE_MAPS_SERVER_KEY` into the Flask process. Never put this key in a VITE variable or commit it.
6. The backend calls `routes.googleapis.com/directions/v2:computeRoutes` for road distance, traffic-aware duration, baseline duration and encoded route polyline. These values drive server-calculated fares. The browser displays the map, pickup/destination markers and polyline.
7. Set quotas and billing budget alerts. Review https://developers.google.com/maps/billing-and-pricing/overview for current pricing. Budget alerts do not automatically cap charges. Test restrictions and quota errors in your own project.

No Places API is required: the app offers sample Bengaluru locations, coordinate entry and browser geolocation. Address autocomplete is a future enhancement requiring Places API configuration. HTTPS is necessary for geolocation on deployed websites. Browser background GPS intervals are not guaranteed.

## Architecture for a senior walkthrough

React Router renders role-specific screens → Fetch calls `/api` → Flask authenticates a signed one-hour token and enforces roles → services validate business rules → Repository/SQLAlchemy persists changes. Socket.IO delivers invitations and updates; 3-second polling restores current state after missed events. A worker checks persisted matching rounds every second. Rounds begin at 500 m and expand 500 m every 30 seconds, stopping after 5 km. A fresh location is less than 90 seconds old. Driver location updates target 30 seconds.

`backend/app.py` groups layers in one file for easy reading; split these into modules as the project grows. All twelve logical tables from the guide are represented. Fares are quoted for 120 seconds and persisted; confirmed rides use that snapshot. Surge chooses the highest configured geographic/time multiplier or a 1.2 traffic multiplier when traffic duration is at least 1.5× baseline, capped globally. Time windows are explicitly UTC and do not wrap midnight. Revenue defaults to 85/15 and is snapshotted on completion; settlement has a unique ride key and repeat completion is idempotent. Eligible fare currently means the quoted ride total; taxes, tips, discounts and refunds are not implemented.

## SQL Server and schema management

SQLite is only the local demo default. Set `DATABASE_URL` using the example in `backend/.env.example`, install Microsoft ODBC Driver 18 for your operating system and use a least-privileged SQL Server account. Keep TLS certificate verification enabled. URL-encode credentials. The database and driver are external prerequisites; SQL Server connectivity has not been validated here.

Flask-Migrate is configured. Use versioned migrations for SQL Server: `flask --app app db init` (once), `flask --app app db migrate -m initial`, review the generated migration, then `flask --app app db upgrade`. Demo-only `init-demo` uses create_all and should never be used to evolve production schemas. Seed fare/share defaults via a reviewed administrative bootstrap before production use.

## Known gaps before claiming full PDF compliance

- Single-process development worker and lock. Multiple Flask workers require a shared job queue, database driver-claim locking and a Socket.IO message broker. Concurrent acceptance across different rides for the same driver needs further hardening.
- SQL Server migrations, concurrency/load tests, Google billing/quotas and live routing must be verified in the target infrastructure.
- No demand-derived surge signal, surge-zone edit/delete, driver approval/licence verification, suspension management, refund/dispute flow or contact information workflow yet.
- Rate limiting is in-memory; add Redis storage, account lockout/backoff, production logging and session revocation. Sign-out currently clears the browser token; server tokens expire after one hour.
- Swagger UI is installed but the complete per-endpoint request/response specification remains to be authored.
- Latest location only is stored, and rider responses omit private driver coordinates. Define retention/deletion jobs, account recovery, consent, backups and incident procedures before deployment.
- Current map shows trip markers, not nearby drivers. Full privacy-safe nearby-driver rendering remains to be implemented.

Production requires HTTPS, a production server, persistent secrets, durable worker deployment, migrations, verified SQL Server transactions and the remaining acceptance tests from the PDF. Do not claim all PDF acceptance criteria are covered by the included smoke test.

## Live Maps update

Enable **Places API (New)** as well as Maps JavaScript API and Routes API. Restrict the browser key to both Maps JavaScript API and Places API (New); the server key remains Routes API only. Address search now uses Google's new PlaceAutocompleteElement. Selecting a result updates the pickup/destination coordinates. Enable browser location permission for precise current location; deployed pages need HTTPS.

Set `DEMO_MODE=0` for real routing. Export `GOOGLE_MAPS_SERVER_KEY` in the backend shell, and set `VITE_GOOGLE_MAPS_BROWSER_KEY` in `frontend/.env.local`; restart both processes. Do not paste the server key into chat. Missing credentials now show map/provider errors rather than an illustrative map.

The map includes a live traffic layer toggle. Assigned trips display the assigned driver's fresh GPS marker, traffic-aware route distance, travel time, traffic delay and estimated arrival. ETA refreshes every 60 seconds (or manually); driver GPS targets 30 seconds. Stale GPS produces a visible warning. Routes use departure time now. A changing ETA does not change the confirmed fare. Before pickup, ETA means driver-to-pickup; once the trip starts it means driver-to-destination. This is traffic-aware estimation, not guaranteed arrival or turn-by-turn navigation.

In a restricted cloud environment allow `routes.googleapis.com` for backend requests and Google Maps/Places browser resources (`maps.googleapis.com`, `maps.gstatic.com`, `places.googleapis.com` plus any additional hosts reported by browser diagnostics). On your Mac, normal Internet access suffices. Google Cloud credentials and billing must be configured by the project owner; live API calls cannot be validated without them.

Manual integration check: search two real addresses, allow location, verify markers and road polyline, toggle traffic, request a ride near a consenting online driver, advance to ongoing and verify the ETA leg changes. Verify a rejected key, disabled billing, no driving route and denied GPS all show errors. Traffic coverage depends on Google's data and region.

This section supersedes the earlier note that Places/address autocomplete and assigned-driver map markers are future work. Nearby unassigned driver locations are still intentionally not exposed.

## Update: personal locations, profiles and ride-start verification

After pulling this update, stop Flask and run the additive schema upgrade once (safe to repeat):

```bash
cd backend
../.venv/bin/flask --app app upgrade-profiles-otp
```

Run it against the same `DATABASE_URL` used by your app. It adds `USER_PROFILES` and `RIDE_VERIFICATIONS` without deleting existing users, rides or earnings. Restart Flask and Vite. Existing accounts can add a display name from **My profile**; new rider/driver registrations require a name. Phone/password remain the login credentials because names are not unique. Mobile and role editing are intentionally unavailable.

There are no preset city coordinates in the UI. Rider pickup initializes from browser GPS when permission is granted; address search provides a fallback. Driver dashboards display their own GPS location, including while offline, but offline browser location is not uploaded to the backend. Maps show a world view with guidance until a location/address is available. Google Places search or a map click fills surge-zone coordinates automatically; admins still choose the radius, schedule and multiplier. The visible circle previews the zone. Selection must be confirmed by saving the form.

Ride OTP is **in-app trip-start verification**, not SMS/login OTP. After assignment the rider sees a six-digit code. The driver reaches `waiting_for_rider`, enters the code, and starts only after server verification. Codes expire after one hour, lock after five incorrect attempts, and are single use. Only the rider can renew a code before the trip starts. Keep `USER_CODE_SECRET` stable across restarts. Existing assigned trips without a code can use the rider's **Get a new code** action. Never share the code before meeting the driver.

Driver earnings show actual historical driver/company percentages and amounts, alongside the current split and estimated active-trip share. Actual settlement uses the configured split at completion. Navigation now highlights the current page, admin Overview is separate from Controls, mutations show feedback, and page transitions respect reduced-motion preferences.

Validation covers profile updates, OTP ownership, direct-status bypass prevention, incorrect/expired/locked codes, renewal, single-use behavior and settlement. Real GPS, map selection and responsive visual behavior still require a browser with configured Google credentials.

## Live current-location behavior

Rider pickup now follows subsequent browser GPS readings until a manual pickup address is selected or a ride is booked. **Use live current location** restores following; **Refresh current location** restarts the location watcher after permission/device changes. Moving pickup invalidates an unconfirmed fare quote, so request an updated quote before booking. A booked ride retains its agreed pickup.

Driver maps already watch GPS; both rider and driver trip maps now also display the user's current position. Driver GPS uploads continue targeting 30 seconds while online. Returning to a visible browser tab requests a fresh position. Permission/time-out messages explain when the last position may be outdated. Actual precision and update frequency depend on device location services; desktop locations can be approximate, and browser background tracking is not guaranteed.

## Clean Ant Design interface

The current interface follows the neutral, map-first design plan: separate rider/driver entry choices, focused booking, prominent driver availability/earnings, mobile bottom navigation, readable statuses and searchable admin monitoring. See [UI design and component guide](docs/UI-DESIGN.md) for where Ant Design is used, theme configuration, responsive behavior and verification limits. No database migration or new dependency is needed for this design update.

## Driver availability switch

Drivers can manually go online/offline when idle, paused, after completion, or while invitations are pending. Online first obtains fresh GPS and saves it, with visible progress and specific permission/timeout/API errors. Offline does not request GPS. The incoming-request dialog also offers **Go offline**, cancelling pending invitations. Accepted/ongoing trips and suspended accounts cannot switch availability; the UI explains why. Repeated idle-status requests are safe. The single-process server serializes status changes with acceptance; multi-instance locking remains a production prerequisite.

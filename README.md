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

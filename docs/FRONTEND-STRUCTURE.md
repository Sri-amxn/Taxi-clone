# Frontend structure

```text
frontend/
  src/
    main.jsx                  # React mount + providers only
    App.jsx                   # Session bootstrap, routing, dashboard refresh
    theme.js                  # Ant Design theme tokens
    api/
      client.js               # Fetch wrapper and authorization header
      response.js             # Safe JSON/error handling
    auth/session.js           # Session token access/update in one place
    pages/
      LoginPage.jsx
      RiderPage.jsx
      DriverPage.jsx
      AdminPage.jsx
      ProfilePage.jsx
    components/
      common/                 # Icons and readable status tags
      layout/                 # Desktop/mobile navigation
      driver/                 # Availability, earnings, ride-start verification
      trips/                  # Searchable history and expanded details
      maps/                   # Address search, map, trip map and zone picker
    hooks/useCurrentLocation.js
    services/googleMaps.js    # Shared Google script loader
    utils/status.js           # Backend status → readable label
    styles/
      index.scss              # Ordered stylesheet entry
      _base.scss              # Typography, colors and element defaults
      _layout.scss            # Sidebar, header and application frame
      _booking.scss           # Booking surfaces, map and shared control defaults
      _dashboards.scss        # Cards, earnings, tables and profile layout
      _auth.scss              # Authentication base layout
      _feedback.scss          # Page transition and footer
      _responsive.scss        # Original responsive rules
      _address-search.scss    # Places widget and pickup/destination design
      _trip-details.scss      # History details and route text
      _density.scss           # Compact spacing refinements
      _welcome.scss           # Current welcome/login refinements
  tests/api-response.test.js
```

## Where to make changes

- Booking flow: `pages/RiderPage.jsx`.
- Driver controls: `pages/DriverPage.jsx` and `components/driver/`.
- Admin monitoring/settings: `pages/AdminPage.jsx`.
- Authentication form: `pages/LoginPage.jsx`; token changes use `setToken` from `auth/session.js`.
- Server calls: `api/client.js`. Components never read database credentials.
- Maps: `components/maps/`; GPS subscription: `hooks/useCurrentLocation.js`.
- Global Ant Design tokens: `theme.js`. Layout and responsive styling: `styles/`.
- Routes and shared data refresh: `App.jsx`.

Imports are explicit. There is no catch-all component barrel or second copy of the old files. Page components retain their existing named exports (`Login`, `Rider`, etc.) to keep this move focused.

`styles/index.scss` deliberately preserves the previous cascade order. Responsive rules and later density/welcome refinements remain ordered; when changing existing styling, edit its owning partial instead of adding more overrides to the entry file. Existing CSS output was checked during the refactor.

## Formatting and verification

From `frontend`:

```bash
npm ci
npm run format        # format source, tests and Vite configuration
npm run format:check  # verify formatting without changing files
npm test             # API response tests
npm run build
```

Prettier is pinned as a development dependency. No new runtime package is required. Backend files, secrets, database tables and environment-variable names are unchanged. Local `.env.local` stays local.

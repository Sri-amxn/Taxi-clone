# UI design and component guide

## Why Ant Design

This project already uses Ant Design 5. Keeping it gives the application consistent forms, validation, controls, dialogs and tables without introducing a second UI framework. SCSS handles the application layout and responsive behavior; React Router handles screen navigation. Google Maps and its Places autocomplete are provider components, not Ant Design maps.

## Where each piece lives

| File | Purpose | UI components |
| --- | --- | --- |
| `frontend/src/pages/LoginPage.jsx` | First visit, Book a ride / Drive with us, login and registration | Card, Form, Input, Input.Password, Button, Alert, Tag |
| `pages/RiderPage.jsx` | Pickup/destination, fare estimate, confirmation and active trip | Card, Button, Statistic, Tag, Alert |
| `pages/DriverPage.jsx` | Availability, current ride, OTP, earnings | Switch, Statistic, Modal, Form, Table |
| `components/trips/TripHistory.jsx` | Search trip ID/name and filter status | Input.Search, Select, Table, Empty |
| `pages/AdminPage.jsx` | Driver filtering, monitoring, pricing and revenue settings | Table, Select, Input.Search, Form, InputNumber, Switch, Skeleton |
| `pages/ProfilePage.jsx` | Display-name editing | Form, Input, Button |
| `frontend/src/components/layout/Navigation.jsx` and `components/common/` | Shared status labels and desktop/mobile navigation | Ant Design Tag; React Router NavLink; inline SVG icons |
| `frontend/src/components/maps/` | Maps, Places search, GPS and zone selection | Google Maps components, Ant Design Alert/Switch/Button |
| `frontend/src/styles/` | Responsive layout, spacing, colors and focus states | Custom SCSS layered on Ant Design |

## Design rules

- Neutral background, dark readable text, one violet primary accent. Green signals success and fresh/available states.
- A single system sans-serif stack, bold headings, consistent 12–16 px corner radii and generous spacing. Inter is not downloaded; system fonts avoid an external font dependency.
- `ConfigProvider` in `main.jsx` reads `theme.js`, which defines shared accent/success colors, typography, control height and border radius.
- Rider home emphasizes the map and a compact booking card. The primary action progresses from estimate to confirm; after booking the editing card becomes a trip summary.
- Driver home prioritizes availability and earnings, followed by the active trip/map. State names are translated into readable phrases.
- Desktop uses a persistent sidebar. Below 800 px, Home/Trips/Profile move to fixed bottom navigation (admins also get Settings). Safe-area padding prevents overlap with device controls.
- Admin Overview contains monitoring tables and filters; Settings contains editable controls. Audit history remains visible on both for context. Table searches/filtering are client-side over loaded records, not global server search.
- Forms show validation errors; operations display success/error messages and busy states. Initial loading uses Skeleton/Spin. Overview can be refreshed and retried after errors.
- Focus rings, meaningful navigation labels, touch targets and reduced-motion support are included. Live location, role authorization and OTP business rules remain in their existing layers.

## Verification scope

Production build plus Chromium fixture checks cover both first-visit choices, role screens, mobile navigation, trip search and admin settings separation. The fixture browser tests do not certify real Google Maps, device GPS, live network traffic or database behavior. Those integrations require configured credentials and devices.

## Run this update

Pull `main`, then restart Vite. No new package installation or database migration is required for this design update. Stop and restart Flask only if your existing local workflow requires it; this update changes no backend code.

### Address search panel

Google Places autocomplete is explicitly set to `color-scheme: light` on the custom-element host so operating-system dark mode does not turn this otherwise light interface black. The browser provider still owns its internal search UI; SCSS styles its supported host rather than reaching into private shadow DOM. Pickup/destination rows have connected markers, focus outlines and plain read-only selected-address summaries (`cursor: default`, with text selection still available). Only the Google search fields are editable. Quota or key errors are still shown; visual changes do not resolve provider access limits.

For the complete source layout and formatting commands, see [Frontend structure](FRONTEND-STRUCTURE.md).

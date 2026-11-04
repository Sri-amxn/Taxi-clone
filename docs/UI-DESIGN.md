# UI design and component guide

## Why Ant Design

This project already uses Ant Design 5. Keeping it gives the application consistent forms, validation, controls, dialogs and tables without introducing a second UI framework. SCSS handles the application layout and responsive behavior; React Router handles screen navigation. Google Maps and its Places autocomplete are provider components, not Ant Design maps.

## Where each piece lives

| File | Purpose | UI components |
| --- | --- | --- |
| `frontend/src/main.jsx` — Login | First visit, Book a ride / Drive with us, login and registration | Card, Form, Input, Input.Password, Button, Alert, Tag |
| `main.jsx` — Rider | Pickup/destination, fare estimate, confirmation and active trip | Card, Button, Statistic, Tag, Alert |
| `main.jsx` — Driver | Availability, current ride, OTP, earnings | Switch, Statistic, Modal, Form, Table |
| `main.jsx` — History | Search trip ID/name and filter status | Input.Search, Select, Table, Empty |
| `main.jsx` — Admin | Driver filtering, monitoring, pricing and revenue settings | Table, Select, Input.Search, Form, InputNumber, Switch, Skeleton |
| `main.jsx` — Profile | Display-name editing | Form, Input, Button |
| `frontend/src/design.jsx` | Shared status labels and desktop/mobile navigation | Ant Design Tag; React Router NavLink; inline SVG icons |
| `frontend/src/maps.jsx` | Maps, Places search, GPS and zone selection | Google Maps components, Ant Design Alert/Switch/Button |
| `frontend/src/style.scss` | Responsive layout, spacing, colors and focus states | Custom SCSS layered on Ant Design |

## Design rules

- Neutral background, dark readable text, one violet primary accent. Green signals success and fresh/available states.
- A single system sans-serif stack, bold headings, consistent 12–16 px corner radii and generous spacing. Inter is not downloaded; system fonts avoid an external font dependency.
- `ConfigProvider` in `main.jsx` defines shared accent/success colors, typography, control height and border radius.
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

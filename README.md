# Olde Mill Stream RV Resort — Resident & Admin Portal

**Celebrating 40 Years: 1986–2026**

A full-stack Progressive Web App (PWA) for Olde Mill Stream RV Resort in Umatilla, Florida. Gives park residents a single place to check activities, view resort alerts, browse the photo gallery, see the resort map, message management, and receive push notifications — all optimized for mobile use.

---

## Features

### For Residents
- **Dashboard** — weather widget, upcoming activities preview, and recent park alerts
- **Activities Calendar** — sortable list of upcoming events with dates, times, and locations
- **Alerts** — real-time park-wide announcements from management
- **Photo Gallery** — community photo gallery with image upload and moderation
- **Resort Map** — interactive map of the park with lot locations
- **Messages** — direct messaging with park management
- **Help / Contact** — quick access to office hours, phone, and email
- **Push Notifications** — native iOS & Android push via Median.co + OneSignal

### For Admins
- **Admin Dashboard** — overview stats (activities, alerts, photos, residents)
- **Activities Manager** — create, edit, and delete calendar events
- **Alerts Manager** — send park-wide push notifications instantly
- **Gallery Manager** — approve or remove resident-submitted photos
- **Directory Manager** — upload and manage the resident directory (CSV/Excel)
- **Messages** — view and respond to resident help requests

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript, Vite, Wouter, TanStack Query |
| UI | shadcn/ui, Radix UI, Tailwind CSS |
| Backend | Node.js + Express, TypeScript |
| Database | PostgreSQL (Neon), Drizzle ORM |
| Auth | Session-based (express-session + bcrypt) |
| File Storage | Google Cloud Storage (via Replit sidecar) |
| Push Notifications | OneSignal REST API + Median.co native bridge |
| PWA | Service Worker, Web App Manifest |

---

## Project Structure

```
├── client/                  # React frontend (Vite)
│   ├── src/
│   │   ├── pages/           # Route-level page components
│   │   ├── components/      # Shared UI components
│   │   ├── contexts/        # Auth context
│   │   ├── hooks/           # React Query hooks + Median bridge
│   │   └── lib/             # API client, query client
│   └── public/              # Static assets + service worker
├── server/                  # Express backend
│   ├── routes.ts            # All API endpoints
│   ├── storage.ts           # Database access layer (IStorage)
│   ├── db.ts                # Drizzle + PostgreSQL connection
│   ├── pushService.ts       # WebPush + OneSignal delivery
│   └── index.ts             # Server entry point
└── shared/
    ├── schema.ts            # Drizzle schema + Zod types (shared FE/BE)
    └── routes.ts            # API route type definitions
```

---

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `SESSION_SECRET` | Secret for signing session cookies |
| `VITE_ONESIGNAL_APP_ID` | OneSignal App ID (exposed to frontend) |
| `ONESIGNAL_APP_ID` | OneSignal App ID (server-side) |
| `ONESIGNAL_REST_API_KEY` | OneSignal REST API key for sending push |

---

## Authentication

The app uses two login modes:

- **Admin login** — email + password
- **Resident login** — lot number + last name (no password required)

Role-based access control is enforced server-side on all sensitive routes.

---

## Push Notifications

Push notifications are delivered via **OneSignal** through the **Median.co** native app wrapper:

- When an admin creates an alert, `sendResortAlert()` fires immediately
- OneSignal broadcasts to all subscribed iOS and Android devices
- Browser users are served via Web Push (VAPID)

For iOS delivery, APNs credentials must be configured in the OneSignal dashboard. See the OneSignal docs for setup instructions.

---

## Running Locally

```bash
npm install
npm run dev
```

The dev server starts on port 5000. Set `DATABASE_URL` and `SESSION_SECRET` in your environment before starting.

---

## Resort Info

**Olde Mill Stream RV Resort**
1000 N. Central Ave, Umatilla, FL 32784
📞 352.669.3141
✉️ omsmanagement86@gmail.com

Office Hours: Mon–Fri 9 AM–5 PM · Sat 10 AM–2 PM · Sun Closed

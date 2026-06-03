# Threat Model

## Project Overview

Olde Mill Stream RV Resort is a React + Vite frontend backed by a single Node/Express API with PostgreSQL storage. It serves two production user classes: residents and admins. Residents access the directory, gallery, community messaging, help requests, weather, and push notifications; admins additionally manage activities, notifications, directory imports, residents, and gallery moderation.

The production deployment is assumed to run with `NODE_ENV=production` and TLS terminated by the platform. The main production server entry point is `server/index.ts`, which mounts the routes in `server/routes.ts` and serves the built client.

## Assets

- **Admin accounts and sessions** — admin sessions can manage residents, import the directory, moderate user content, and publish resort-wide content. Compromise gives broad control over the portal.
- **Resident accounts and sessions** — resident sessions expose the resident directory, community posts, help messages, and profile information.
- **Resident personal data** — names, lot numbers, phone numbers, usernames, and profile pictures are stored in `users` and surfaced through directory-related endpoints.
- **Community and support messages** — resident-to-admin help requests and community posts contain private communications and moderation state.
- **Gallery and profile images** — uploaded object paths and associated records control what images are shown to users.
- **Application secrets** — `DATABASE_URL`, `SESSION_SECRET`, and third-party API credentials (for OpenAI, OpenWeather, push, and storage sidecars) enable privileged backend access if exposed.

## Trust Boundaries

- **Browser to Express API** — all client input crosses into `server/routes.ts`; the browser is untrusted and every sensitive route must enforce authentication and authorization server-side.
- **Unauthenticated to authenticated users** — public content such as activities, notifications, gallery, weather, and health checks is separate from resident-only endpoints such as the directory, messages, push preferences, profile updates, and image moderation.
- **Authenticated resident to admin** — admin-only actions include directory upload, resident management, activity/notification management, message moderation, and gallery moderation. This boundary must be enforced on the server, not just in the React router.
- **Express API to PostgreSQL** — the API has direct read/write access to the full application dataset. Broken access control or injection in the API layer directly impacts stored resident data.
- **Express API to third-party services** — the server calls external weather, moderation, push, and storage services using backend-held credentials; user-controlled data must not turn those integrations into SSRF, data-leak, or privilege-bypass paths.
- **Production vs dev-only or dormant code** — `server/replit_integrations/**` contains sample or auxiliary routes. For this scan, only code actually reachable from the production Express registration path is in scope. Unregistered helper/example routes should usually be ignored unless production reachability is demonstrated.

## Scan Anchors

- **Production entry points:** `server/index.ts`, `server/routes.ts`, `server/storage.ts`, `server/db.ts`, `shared/schema.ts`, `client/src/App.tsx`.
- **Highest-risk areas:** auth/session setup and login flows in `server/routes.ts`; role-protected CRUD routes; message state changes in `server/storage.ts`; resident directory exposure; upload/object-path handling; external-service-triggering routes such as `/api/weather` and `/api/moderate/image`.
- **Public surfaces:** `/health`, `/api/activities`, `/api/notifications`, `/api/gallery`, `/api/weather`, login/logout endpoints.
- **Authenticated resident surfaces:** `/api/directory`, `/api/messages/*`, `/api/users`, `/api/push/*`, `/api/help`, `/api/profile/picture`, `/api/moderate/image`, gallery submission.
- **Admin surfaces:** `/api/admin/directory/upload`, `/api/residents*`, `/api/activities` mutating routes, `/api/notifications` mutating routes, gallery moderation, pending messages.
- **Usually ignore unless proven reachable in production:** `server/replit_integrations/chat/**`, `server/replit_integrations/audio/**`, `server/replit_integrations/image/**`, and sample object-storage routes unless they are explicitly registered from the main server.

## Threat Categories

### Spoofing

The project uses cookie-backed sessions for both resident and admin access. The server must ensure that only legitimate users can create or assume privileged sessions. Admin account creation, admin login, resident login by lot/last-name, and post-login session handling must prevent attackers from impersonating residents or escalating to admin access.

### Tampering

Authenticated users can create community content, submit gallery records, update push preferences, and modify profile picture paths; admins can import, edit, and delete resident and resort data. The server must validate untrusted input and ensure users can only modify records they are authorized to change.

### Information Disclosure

Resident directory data, help messages, moderation queues, and object-backed images contain private community information. Endpoints must scope responses to the authenticated user’s authorization level, and auxiliary services must not expose backend-held data or internal object paths to unauthorized users.

### Denial of Service

Public and authenticated endpoints accept login attempts, JSON payloads, spreadsheet uploads, and external-service-triggering requests. The system must avoid unauthenticated or low-cost requests that can create excessive backend work, storage consumption, or third-party API usage.

### Elevation of Privilege

The most important guarantee is that resident users and unauthenticated visitors cannot gain admin capabilities or change other users’ data. Every admin route must check the live server-side role, and every per-record mutation must verify record ownership or explicit admin authority.

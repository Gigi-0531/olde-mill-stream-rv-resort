# Olde Mill Stream RV Resort

## Overview

A full-stack web application serving as a resident and admin portal for Olde Mill Stream RV Resort. The platform provides park residents with access to weather updates, activities calendar, resort maps, photo gallery, and community messaging. Administrators can manage activities, notifications, gallery photos, and resident directory.

The application is built as a Progressive Web App (PWA) with offline capabilities, optimized for mobile use by park residents.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript, using Vite as the build tool
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state and caching
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom theme extending rustic/premium color palette (dark navy, warm brown, cream)
- **Forms**: React Hook Form with Zod validation
- **File Uploads**: Uppy library with AWS S3/presigned URL support

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript compiled with tsx for development, esbuild for production
- **Session Management**: Express-session with MemoryStore (cookie-based sessions)
- **Authentication**: Custom session-based auth with bcrypt password hashing
- **Rate Limiting**: express-rate-limit for login endpoint protection

### Data Layer
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM with drizzle-kit for migrations
- **Schema Location**: `shared/schema.ts` (shared between client and server)
- **Connection**: pg Pool with DATABASE_URL environment variable

### Authentication System
- Dual login modes: Admin (username/password) and Resident (lot number/last name)
- Role-based access control with "admin" and "resident" roles
- Server-side session validation with `requireAuth` and `requireAdmin` middleware
- Client-side auth state managed via React Query

### API Design
- RESTful endpoints defined in `shared/routes.ts` with Zod schemas
- Type-safe API contracts shared between client and server
- Standard patterns: `/api/auth/*`, `/api/activities/*`, `/api/notifications/*`, `/api/gallery/*`, `/api/messages/*`

### File Storage
- Google Cloud Storage integration via `@google-cloud/storage`
- Presigned URL upload flow for secure direct uploads
- Object storage service with ACL policy support
- Routes for requesting upload URLs at `/api/uploads/request-url`

### PWA Features
- Service worker for offline caching (`client/public/sw.js`)
- Web app manifest for installability
- Install prompt component for iOS and Android

## External Dependencies

### Database
- **PostgreSQL**: Primary data store, connection via `DATABASE_URL` environment variable

### Cloud Services
- **Google Cloud Storage**: File/image storage for gallery photos, accessed via Replit sidecar endpoint

### Environment Variables Required
- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: Secret for session cookie signing

### Third-Party Libraries (Key)
- `@tanstack/react-query`: Server state management
- `drizzle-orm` / `drizzle-kit`: Database ORM and migrations
- `@radix-ui/*`: Accessible UI primitives
- `@uppy/*`: File upload handling
- `bcrypt`: Password hashing
- `express-session` / `memorystore`: Session management
- `date-fns`: Date formatting
- `zod`: Schema validation
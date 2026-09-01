# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Full-stack therapy booking platform. Node.js/Express backend, React/Redux frontend, Docker deployment. Manages therapy session bookings, payments, and admin operations with emphasis on resilience and caching.

**External integrations**: Calendly (webhooks), Safepay (payments), Google Calendar OAuth.

## Commands

### Backend (`/backend`)
```bash
npm run dev              # Nodemon with --inspect on port 3200
npm test                 # Jest (single-threaded, 30s timeout)
npm run test:coverage    # Coverage → coverage/lcov-report/index.html
npm run test:queue       # Queue system tests only
npm run test:watch       # Watch mode
npm run test:debug       # Detect open handles, verbose
```

### Frontend (`/frontend`)
```bash
npm run dev              # Vite dev server on port 5173
npm run build            # Production build → dist/ (served by Nginx in Docker)
npm run preview          # Preview built dist/
```

### Full Stack
```bash
docker-compose up        # Runs backend, frontend, MongoDB, redis-cache, redis-queue, Nginx
```

---

# Business Logic

This section is the part most likely to be non-obvious from the code. Read it before touching bookings, payments, or auth.

## Accounts are invite-only

There is no open signup. The flow is:

1. Admin creates an `Invitee` (`POST /api/admin/invitations`) with `email`, `name`, and `accountType` (`domestic` | `international`). Invite carries a random `token` and expires in **7 days**. A TTL index purges invitee docs 30 days after `expiresAt`.
2. User hits `POST /api/auth/register` with the invitation `token` plus their details. Registration checks duplicates → validates the invite → marks it used **before** creating the user → rolls back the invite mark if user creation fails.
3. `accountType` is inherited from the invitation, never chosen by the user. It drives pricing (see below).
4. A verification email is queued after creation; failure to send does **not** roll back the account.

`user.role` is `user` | `admin`. Admins are seeded via `utils/seedAdmin.js`, not through registration.

## Booking sources

`booking.source` determines nearly all downstream behavior:

| Source | Created by | Recurring | User can cancel via API |
|---|---|---|---|
| `calendly` | Calendly webhook (`POST /api/bookings/calendly`) | No | **No** — must use the Calendly cancel URL |
| `admin` | Admin panel (`POST /api/admin/bookings`) | No | Yes, subject to notice period |
| `system` | `RecurringBookingBufferRefresh` job | Yes | Yes, subject to notice period |

## Calendly bookings are gated by a single-use JWT

Calendly is a public scheduling page, so booking authorization is carried in the link itself:

1. `GET /api/bookings/calendly` (auth required) counts the user's active non-`system` bookings against the `maxBookings` config. Over the limit → 403.
2. It signs a **30-minute JWT** containing `userId` and a random `jti`, then atomically writes that `jti` to `user.bookingTokenJTI`. The atomic `findOneAndUpdate` guards against concurrent link generation (returns 429).
3. The token is embedded in the Calendly URL as `utm_content`.
4. On `invitee.created`, the webhook verifies the HMAC signature, verifies the JWT, loads the user, and requires `user.bookingTokenJTI === decoded.jti`. It then clears the JTI so the link cannot be reused.
5. **Any failure** (missing token, expired JWT, user gone, JTI mismatch) calls `deleteEvent()`, which cancels the event through the Calendly API and emails the invitee.

The webhook only processes `invitee.created` when `eventName === "1 Hour Session"`. Other event types are acknowledged with 200 and ignored.

Webhook handlers always return 200 on business-logic failures — Calendly retries on non-2xx, and retries here are not useful.

## Pricing forks on account type

`createBooking` reads the price at booking time:

- `accountType === "international"` → `intlSessionPrice` config, currency `USD`
- otherwise → `sessionPrice` config, currency `PKR`

If the price config is missing, the Calendly event is cancelled rather than creating an unpriced booking. Booking and Payment are created together; if Payment creation fails the Booking is deleted.

## Recurring / system bookings

There is no cron generating recurring bookings. `RecurringBookingBufferRefresh` maintains a rolling buffer per user:

- Runs per user, scheduled through `user.recurring.nextBufferRefresh`
- Keeps **2 months** of bookings ahead (`BUFFER_TARGET_MONTHS`)
- Reschedules itself when the buffer drops below **6 weeks** (`REFRESH_THRESHOLD_WEEKS`)
- All occurrence math is done in **`Asia/Karachi`** (hardcoded `TZ` constant), not UTC or server local time
- Intervals: `weekly` | `biweekly` | `monthly`; anchored on `user.recurring.day` (0=Sun) and `user.recurring.time` (`HH:MM`)

Turning a user's recurring off deletes their **future** `system` bookings and the associated payments.

## Booking status lifecycle

`status`: `Active` | `Completed` | `Cancelled` (default `Active`).

- `Active → Completed` — cron in `utils/cron/UpdateBookingStatus.js`, every 5 minutes, on `eventEndTime < now && status === "Active"`
- `Active → Cancelled` — user cancel, admin cancel, or Calendly `invitee.canceled` webhook
- `cancellation.cancelledBy` is `User` | `Admin` | `System`

A unique partial index `prevent_booking_conflicts` on `{eventStartTime, eventEndTime}` blocks double-booking for any booking not `Cancelled`. Expect `E11000` on slot collisions and handle it.

## Cancellation rules

**User-initiated** (`PUT /api/bookings/:bookingId/cancel`):
- Requires a non-empty `reason`
- Rejects `calendly` bookings outright — those must go through the Calendly cancel URL
- Enforces the `noticePeriod` config (days, default `2`): cancelling inside the window returns 403
- Sets the linked payment to `Cancelled` **unless** it is already `Completed`
- Queues Google Calendar event cancellation if `googleEventId` is set
- Queues notification emails to both the user and the admin

**Calendly-initiated** (webhook `invitee.canceled`): sets status/reason/date, maps `canceler_type === "invitee"` → `User`, anything else → `Admin`.

## Deletion (hard deletes — be careful)

- **Admin deletes a booking** (`DELETE /api/admin/bookings/:bookingId`): if the booking has a `googleEventId` and is not `calendly`, deletion is queued as a `GoogleCalendarEventDeletion` job (response says `queued: true`). Otherwise the Payment and Booking are deleted directly.
- **Admin deletes a user**: cascades `Booking.deleteMany({userId})` and `Payment.deleteMany({userId})`. No soft delete, no archival.
- **Disabling recurring**: deletes future `system` bookings and their payments.
- **`DatabaseCleanup` job**: bulk `deleteMany` by explicit id list for `User` | `Booking` | `Payment` | `Invitee`.
- **`deleteEvent()`** is different from all of the above — it cancels the event on Calendly's side for unauthorized/invalid bookings, before any local booking exists.

## Payments

`transactionStatus` (7 values): `Not Initiated` (default) | `Completed` | `Cancelled` | `Refund Requested` | `Refunded` | `Partially Refunded` | `Error`

`paymentMethod`: `Cash` (default) | `Credit Card`

A Payment row is created alongside every Calendly booking, at `Not Initiated`, with a `T-xxxxx` `transactionReferenceNumber`. Two ways it reaches `Completed`:

1. **Safepay (card)** — `POST /api/payments` creates a checkout token, stores it as `payment.tracker`, returns the URL. `POST /api/payments/safepay` webhook then maps:
   - `payment:created` + state `PAID` → `Completed`, records `net`/`fee`, clears `errorMessage`
   - `refund:created` + `PARTIALLY_REFUNDED` / `REFUNDED` → `Partially Refunded` / `Refunded`, sets `netAmountReceived` from `balance`
   - `error:occurred` → `Error` with `errorMessage`
   - Any webhook path sets `paymentMethod = "Credit Card"`
   - `Refunded` queues a refund confirmation email
2. **Cash** — admin hits `PATCH /api/admin/payments/:paymentId/paid`, which sets `Completed`, `paymentMethod = "Cash"`, `netAmountReceived = amount`, `feePaid = 0`. Already-completed payments return 204.

## Authentication

1. `POST /api/auth` → short-lived access JWT in the response body (held in Redux, never persisted) + refresh token in an httpOnly cookie. `user.refreshTokenHash` / `refreshTokenExp` are stored server-side.
2. `middleware/verifyJWT.js` exports **both** `verifyJWT` and `verifyAdmin` — `verifyAdmin` wraps `verifyJWT` and additionally requires `req.user.role === "admin"`. Missing/malformed header → 401; bad token or wrong role → 403.
3. Frontend `apiSlice.js` retries any **403** once against `/api/auth/refresh`, and logs out on refresh failure.

Note the 403-not-401 convention: expired access tokens surface as 403, which is what drives the frontend reauth path. Don't "fix" this to 401 without updating `apiSlice.js`.

## Config keys

Defined in `REQUIRED_CONFIG_KEYS` in `models/Config.js`: `sessionPrice`, `intlSessionPrice`, `maxBookings`, `noticePeriod`, `adminEmail`, `devEmail`, `bankAccounts`, plus the Google OAuth token set (`googleRefreshToken`, `googleAccessToken`, `googleTokenExpiry`, `googleUserEmail`, `googleTokenInvalidated`, `googleSystemCalendarId`).

Beware: some callers hardcode their own fallback when a config read returns nothing (e.g. `getNewBookingLink` falls back to `2` while the seeded `maxBookings` default is `3`). Prefer fixing the config over adding another local default.

---

# Critical Architectural Patterns

### Dual Redis Architecture

Two separate Redis/KeyDB instances to avoid resource contention:
- **redis-cache** (port 6379): `redisCaching` middleware and config caching
- **redis-queue** (port 6380): BullMQ job queues

Always import from `utils/redisClient.js`:
```javascript
const { redisCacheClient, redisQueueClient } = require("../utils/redisClient");
```

### Graceful Degradation — Never Hard-Fail on Redis

- **Queue**: Jobs persist to MongoDB first (source of truth), then optionally to Redis. The `promoter.js` polls MongoDB and promotes delayed jobs to Redis when it recovers.
- **Caching**: Redis failures return null silently — execution continues without cache.
- **Config**: Three-tier fallback: Redis → MongoDB → local file cache (`configLocalCache.bin`).

Cache invalidation failures are logged and swallowed everywhere — never fail a request because invalidation failed, the key will expire.

### Hierarchical Cache Keys + Event-Based Invalidation

Format: `cache:[userId|admin]:[resourceType]:[pathHash]`

```javascript
// Always invalidate via events, never manually delete keys
await invalidateByEvent("booking-updated", { userId: user.id });
```

Events in use: `booking-created`, `booking-updated`, `booking-deleted`, `payment-created`, `payment-updated`. All invalidation rules live in `config/cacheConfig.js` under the `events` object.

### BullMQ Queue with MongoDB Write-Through

```javascript
const { addJob, sendEmail } = require("../utils/queue");
await sendEmail("jobName", { data }, { delay: 60000, priority: 1 });
```

Never instantiate BullMQ directly. Jobs always write to MongoDB first; Redis is optional. If a job runs within 1 hour and Redis is available it is also enqueued immediately and marked promoted; otherwise `promoter.js` picks it up. Job names are constants in `utils/queue/jobNames.js` — use them, don't pass string literals.

### Config Model (Three-Tier Caching)

```javascript
const Config = require("./models/Config");
const price = await Config.getValue("sessionPrice");   // Redis → MongoDB → fallback
await Config.setValue("maxBookings", "5");              // MongoDB + Redis + file cache
await Config.invalidateCache("sessionPrice");
```

---

# Backend Conventions

- **Controllers**: User-facing in `controllers/`, admin-specific in `controllers/admin/`
- **Endpoints**: Route definitions in `endpoints/`. Mounted in `server.js` as `/api/auth`, `/api/user`, `/api/bookings`, `/api/payments`, `/api/admin`, `/api/admin/google-calendar`, `/api/contactMe`, `/api/config`
- **Error handling**: Wrap all route handlers in `express-async-handler`; global handler in `middleware/errorHandler.js`
- **Logging**: Winston — `logger.info/error/warn/debug/success()` — logs auto-rotate via `utils/cron/ClearLogFiles.js`
- **Rate limiting**: Admin routes (`/api/admin/*`) and webhooks (`/api/bookings/calendly`, `/api/payments/safepay`) bypass all limits via the allowlist in `middleware/rateLimiting/generalRateLimit.js`
- **Input sanitization**: Any string that reaches the frontend from an external source (Calendly location strings, admin-entered locations) goes through `sanitize-html` with all tags/attributes stripped

### Validation

- Backend: Joi schemas via `express-joi-validation` in `utils/validation/`
- Frontend: React Hook Form + `@hookform/resolvers` (Joi) — schemas are duplicated across both sides, keep them in sync

---

# Frontend Conventions

### Stack

React 18 + Vite, Redux Toolkit + RTK Query, React Router v6, **PrimeReact** (primary component library, with `primeicons`) layered over **Tailwind CSS**, `framer-motion` for animation, `react-chartjs-2` for admin metrics, `quill` for rich text, `react-toastify` for notifications.

When adding UI, reach for a PrimeReact component before hand-rolling one; use Tailwind for layout and spacing around it.

### Structure

```
src/
  app/api/apiSlice.js   RTK Query base query + 403 reauth logic
  features/             API slices + auth screens (admin, auth, bookings, payments, users)
  pages/
    General/            Public marketing pages (SPA, AboutMe, Services, FAQ, ContactMe, legal)
    Dashboards/
      UserDashboard/    MyBookings, Billing
      AdminDashboard/   Bookings, Users, metrics, system health, config
  routes/               Routers.jsx + ProtectedRoute + AdminProtectedRoute
  layout/               Layout.jsx shell
  components/           Header, Footer, HelpButton
  hooks/                useDebounce, usePersist
  config/roles.js       Role constants
  utils/dateTimeUtils.js
```

### Data layer

- All API calls go through slices that `injectEndpoints` into `app/api/apiSlice.js`. Never call `fetch`/`axios` directly from a component.
- `tagTypes`: `['Task', 'User', 'Booking', 'Payment', 'Metrics']` — `Task` is vestigial and unused.
- Admin surface is split across `adminBookingApiSlice`, `adminUserApiSlice`, `adminPaymentApiSlice`, `adminMetricsApiSlice`, `adminSystemApiSlice`, `adminGoogleCalendarApiSlice`, re-exported from `features/admin/index.js`.

### Routing and auth

- Public: `/`, `/signin`, `/signup`, `/verifyEmail`, `/forgotPassword`, `/resetPassword`, `/consultation`, `/terms-and-conditions`, `/privacy`
- `/dash` — wrapped in `ProtectedRoute` (token present, else attempts a refresh via `RefreshToken`)
- `/admin/*` — wrapped in `AdminProtectedRoute` (token **and** `role === "admin"`); children: `metrics`, `bookings`, `users`, `system`, `config`, `upcoming`, `google-calendar-callback`
- Access token lives only in Redux. On hard refresh, `RefreshToken` re-hydrates it from the httpOnly refresh cookie before rendering protected children.
- Pages are lazy-loaded behind `Suspense` with `LoadingPage` — keep new dashboard routes lazy, the bundle is already large enough to need `--max_old_space_size=2048` at build time.

### Environment

`.env.development` for dev, `.env.production` for prod.

---

# Testing Patterns

- `mongodb-memory-server` for isolated MongoDB; `ioredis` mock for Redis
- All external deps mocked in `__mocks__/` — check before creating new mocks
- Test setup: `__tests__/endpoints/testSetup.js`
- Jest runs single-threaded (`maxWorkers: 1`)
- Some controllers guard `ObjectId` casting for test compatibility (see `safeObjectId` in `controllers/admin/adminInvitationController.js`); this is local to that file, not a project-wide helper

---

# Key Files

| File | Purpose |
|------|---------|
| `backend/server.js` | Bootstrap + startup sequence + route mounts |
| `backend/controllers/bookingController.js` | Calendly webhook, booking-link JWT, user cancellation |
| `backend/controllers/admin/adminBookingController.js` | Admin booking create/cancel/update/delete |
| `backend/controllers/paymentController.js` | Safepay checkout + webhook |
| `backend/utils/queue/jobs/refreshRecurringBuffer.js` | Recurring/system booking generation |
| `backend/utils/cron/UpdateBookingStatus.js` | Active → Completed transition |
| `backend/config/cacheConfig.js` | Cache key patterns + event invalidation rules |
| `backend/middleware/redisCaching.js` | Smart caching middleware with compression |
| `backend/middleware/verifyJWT.js` | `verifyJWT` + `verifyAdmin` |
| `backend/utils/queue/index.js` | Queue API (`addJob`, `sendEmail`) |
| `backend/utils/queue/outbox.js` | MongoDB write-through (source of truth) |
| `backend/utils/queue/promoter.js` | MongoDB → Redis job promotion |
| `backend/models/Config.js` | Three-tier config caching |
| `backend/middleware/rateLimiting/generalRateLimit.js` | Path-based rate limiting + allowlist |
| `frontend/src/app/api/apiSlice.js` | RTK Query base + 403 reauth logic |
| `frontend/src/routes/Routers.jsx` | Full route table |
| `backend/utils/googleOAuth.js` | Google Calendar token management |

---

# Known Rough Edges

Worth knowing before you debug something confusing:

- `paymentController.js` constructs the Safepay client with `environment: "sandbox"` hardcoded, and passes the API key as `v1Secret`. This needs to change before real payments run.
- `createBooking` in `bookingController.js` writes `amount`, `location.join_url`, and `location.zoom_pwd`, none of which exist in `bookingSchema` — Mongoose drops them silently. The schema's `location.meetingLink` is never populated, so online bookings currently store no join link.
- `createBooking` destructures `calendlyEmail` but the caller passes `email`, so the unauthorized-booking email path silently no-ops.

---

# Agent Behavior

- **Never create summary `.md` files** after completing tasks unless explicitly asked to edit a specific markdown file
- **Ask for clarification** if implementation details are unclear before proceeding

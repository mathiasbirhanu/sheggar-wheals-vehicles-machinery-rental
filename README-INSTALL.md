# Sheggar Wheels — Full Application Package

Peer-to-peer car rental marketplace for Addis Ababa. This zip is the **complete,
self-consistent source code** of the app — every feature delivered so far, all
files in their latest version. Extract it into a fresh folder and follow the
setup below; no incremental copying from earlier feature zips is needed.

Stack: Next.js 16 (App Router) · React 19 · TypeScript (strict) · PostgreSQL 16 ·
Prisma 6 · Tailwind CSS 4 · shadcn/ui · Leaflet maps.

---

## 1. What's inside (feature map)

| Feature | Where to look |
|---|---|
| Sign-in: email+password & Google OAuth, roles (RENTER, OWNER, ADMIN) | `src/lib/auth.ts`, `src/actions/auth.ts`, `src/components/auth-forms.tsx` |
| Browse + search + fuel/transmission filters | `src/app/cars/page.tsx`, `src/components/car-card.tsx` |
| Map search (Leaflet, neighbourhood clusters) | `src/components/map-view.tsx` |
| Car detail + photo gallery | `src/app/cars/[id]/page.tsx`, `src/components/photo-gallery.tsx` |
| Booking request + date overlap guard (BR-05) | `src/actions/bookings.ts`, `src/lib/bookings.ts`, `src/components/booking-form.tsx` |
| **Drive modes (FR-49): self-drive / own driver / owner's driver** | `src/components/booking-form.tsx`, `src/lib/validation.ts`, `prisma/schema.prisma` (`DriveMode`) |
| **Licence travels WITH the request — the OWNER approves it** | `src/components/booking-form.tsx` (attach), `src/app/owner/cars/[id]/bookings/page.tsx` (approve/decline) |
| **Rental rules + payment terms (clickwrap, proof stamped in DB)** | `src/lib/terms.ts`, `src/components/terms-dialog.tsx`, `src/components/payment-terms-button.tsx` |
| Auto-refresh: new notifications/transactions appear within 15s | `src/components/auto-refresh.tsx` |
| Escrow-style payments (TeleBirr, CBE, M-Pesa, Chapa) | `src/lib/payments.ts`, `src/app/checkout/[bookingId]/page.tsx` |
| Cancellation + disputes + admin resolution | `src/actions/bookings.ts`, `src/app/admin/disputes/` |
| Reviews with owner replies | `src/app/bookings/[id]/page.tsx`, `src/actions/platform.ts` |
| Discount announcements (banner + per-car badge) | `src/actions/announcements.ts`, `src/components/announcement-ticker.tsx` |
| Owner earnings dashboard + charts | `src/app/owner/earnings/page.tsx`, `src/components/earnings-chart.tsx` |
| Admin income + CSV exports | `src/app/admin/earnings/page.tsx`, `src/app/api/export/` |
| Trip tracking (in-progress map) | `src/components/trip-tracking.tsx`, `src/lib/trips.ts` |
| Notifications (bell + page) | `src/lib/notifications.ts`, `src/components/notification-bell.tsx` |
| Car photos: device upload OR https link, max 5 | `src/components/photo-picker.tsx`, `next.config.ts` |
| Fuel categories (petrol/diesel/hybrid/electric) | `prisma/schema.prisma` (`FuelType`), browse filter |
| Security hardening (fail-closed sessions, rate limits) | `src/lib/auth.ts`, `src/lib/rate-limit.ts` |

Prisma data model: `prisma/schema.prisma` (comments map each field to the SRS
BR/FR numbers). Demo dataset: `prisma/seed.ts`.

---

## 2. Quick start (fresh machine)

Requirements: **Node.js 20+**, **npm**, **Docker Desktop** (for Postgres).

```bash
# 1. Extract this zip and enter the folder
cd sheggar-wheels

# 2. Install dependencies (this also runs prisma generate)
npm install

# 3. Configure the environment
cp .env.example .env
#    → open .env and make sure DATABASE_URL points at your Postgres,
#      then set SESSION_SECRET (generate once:  openssl rand -hex 32)

# 4. Start Postgres (pick ONE):
#    a) your existing container (sheggar-db on port 5433) — just start Docker Desktop
#    b) the repo's compose stack:  docker compose up db -d
#       then use the compose DATABASE_URL shown in .env.example

# 5. Create/update the schema from prisma/schema.prisma
npx prisma db push

# 6. Load the demo dataset (9 users, 12 cars, bookings, reviews, announcements)
npm run db:seed

# 7. Run the app
npm run dev
# → http://localhost:3000
```

**Health check:** `http://localhost:3000/api/health` returns DB latency.

> The seed is **idempotent**: it clears and re-creates the demo data every run.
> Never run it against data you want to keep.

---

## 3. Setup on YOUR machine (existing database)

Your database may be **older** than this code. The bundled schema's new columns
(licence fields, drive mode, terms proof) are all **nullable or defaulted**, so
`npx prisma db push` only ever ADDS columns — it never deletes your data.
Two clean ways forward:

### Path A — keep your existing data (no deletions)

```bash
# 1. Sync the schema — this only ADDS the new nullable columns
npx prisma db push

# 2. Restart the dev server (it must regenerate the Prisma client)
npm run dev
```

Do **not** run `npm run db:seed` on this path — seeding wipes your data.
Bookings made BEFORE this update simply have no licence attached yet; every
NEW request carries one for the owner to review.

### Path B — clean slate (recommended before the final demo)

One command resets the database, then everything matches this package exactly:

```bash
# Wipes sheggar_wheels and re-applies the bundled schema (demo data is disposable)
npx prisma db push --force-reset

# Load the demo dataset
npm run db:seed

npm run dev
```

After the reset, sign-in is exactly as documented in section 4: the seeded
accounts + shared demo password, plus optional Google sign-in.

---

## 4. Demo accounts

Every seeded account uses the shared demo password **`Sheggar!2026`** (also
shown on the sign-in page with one-click fill):

| Email | Name | Roles |
|---|---|---|
| `admin@sheggarwheels.et` | Demo Admin | ADMIN |
| `daniel@sheggarwheels.et` | Daniel Bekele | OWNER |
| `selam@sheggarwheels.et` | Selam Tadesse | OWNER |
| `aklilu@sheggarwheels.et` | Aklilu Mengistu | OWNER |
| `yonas@sheggarwheels.et` | Yonas Girma | RENTER |
| `hanna@sheggarwheels.et` | Hanna Alemu | RENTER |
| `ruth@sheggarwheels.et` | Ruth Wolde | RENTER + OWNER |
| `kalkidan@sheggarwheels.et` | Kalkidan Assefa | RENTER (suspended demo) |

Suspended users are blocked from actions (BR-10) — that's Kalkidan's purpose
in the demo. New visitors can also **sign up** with their own email + password
(strong-password rules) or **Continue with Google**.

**Try the full booking flow end-to-end (2 minutes):**

1. Sign in as Yonas (renter) → open any car → pick dates → choose a drive
   mode. Self-drive / own-driver shows a licence box (number + photo);
   "Use the owner's driver" skips it.
2. Tick the rental rules in the dialog and press **Agree & send request**.
3. Sign out → sign in as the car's owner (e.g. Daniel for Bole/Kazanchis/
   Old Airport cars) → `Owner hub → car → Bookings`. The request shows the
   licence with a **"licence pending review"** badge.
4. **Approve** (licence turns green, renter can pay) or **Decline** with a
   reason. The renter gets a notification either way.
5. Pay at checkout after ticking the payment & escrow terms — the receipt
   page shows which terms versions were accepted and when.

### Google sign-in (optional, 5-minute setup)

The sign-in and sign-up pages show a **Continue with Google** button as soon
as two environment variables exist — and hide it automatically when they
don't. The implementation is hand-rolled OAuth 2.0 (`src/lib/google-auth.ts`,
`src/app/api/auth/google/`) with CSRF-state protection, verified-email-only
linking, rate limiting, and zero new npm dependencies.

1. Open <https://console.cloud.google.com> → create/select a project.
2. **APIs & Services → OAuth consent screen** → choose **External** → fill
   app name + your email → save. (Testing mode is fine for the demo; add your
   Google account as a test user if prompted.)
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID** →
   Application type **Web application**, then:
   - Authorized JavaScript origins: `http://localhost:3000`
   - Authorized redirect URIs: `http://localhost:3000/api/auth/google/callback`
4. Copy the Client ID and Client secret into `.env`:
   ```env
   GOOGLE_CLIENT_ID="...apps.googleusercontent.com"
   GOOGLE_CLIENT_SECRET="GOCSPX-..."
   ```
5. **Restart** `npm run dev` → the button appears on /signin and /signup.
   First sign-in creates a RENTER account linked by verified email; if the
   Google address matches an existing demo account, you're signed into it.
6. For a deployed URL, add the same two entries with your production origin
   in Google Console, and set `NEXT_PUBLIC_SITE_URL` in `.env`.

---

## 5. Everyday commands

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on port 3000 |
| `npm run lint` | ESLint over the repo |
| `npm run build` | Production build (fails on type errors — intentional) |
| `npm start` | Serve the production build (standalone server) |
| `npm run db:push` | Sync `schema.prisma` → database (prompts before data loss) |
| `npm run db:seed` | Re-create the demo dataset |
| `npm run db:studio` | Prisma Studio (browse data in a GUI at port 5555) |
| `npx prisma db pull` | Regenerate schema from the database (rarely needed) |

Windows note: everything runs in **Git Bash** or PowerShell; the seed uses
`tsx`, so no global TypeScript runner or bun install is needed.

---

## 6. Deploying with Docker (optional)

The repo ships a production-grade stack: multi-stage Dockerfile (non-root,
healthchecked) + `docker-compose.yml` (app + Postgres 16).

```bash
cp .env.example .env       # set SESSION_SECRET (mandatory in production)
docker compose up --build
# app on http://localhost:3000 — migrations apply automatically at boot
```

Production safety: without a real `SESSION_SECRET` the server **refuses to
issue or trust session tokens** (fail-closed), and every public mutating server
action is rate-limited per IP with structured logs.

---

## 7. Known behaviours worth remembering

- Photos and licence images are stored as **data URLs** (resized in the browser
  to ≤1280 px / JPEG q0.82) or https links — no file storage service needed.
  CSP and `next/image` are already configured for both sources.
- Booking prices, discounts and fees are **snapshotted** at request time
  (BR-03/BR-04) — later price edits or expiring offers never rewrite history.
- Only `APPROVED` cars are public (BR-02); admin approves listings from
  `Admin → Listings`.
- `Booking.license*` fields are nullable so pre-feature rows and admin seeds
  stay valid; new requests always require them (zod-enforced).

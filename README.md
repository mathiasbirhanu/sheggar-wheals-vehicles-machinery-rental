# Sheggar Wheels 🚗

**Peer-to-peer car rental marketplace for Addis Ababa, Ethiopia** — rent a car from people you trust.

Sheggar Wheels connects local car owners with renters through a verified catalogue, a fully
server-enforced booking lifecycle, and an escrow-style payment narrative (mock TeleBirr).
Built as an IBT-QIYAS front-end capstone to production standards: typed end-to-end, hardened
headers, rate limiting, SEO/JSON-LD, health probes and one-command Docker deployment.

> **Demo notice (constraint C7 / SW-DEMO):** payments, GPS tracking and identity checks are
> simulated and always labelled in-product. No real money moves.

---

## Highlights

| Area | What you get |
| --- | --- |
| Catalogue (FR-08..12) | URL-driven search, filters, 4 sort orders, availability-range filter, pagination — every view shareable & reload-safe |
| Booking lifecycle (FR-17..22) | 9-state machine (`REQUESTED → CONFIRMED → IN_PROGRESS → COMPLETED → REVIEWED`, plus `DECLINED / CANCELLED / DISPUTED / RESOLVED`), all transitions re-validated server-side (BR-11) |
| Escrow payments (FR-23..24) | Mock TeleBirr checkout; funds **HELD** until trip completion, released or refunded per lifecycle outcome |
| Double-booking guard (BR-05) | Overlap re-checked inside the approval action, not just at request time |
| Trust & safety | Reviews (one per booking), owner replies, disputes with admin resolution + booking restore (BR-06/07) |
| Roles | Renter / Owner / Admin with dual-role accounts, suspension flow, guard bounces without data disclosure (BR-08/10) |
| SEO | Per-listing metadata, `schema.org/Car` + `Offer` + `AggregateRating` JSON-LD, sitemap, robots, Open Graph image |
| Ops | `/api/health` readiness probe, structured JSON logs, Docker multi-stage image, `prisma migrate deploy` at boot |

## Tech stack

- **Next.js 16** (App Router, Turbopack) + **React 19** + **TypeScript 5** (strict — build fails on type errors)
- **PostgreSQL 16** + **Prisma ORM** (migration-based schema, 7 models)
- **Tailwind CSS 4** + **shadcn/ui** + Lucide icons; Recharts for owner earnings
- **Server Actions** for all mutations (zod-validated, role-checked, revalidated)
- **Leaflet** map (OpenStreetMap tiles), SWR-style polling for the notification bell

## Quick start

### Option A — Docker Compose (recommended)

```bash
cp .env.example .env          # then set SESSION_SECRET=$(openssl rand -hex 32)
docker compose up --build
# → app on http://localhost:3000, Postgres 16 on :5432
# migrations apply automatically on boot; first boot seeds nothing — see below
```

To load the demo dataset into a fresh Compose database:

```bash
docker compose exec app node -e "1" # container is minimal; run seed from the host instead:
DATABASE_URL=postgresql://sheggar:sheggar_demo_pw@localhost:5432/sheggarwheels \
  bun install && bunx prisma db seed
```

### Option B — local development

```bash
bun install
cp .env.example .env            # point DATABASE_URL at your Postgres
bun run db:deploy               # or: bun run db:reset (migrations + demo seed)
bun run dev                     # http://localhost:3000
```

Useful scripts: `bun run lint` · `bun run db:deploy` (migrate deploy) · `bun run db:reset`
(drop + re-migrate + re-seed) · `bun run build` (standalone production bundle) · `bun start`.

## Demo accounts (seeded)

| Role | Email | Notes |
| --- | --- | --- |
| Renter | `hanna@example.com` | primary renter journey |
| Owner | `daniel@example.com` | owns several listings, gets approvals |
| Owner | `ruth@example.com` | earnings dashboard demo |
| Dual role | `yonas@example.com` | renter **and** owner (FR-04) |
| Admin | `admin@sheggarwheels.et` | moderation, disputes, reports |

Sign-in is one click from `/signin` (passwordless demo per FR-01). A suspended account
(`marta@example.com`) demonstrates the FR-06 suspension wall but is hidden from the quick list.

## Booking lifecycle

```
REQUESTED ──approve──▶ CONFIRMED ──pay (TeleBirr)──▶ [HELD] ──pickup──▶ IN_PROGRESS
    │                     │                            └──complete──▶ COMPLETED ──review──▶ REVIEWED
    ├─decline─▶ DECLINED  ├─cancel─▶ CANCELLED (held funds refunded)
    └─cancel─▶ CANCELLED  └─dispute─▶ DISPUTED ──admin resolve─▶ RESOLVED ──restore─▶ COMPLETED
```

Money stays **held in escrow** until the owner marks the car returned (benchmark Q2). Any
lifecycle mutation re-checks session, role, ownership and state on the server (BR-11).

## Project structure

```
src/
  app/            # routes: /, /cars, /bookings, /checkout, /owner/*, /admin/*, api
    api/health/   # readiness probe (DB check, 200/503)
    sitemap.ts · robots.ts · manifest.ts · opengraph-image.tsx
  actions/        # server actions: auth, bookings, cars, platform
  components/     # UI (shadcn/ui under ui/), car cards, gallery, map, forms
  lib/            # auth (signed cookie), bookings FSM, pricing, rate-limit, logger…
prisma/
  schema.prisma   # 7 models: User, Car, Booking, Review, Dispute, Announcement, Notification
  migrations/     # SQL migration history (apply with migrate deploy)
  seed.ts         # 9 users · 11 cars · 13 bookings · reviews · disputes
Dockerfile        # multi-stage, non-root, healthcheck, migrate-on-boot
docker-compose.yml# app + postgres:16-alpine
```

## Production deployment runbook

1. **Provision** Postgres 16 (Compose service, RDS, Neon…) and note the connection string.
2. **Secrets** — create `.env` from `.env.example`; `SESSION_SECRET` is mandatory
   (`openssl rand -hex 32`); set `NEXT_PUBLIC_SITE_URL` to the public HTTPS origin (drives
   canonical URLs, sitemap and JSON-LD).
3. **Ship** — `docker compose up --build -d` (or build the image and deploy anywhere that runs
   Node: the standalone bundle needs only `node server.js` + `prisma migrate deploy`).
4. **Verify** — `GET /api/health` returns `{"status":"ok"}` with DB latency; `GET /robots.txt`
   and `/sitemap.xml` resolve; sign in as admin and check `/admin` metrics render.
5. **Observe** — logs are JSON lines (`ts, level, scope, msg`); wire any shipper. The container
   `HEALTHCHECK` reuses `/api/health`.

Hardening already included: CSP + `X-Frame-Options: DENY` + HSTS (prod) + `nosniff` +
Referrer-Policy, httpOnly/SameSite/Secure session cookie, per-IP rate limits on sign-in,
sign-up and payment attempts, in-product SW-DEMO labelling (constraint C7), and no secret or
stack fingerprint leakage (`poweredByHeader` off, health endpoint details suppressed).

## Documentation

Full engineering documents ship alongside the code:
`Sheggar_Wheels_SRS.docx` (50 FRs, 22 NFRs, BR-01..12, traceability) ·
`Sheggar_Wheels_Software_Architecture.docx` (rendering strategy, ADR-01..10) ·
`Sheggar_Wheels_Platform_Benchmark.docx` (Turo/Getaround/Sixt/FLYTS research → design decisions).
# sheggar-wheals-vehicles-machinery-rental

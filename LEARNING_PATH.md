# Sheggar Wheels — Line-by-Line Mastery Program

> Personal mentoring curriculum for the project owner. Each lesson walks through REAL
> production files in this codebase, line by line, with strong justification for every
> decision. Goal: think like a senior engineer, not just copy code.

## How every lesson works (the method)

1. **Context (5 min)** — where the file sits in the architecture and why it exists
2. **Line-by-line walkthrough** — for each line: *what it does → why THIS way → what breaks if you remove it*
3. **"Why not X?" discussions** — the alternatives we rejected and the trade-offs (this is where senior judgment lives)
4. **Exercise** — you modify or extend the file yourself (you type, always)
5. **Homework** — trace one related flow alone, report back what you found

**Golden rules:** you predict before I reveal · you break things on purpose in dev · no line passes without a "why".

---

## Phase 0 — Orientation: how to read a production codebase (Session 1, start here)

- Project tour: `src/app` vs `src/components` vs `src/lib` vs `src/actions` vs `prisma/` — the why of folder contracts
- `package.json` — every script decoded (`dev`, `build`, `db:push`, `db:deploy`, `db:reset`)
- `tsconfig.json` — what `strict: true` actually buys you
- **Skill gained:** navigating any professional repo in minutes

## Phase 1 — TypeScript & utility foundations

- `src/lib/utils.ts` — `cn()`, clsx + tailwind-merge, why class merging matters
- `src/lib/site.ts` — single source of truth (DRY), why hardcoding strings is a bug factory
- **Skill gained:** TS imports/aliases, config literacy, DRY thinking

## Phase 2 — Database design: `prisma/schema.prisma`

- Every model: User (roles enum), Car, Booking (9-state enum!), Review, Dispute, Announcement, Notification
- Relations, `onDelete`, indexes, composite `@unique` (one review per booking)
- **The big lesson:** constraints encode business rules — BR-05 (no double-booking), BR-06 (one review per booking) live here first
- **Skill gained:** data modeling, invariants, thinking in states not booleans

## Phase 3 — Pure business logic (the heart of the app)

- `src/lib/pricing.ts` — money math, the 10% platform fee, price snapshots (BR-03/04), overlap detection
- `src/lib/bookings.ts` — the state-machine transition matrix, `findConflict`, `HARD_HOLD_STATUSES`
- **Why it matters:** pure functions (no I/O) are testable; state machines make illegal states unrepresentable
- **Skill gained:** domain modeling — the difference between junior and senior code

## Phase 4 — Auth & security

- `src/lib/auth.ts` — HMAC-signed httpOnly cookie sessions, `requireUser`/`requireRole`, `safeReturnPath` (BR-09)
- `src/lib/validation.ts` — zod schemas, phone normalization ("never trust the client")
- `src/lib/rate-limit.ts` — sliding-window throttling on signin/pay
- **Skill gained:** threat modeling basics, defense in depth

## Phase 5 — Server Actions: mutations done right

- `src/actions/auth.ts` (simplest) → `cars.ts` → `bookings.ts` (the deep one: transactions, BR-11 re-validation inside the approval action)
- The universal pattern: **Guard → Validate → Mutate (transaction) → Revalidate**
- **Skill gained:** backend mutation design, transaction atomicity

## Phase 6 — UI components: server vs client

- `src/components/car-card.tsx` (server, presentational) → `booking-form.tsx` (client, live totals, fast-path checks) → `notification-bell.tsx` (polling)
- When a component MUST be `"use client"` — and when making it client is a mistake
- **Skill gained:** React 19 + Next.js mental model

## Phase 7 — Pages, routing & SEO

- `app/page.tsx` (landing) → `cars/page.tsx` (URL-driven search state) → `cars/[id]/page.tsx` (dynamic routes, `generateMetadata`, JSON-LD)
- `loading.tsx` / `error.tsx` / `not-found.tsx` — graceful failure
- **Skill gained:** App Router architecture, shareable URL state, SEO

## Phase 8 — Production hardening & DevOps

- `next.config.ts` — security headers, CSP line by line
- `Dockerfile` + `docker-compose.yml` — multi-stage builds, why non-root, HEALTHCHECK
- `src/app/api/health/route.ts` + `src/lib/logger.ts` — observability
- **Skill gained:** shipping like a team, not a tutorial

## Phase 9 — Capstone: YOU build, I review like a senior engineer

- New feature implemented alone (suggested: **"Saved cars / wishlist"** — touches schema, action, page, component — the full stack)
- I do a formal code review: correctness, security, style; you iterate until it passes
- **Proof of mastery:** you ship production-quality code unassisted

---

**Pace — 1-WEEK INTENSIVE (owner request):**

| Day | Phases | Theme |
|---|---|---|
| 1 | Phase 0 + 1 | Orientation + TypeScript foundations |
| 2 | Phase 2 | Database design (Prisma schema) |
| 3 | Phase 3 | Business logic (state machine + pricing) |
| 4 | Phase 4 | Auth & security |
| 5 | Phase 5 + 6 | Server Actions + UI components |
| 6 | Phase 7 + 8 | Routing/SEO + DevOps |
| 7 | Phase 9 | Capstone: you build, I review |

Daily rhythm: theory → line-by-line → exercise (you type) → homework trace. Every session ends with you able to rebuild that file from memory.

**Progress log:**
- Day 1: Phase 0 delivered (folder contracts, package.json scripts, tsconfig strict, request-lifecycle mental model). Local Windows environment fully set up by user — Docker Postgres (vs. native-PG port ghost), .env, Prisma 6 migrate + seed, dev server running, hydration warning triaged as dev-mode noise.
- Homework assigned (Day 1): trace the /cars flow (URL → server component → Prisma → HTML), report in own words.
- Day 2: Phase 1 delivered (src/lib/utils.ts + src/lib/site.ts, line by line). Graded /cars homework (instincts correct, Prisma gap filled). Exercises: A) cn() prediction — correct ("p-2 text-lg"), B) rounded-full live edit on button.tsx — verified visually, reverted, C) tagline SEO check via Ctrl+U — initially "failed" (root cause: file not saved), user self-diagnosed, PASSED, D) supportEmail defined in site.ts + consumed in site-footer.tsx via {site.supportEmail} — PASSED, footer edit kept in production code.
- Day 2 concepts locked: clsx join → twMerge arbitration (later wins), DRY, as const, process.env.X ?? fallback, new URL(path, base), single source of truth (tagline feeds 9 files), JSX {} escape hatch, Ctrl+S save-before-check reflex.
- Homework assigned (Day 2): bonus DRY fix — replace hardcoded "Sheggar Wheels" in footer <p> with {site.name}.
- Day 2 (extended): React/Next.js theory deep-dive delivered (JSX = compiled function calls, {} = expression slots, ES modules = one cached object, Server Components run server-side only, Fast Refresh chain, metadata vs JSX pipelines). Mini-quiz 3/3. Phase 2 STARTED: schema.prisma introduced as data single-source-of-truth (DSL, generates TS types + SQL); decoder ring taught (?: nullable, []: list, @id/@unique/@default/@updatedAt, foreign keys via @relation(fields/references)); model User line-by-line (named relations: two doors User<->Booking); 9-state BookingStatus machine mapped (happy path + DECLINED/CANCELLED escapes + DISPUTED->RESOLVED with statusBeforeDispute restore); snapshot/freeze concept (BR-03/04) fully explained via contract/receipt story; paymentRef String? honesty lesson. DB visibility: Prisma Studio + psql one-liner delivered; photos = Unsplash URLs (DB stores addresses, servers store files); CarImage offline fallback demo (FR-15)
- OPEN items for next session: (1) FK task — who owns the PENDING Land Cruiser (via ownerId sticky note -> User table; answer: Daniel Bekele); (2) micro-check — COMPLETED booking total after price raise (answer: frozen 6000); (3) homework — footer DRY fix {site.name}; (4) finish Phase 2: Booking model details + indexes (@@index composite), Review/Dispute/Notification quick pass; then Phase 3 = state machine + pricing as TypeScript
- NEXT SESSION: check open items -> finish Phase 2 -> Phase 3 (src/lib or src/actions business logic: canTransition state machine, pricing calculator, BR-01..12)

**Resume protocol (any future session):** read this file + `worklog.md`, then continue from the last completed phase.

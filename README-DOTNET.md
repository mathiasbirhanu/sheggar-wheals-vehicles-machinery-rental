# Sheggar Wheels — C#/.NET Backend Guide

Same app, same features, same database — **the entire backend is now C#**.
ASP.NET Core 8 Web API + EF Core replaced the Next.js server actions, API
routes and Prisma. The React frontend (pages, components, styling) is
unchanged — it just talks to the C# API now.

```
┌─────────────────────────┐         ┌──────────────────────────────┐
│  Next.js (Vercel)       │  /api/* │  ASP.NET Core API (Render)   │
│  pages + server actions ├────────>│  controllers + EF Core       │
│  pure UI shell          │  proxy  │  business rules + auth       │
└─────────────────────────┘         └──────────────┬───────────────┘
                                                   │
                                            ┌──────▼───────┐
                                            │  PostgreSQL  │
                                            │  (Supabase)  │
                                            └──────────────┘
```

**What is where now:**

| Old (Node/Prisma)                    | New (C#/.NET)                                   |
| ------------------------------------ | ----------------------------------------------- |
| `src/actions/*.ts` server actions    | `backend/.../Controllers/*ActionsController.cs` |
| `src/app/api/**/route.ts`            | `backend/.../Controllers/*.cs` (same paths)     |
| `src/lib/db.ts` + `prisma/`          | `backend/.../Data/AppDbContext.cs` + EF Core    |
| `src/lib/auth.ts` (sign/verify)      | `backend/.../Infrastructure/SessionTokens.cs`   |
| `src/lib/password.ts` (scrypt)       | `backend/.../Infrastructure/Scrypt.cs`          |
| `src/lib/bookings.ts` (rules)        | `backend/.../Services/BookingRules.cs`          |
| `prisma/seed.ts`                     | `backend/.../Services/SeedService.cs`           |
| `src/lib/pricing.ts`, `terms.ts` ... | unchanged (pure helpers, still used by the UI)  |

Your existing users, cars and bookings keep working: the C# password
verifier is **byte-compatible** with the old scrypt hashes (proven against
the official RFC 7914 test vectors) and the session cookie format is
identical.

---

## Part 1 — Run everything on your laptop (10 minutes)

### Step 0 — Install the .NET 8 SDK (once)

Download and run the installer for your OS: <https://dotnet.microsoft.com/download/dotnet/8.0>
Windows: **x64 SDK installer** → next → next → done. Verify in a NEW terminal:

```
dotnet --version        # should print 8.0.xxx
```

### Step 1 — Configure the API

Create `backend/SheggarWheels.Api/.env` is NOT used by .NET — instead the API
reads real environment variables, or you can paste them into
`backend/SheggarWheels.Api/appsettings.Development.json`:

```json
{
  "ConnectionStrings": {
    "Default": "Host=aws-0-REGION.pooler.supabase.com;Port=5432;Database=postgres;Username=postgres.YOUR-PROJECT;Password=YOUR-PASSWORD"
  },
  "SESSION_SECRET": "paste-64-random-hex-characters",
  "GOOGLE_CLIENT_ID": "",
  "GOOGLE_CLIENT_SECRET": ""
}
```

(Easiest: copy the Session pooler URI from Supabase → Connect, then rewrite it
into the `Host=...;Port=...;Database=...;Username=...;Password=...` form.
You can also just set `DATABASE_URL` as a system environment variable — the
API accepts both.)

### Step 2 — Start the C# API

```
cd backend/SheggarWheels.Api
dotnet run
```

Wait for `Sheggar Wheels API (C#/.NET) listening on port 5000`. Test it:

- <http://localhost:5000/api/health> → `{"status":"ok",...}`
- <http://localhost:5000/> → `{"message":"Hello, world!"}`

### Step 3 — Load the demo data (same dataset as before)

While the API runs, from a SECOND terminal:

```
curl -X POST http://localhost:5000/api/dev/seed
```

(In Development mode no token is needed. Same rule as before: seeding WIPES
the demo tables and re-creates them.)

### Step 4 — Start the frontend (second terminal)

Create `.env` in the project root if you do not have one:

```
BACKEND_URL="http://localhost:5000"
```

Then:

```
npm install
npm run dev
```

Open <http://localhost:3000> — sign in with `daniel@sheggarwheels.et` /
`Sheggar!2026`. Everything works exactly as before, but the data now flows
through C#.

---

## Part 2 — Deploy the backend to Render (free)

### Step 1 — Push this code to GitHub

Commit the `backend/` folder and the updated frontend files (Part 4 below).

### Step 2 — Create the Render service

1. Go to <https://dashboard.render.com> → **New +** → **Web Service**.
2. **Connect** your GitHub repository (allow access when asked).
3. Fill the form:
   - **Name:** `sheggar-wheels-api`
   - **Runtime:** Docker (it finds `backend/Dockerfile` automatically — set
     **Docker Context** = `backend` and **Dockerfile Path** = `backend/Dockerfile`
     if asked; or use the included `render.yaml` blueprint)
   - **Instance Type:** Free
4. **Environment variables** (Add more… for each):
   | Key                  | Value                                                        |
   | -------------------- | ------------------------------------------------------------ |
   | `DATABASE_URL`       | your Supabase **Session pooler** URI in Npgsql form (Step 1) |
   | `SESSION_SECRET`     | the SAME 64-hex secret you already use                       |
   | `GOOGLE_CLIENT_ID`   | your Google client id (optional)                             |
   | `GOOGLE_CLIENT_SECRET` | your Google secret (optional)                              |
   | `SEED_TOKEN`         | any random string (needed to seed the production DB)         |
5. **Create Web Service** → wait for the build (first build ≈ 5 minutes).
6. Your API is live at `https://sheggar-wheels-api.onrender.com`
   (check <https://.../api/health> — should say `"status":"ok"`).

> Free Render services sleep after ~15 idle minutes and need ~50 seconds to
> wake up. The first page after a sleep is slow — press reload once. This is
> normal for the free tier.

### Step 3 — Seed production (once)

From any terminal (PowerShell works):

```
curl.exe -X POST "https://sheggar-wheels-api.onrender.com/api/dev/seed" -H "X-Seed-Token: YOUR-SEED_TOKEN"
```

**⚠️ WARNING:** seeding wipes the demo tables and re-creates them. Your live
site still runs on the OLD Node backend until Step 4 — do the switch first,
THEN decide whether you want fresh demo data.

### Step 4 — Point the frontend at the C# backend

1. Vercel → your project → **Settings → Environment Variables**:
   - Add `BACKEND_URL` = `https://sheggar-wheels-api.onrender.com`
   - Add `SESSION_SECRET` = the same value the API uses
2. **Deployments → Redeploy** (so the new env vars take effect).
3. Open your site, hard-refresh (`Ctrl+Shift+R`), and test sign-in +
   browsing + a booking request. The old Node backend is still in your repo
   history — nothing is deleted, so rolling back is a git revert away.

### Step 5 — Google sign-in (only if you use it)

Google Console → Credentials → your OAuth client → **Authorized redirect
URIs**: keep the existing `https://YOUR-SITE.vercel.app/api/auth/google/callback`
(your users click the SAME URL; Vercel just forwards it to C# now). Nothing
to change unless you also call the API domain directly.

---

## Part 3 — The update loop (C# version)

| What changed            | What to do                                                                                   |
| ----------------------- | -------------------------------------------------------------------------------------------- |
| Data (a car, a booking) | Nothing to deploy — the admin UI edits it live                                                |
| C# backend code         | `git push` → Render auto-rebuilds → wait for green deploy                                     |
| Frontend code           | `git push` → Vercel auto-redeploys → `Ctrl+Shift+R`                                           |
| Database columns        | Edit the entity + `AppDbContext` mapping, then add the column in Supabase (SQL Editor)        |

Render deploy logs: dashboard → your service → **Events** / **Logs**.
A failed build shows the C# compiler error with file and line — copy the
first red line when asking for help.

---

## Part 4 — What changed in the frontend (for your thesis)

- `src/lib/api.ts` — NEW: the single door to the C# API (server-side fetch,
  cookie forwarding, ISO-date revival, action relay with the exact old
  redirect semantics).
- `src/lib/domain.ts` — NEW: TypeScript mirror of the database entities
  (replaces the generated `@prisma/client` types).
- `src/lib/auth.ts` — session checks now call `GET /api/auth/session`.
- `src/lib/bookings.ts` — kept the pure lifecycle rules the UI renders with;
  all database logic moved to C#.
- `src/actions/*.ts` — thin proxies: same signatures, bodies forward to the API.
- `src/app/api/**` — DELETED (the `next.config.ts` rewrite forwards `/api/*`
  to the C# API; the notification bell and CSV links keep working unchanged).
- `prisma/` — removed; `docs/database-schema.prisma` documents the schema.
- `docs/database-schema.prisma` — the database schema, for reference.

## Part 5 — Command cheat sheet (C#)

```
dotnet run                              # start API (backend/SheggarWheels.Api)
dotnet build                            # compile check
dotnet publish -c Release               # production build
curl -X POST localhost:5000/api/dev/seed   # re-seed demo data (dev)
```

## Part 6 — Defense talking points (why this architecture)

- **Clean separation:** the frontend is a pure UI shell; every rule lives in
  the API (BR-11 server-side re-checks never left).
- **Same database, zero data loss:** EF Core maps the EXACT tables, columns
  and native PostgreSQL enums Prisma created.
- **Password compatibility:** a hand-written RFC 7914 scrypt in C# verifies
  the existing hashes byte-for-byte (tested against RFC vectors).
- **Same cookie, same security:** `sw_session` tokens are still HMAC-SHA256
  signed with `SESSION_SECRET`; Google OAuth keeps its CSRF `state` cookie.
- **Escrow + licence flow unchanged:** approve → pay (HELD) → complete →
  release, drive modes, per-booking licence review — all ported 1:1.

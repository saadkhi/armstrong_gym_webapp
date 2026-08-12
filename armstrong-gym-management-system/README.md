# Armstrong Gym Management System

Full-stack gym management web app for members, payments, attendance, trainers, expenses, reports, and WhatsApp reminders. Built with **React + Vite** (frontend) and **Vercel Serverless Functions** (API), backed by **Neon PostgreSQL**.

Designed to deploy on **Vercel Hobby (free)** with **Neon free tier** database.

---

## Features

- Admin dashboard with live stats
- Member CRUD, profiles, QR check-in
- Payment recording, bill upload portal, verification workflow
- Attendance tracking
- Trainer management
- Expense tracking
- Reports & exports
- WhatsApp reminder links (manual + batch)
- Daily cron job for fee/expiry reminders (Vercel Cron)

---

## Tech Stack

| Layer      | Technology                          |
|-----------|--------------------------------------|
| Frontend  | React 19, Vite 6, Tailwind CSS 4   |
| API (prod)| Vercel Serverless (`/api/*`)        |
| API (dev) | Express (`server.ts`) on port 3001  |
| Database  | PostgreSQL (Neon recommended)       |
| Auth      | JWT (8h sessions)                   |

---

## Prerequisites

- **Node.js 20+** ([download](https://nodejs.org/))
- **npm** (comes with Node)
- **PostgreSQL** — choose one:
  - **Neon** (recommended for Vercel) — [neon.tech](https://neon.tech) free tier
  - **Docker** — local Postgres via included `docker-compose.yml`

---

## Quick Start (Local)

### 1. Install dependencies

```bash
cd armstrong-gym-management-system
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and set at minimum:

```env
NEON_DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"
JWT_SECRET="your-random-secret-at-least-32-characters-long"
ADMIN_EMAIL="admin@armstrong.gym"
ADMIN_PASSWORD="admin123"
```

**Option A — Neon (matches production):**

1. Create a free project at [neon.tech](https://neon.tech)
2. Copy the **pooled connection string**
3. Paste it as `NEON_DATABASE_URL` in `.env`

**Option B — Local Docker Postgres:**

```bash
npm run db:up          # starts postgres on localhost:5432
```

Use this in `.env`:

```env
NEON_DATABASE_URL="postgresql://armstrong:armstrong@localhost:5432/armstrong_gym"
```

### 3. Initialize the database

```bash
npm run db:init
```

Creates tables and seeds demo data (admin user, members, payments, etc.).

### 4. Run the app

```bash
npm run dev
```

| Service   | URL                        |
|----------|----------------------------|
| Frontend | http://localhost:5173      |
| API      | http://localhost:3001/api  |

Vite proxies `/api` → Express during development.

### 5. Log in

| Field    | Default              |
|---------|----------------------|
| Email   | `admin@armstrong.gym` |
| Password| `admin123` (or your `ADMIN_PASSWORD`) |

---

## Scripts

| Command        | Description                                      |
|---------------|--------------------------------------------------|
| `npm run dev`   | Start API + Vite dev servers                     |
| `npm run dev:api` | API only (Express)                             |
| `npm run dev:ui`  | Frontend only (Vite)                           |
| `npm run build`   | Production frontend build → `dist/`            |
| `npm run lint`    | TypeScript type check                          |
| `npm run db:init` | Create tables + seed data                      |
| `npm run db:up`   | Start local Postgres (Docker)                  |
| `npm run db:down` | Stop local Postgres (Docker)                   |
| `npm run setup`   | Docker up + wait + db init                     |

---

## Deploy to Vercel (Free Tier)

### Architecture on Vercel

```
Browser → Vercel CDN (static React from dist/)
       → /api/* → Serverless Functions (Node 20)
       → Neon PostgreSQL (external, free tier)
```

### Step 1 — Neon database

1. Sign up at [neon.tech](https://neon.tech)
2. Create a project → copy the **pooled** connection string
3. Keep `?sslmode=require` in the URL

### Step 2 — Push to GitHub

Ensure the repo contains the `armstrong-gym-management-system/` folder.

### Step 3 — Import on Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. Set **Root Directory** to `armstrong-gym-management-system`
4. Framework Preset: **Other** (Vite + serverless API)
5. Build settings (auto-detected from `vercel.json`):
   - Build Command: `npm run build`
   - Output Directory: `dist`

### Step 4 — Environment variables

In Vercel → Project → Settings → Environment Variables, add:

| Variable            | Required | Example / Notes                                      |
|--------------------|----------|------------------------------------------------------|
| `NEON_DATABASE_URL`| Yes      | Neon pooled connection string                        |
| `JWT_SECRET`       | Yes      | Random 64-char hex string                            |
| `ADMIN_EMAIL`      | Yes      | `admin@armstrong.gym`                                |
| `ADMIN_PASSWORD`   | Yes      | Strong password (used only on first DB seed)         |
| `GYM_NAME`         | No       | `Armstrong Gym & Fitness Club`                       |
| `CRON_SECRET`      | Yes*     | Random secret; Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` |
| `TWILIO_*`         | No       | Optional WhatsApp API integration                    |

Generate secrets:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Step 5 — Deploy

Click **Deploy**. On first login, the API auto-creates tables and seeds the admin user.

> **Note:** Set `ADMIN_PASSWORD` before the first deploy if you want a custom admin password. After the admin row exists, change the password via the database or re-seed.

### Cron job (included)

`vercel.json` schedules `/api/cron/fee-reminders` daily at 09:00 UTC.

- Set `CRON_SECRET` in Vercel env vars
- Vercel automatically attaches `Authorization: Bearer <CRON_SECRET>` to cron requests
- Hobby plan: up to 2 cron jobs, once per day minimum

---

## Project Structure

```
armstrong-gym-management-system/
├── api/                  # Vercel serverless API routes (production)
│   ├── auth/
│   ├── members/
│   ├── payments/
│   ├── attendance/
│   ├── trainers/
│   ├── expenses/
│   ├── whatsapp/
│   ├── cron/
│   └── _lib/             # Shared auth, cors, db helpers
├── src/
│   ├── components/       # React UI modules
│   ├── api/client.ts     # Frontend API client
│   ├── db.ts             # PostgreSQL layer + seed
│   └── types.ts
├── server.ts             # Express dev server (not deployed to Vercel)
├── vercel.json           # Vercel build + SPA rewrites + cron
├── docker-compose.yml    # Optional local Postgres
└── .env.example
```

---

## Environment Reference

See [`.env.example`](.env.example) for all variables.

---

## Troubleshooting

**`NEON_DATABASE_URL environment variable is not set`**
→ Copy `.env.example` to `.env` and set the database URL.

**Password authentication failed (local Docker)**
→ Run `npm run db:up` first, or use a Neon connection string instead.

**401 on all API calls after login**
→ Check `JWT_SECRET` is set and identical across restarts.

**Tables missing on Vercel**
→ Log in once (triggers auto-migration) or hit `POST /api/auth/login` after deploy.

**Docker daemon not running**
→ Start Docker Desktop, then `npm run db:up`, or use Neon for local dev too.

---

## License

Private — Armstrong Gym & Fitness Club.

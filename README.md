# Personal Dashboard

A full-stack personal command center built with Next.js 15, PostgreSQL, and a dark glassmorphic UI. Track your schedule, workouts, health, supplements, and finances — all in one place.

## Features

**Schedule** — Full Google Calendar integration with Month, Week, and Day views. Create, edit, and delete events directly in the app. Syncs to-dos bidirectionally with Google Tasks.

**Gym** — Log workouts set by set. Import sessions by pasting Gemini AI output. Track progress over time with per-exercise charts.

**Health** — Daily water intake tracker, sleep logger with quality ratings, and a supplement checklist with morning/evening/night schedules.

**Finance** — Log income and expenses split across three balance targets (Fund, Skill, Flex). Weekly log table, running balance cards, and a trend chart.

**Multi-user ready** — Every user's data is fully isolated. Register an account and connect your own Google Calendar — no data is shared between users.

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router) |
| Database | PostgreSQL via [Neon](https://neon.tech) |
| ORM | Prisma |
| Auth | NextAuth.js (email/password + Google OAuth) |
| Styling | Tailwind CSS + glassmorphism |
| Animations | Framer Motion |

## Design

- **Background:** Deep black `#0A0A0A` with emerald radial gradients
- **Cards:** `rgba(255,255,255,0.04)` glass with `backdrop-filter: blur(20px)`
- **Accent:** Emerald `#10B981`

---

## Self-hosting

### 1. Clone and install

```bash
git clone https://github.com/elitcx/dashboard.git
cd dashboard
npm install
```

### 2. Create a Neon database

1. Sign up at [neon.tech](https://neon.tech) (free, no credit card)
2. Create a project, then copy the **pooled connection string** from the dashboard
   - Looks like: `postgresql://user:pass@ep-xxx-pooler.region.aws.neon.tech/dbname?sslmode=require`

### 3. Configure environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local`:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Neon pooled connection string |
| `NEXTAUTH_URL` | `http://localhost:3000` (or your deployed URL) |
| `NEXTAUTH_SECRET` | Run `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
| `GOOGLE_CLIENT_ID` | From Google Cloud Console (see below) |
| `GOOGLE_CLIENT_SECRET` | From Google Cloud Console (see below) |

### 4. Run migrations and start

```bash
npm run db:migrate
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll land on `/register` to create your account.

### 5. Google Calendar OAuth

Required for the Schedule page. Takes ~3 minutes:

1. Go to [console.cloud.google.com](https://console.cloud.google.com) and create a new project
2. Enable the **Google Calendar API** and **Google Tasks API**
3. Go to **APIs & Services → OAuth consent screen** → External → fill in app name and your email → add yourself as a test user
4. Go to **Credentials → Create Credentials → OAuth client ID**
   - Type: Web application
   - Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
5. Copy the Client ID and Secret into `.env.local`, then restart the dev server

---

## Deploying to Vercel

1. Import this repo at [vercel.com/new](https://vercel.com/new)
2. Add all five environment variables from above (use the Neon **pooled** connection string)
3. Set `NEXTAUTH_URL` to your Vercel domain (e.g. `https://your-app.vercel.app`)
4. In Google Cloud Console, add `https://your-app.vercel.app/api/auth/callback/google` as an authorized redirect URI
5. Deploy — Vercel auto-detects Next.js, no extra config needed

---

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on http://localhost:3000 |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript check |
| `npm run db:migrate` | Apply Prisma migrations |
| `npm run db:studio` | Visual DB browser at http://localhost:5555 |
| `npm run db:reset` | Drop and recreate the DB *(destructive)* |

## Project structure

```
src/
├── app/
│   ├── (auth)/             Login + register pages
│   ├── (dashboard)/        Authenticated pages
│   │   ├── page.tsx           Home — widget overview
│   │   ├── schedule/          Calendar + tasks
│   │   ├── gym/               Workout logger + charts
│   │   ├── health/            Water, sleep, supplements
│   │   └── finance/           Income, expenses, balances
│   └── api/                API routes
├── components/
│   ├── ui/                 Glass primitives (button, input, card, dialog)
│   ├── layout/             Top nav, mobile tab bar
│   ├── dashboard/          Home widgets
│   ├── schedule/           Calendar views + event form
│   ├── gym/                Workout logger + progress charts
│   ├── health/             Health trackers
│   └── finance/            Finance components
├── hooks/                  Data-fetching hooks per module
├── lib/                    Prisma client, auth config, Google Calendar client
└── middleware.ts           Route protection
```

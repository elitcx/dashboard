# Personal Dashboard

A full-stack personal command center: schedule, gym, health, supplements, and a custom weekly finance engine. Built with Next.js 14, PostgreSQL, Prisma, and a dark glassmorphic UI.

## Sprint Progress

- [x] **Sprint 1 — Foundation:** Next.js + Tailwind + Prisma + NextAuth + glass UI + auth flow + home page shell
- [x] **Sprint 2 — Schedule:** Full Google Calendar integration (Month/Week/Day, create/edit/delete events, bidirectional to-do sync)
- [ ] **Sprint 3 — Gym** (Gemini paste import + workout logger + progress charts)
- [ ] **Sprint 4 — Health & Supplements**
- [ ] **Sprint 5 — Finance** (custom weekly budget engine)

## Manual setup before first run

Should take about 2 minutes total.

### 1. Create a Neon database

1. Go to **https://neon.tech** and sign in with Google or GitHub (free, no credit card)
2. Click **Create Project**, give it any name (e.g. `dashboard`)
3. On the dashboard, find the **Connection string** section
4. Make sure **Pooled connection** is selected, then copy the full string
   - It looks like: `postgresql://user:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require`

### 2. Configure environment variables

```powershell
copy .env.example .env.local
```

Edit `.env.local`:

- **`DATABASE_URL`** — paste the Neon connection string you just copied
- **`NEXTAUTH_SECRET`** — generate one and paste it in:
  ```powershell
  node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
  ```
- **`GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`** — leave empty for now (needed only for Google Calendar in Sprint 2)

### 3. Run the database migration

```powershell
npm run db:migrate
```

When it asks for a migration name, type `init` and press Enter. This creates all the tables in your Neon database.

### 4. Start the dev server

```powershell
npm run dev
```

Open http://localhost:3000 — you'll be redirected to `/register` to create your account.

> **Note on Neon's free tier:** Your database "scales to zero" after 5 minutes of inactivity to save resources. The first query after a pause has a ~1 second cold start. This is normal and completely fine for a personal dashboard.

### 5. Google Calendar OAuth (for the Schedule page)

The Schedule page needs Google OAuth credentials. Takes ~3 minutes:

1. Go to **https://console.cloud.google.com**
2. Create a new project (top bar dropdown → **New Project**, name it `dashboard`)
3. Once selected, search for **"Google Calendar API"** in the top search bar, open it, and click **Enable**
4. In the left sidebar, go to **APIs & Services → OAuth consent screen**
   - Choose **External** user type → Create
   - **App name:** Dashboard
   - **User support email:** your email
   - **Developer contact:** your email
   - Save and continue through all steps
   - On the **Test users** step, click **+ Add Users** and add your own Google email
5. Go to **APIs & Services → Credentials → + Create Credentials → OAuth client ID**
   - **Application type:** Web application
   - **Name:** Dashboard local
   - **Authorized redirect URIs:** click **+ Add URI** and paste:
     ```
     http://localhost:3000/api/auth/callback/google
     ```
   - Click **Create**
6. A dialog will show your **Client ID** and **Client secret** — copy both into `.env.local`:
   ```
   GOOGLE_CLIENT_ID="..."
   GOOGLE_CLIENT_SECRET="..."
   ```
7. Restart the dev server (`Ctrl+C` then `npm run dev`)
8. Visit `/schedule` and click **Connect with Google**

## Useful commands

| Command | What it does |
|---|---|
| `npm run dev` | Start Next.js dev server on http://localhost:3000 |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript check |
| `npm run db:migrate` | Apply Prisma migrations |
| `npm run db:studio` | Visual DB browser at http://localhost:5555 |
| `npm run db:reset` | Drop and recreate the DB (destructive) |

## Project layout

```
Dashboard/
├── prisma/schema.prisma        Full data model (auth, gym, health, finance)
├── src/
│   ├── app/
│   │   ├── (auth)/             Login + register (no nav)
│   │   ├── (dashboard)/        All authenticated pages (top nav + main)
│   │   │   ├── page.tsx           Home — command center
│   │   │   ├── schedule/          Sprint 2
│   │   │   ├── gym/               Sprint 3
│   │   │   ├── health/            Sprint 4
│   │   │   └── finance/           Sprint 6
│   │   └── api/                Server routes
│   ├── components/
│   │   ├── ui/                 Reusable glass primitives (button, input, card)
│   │   ├── layout/             Top nav, mobile tab bar
│   │   └── dashboard/          Home widgets
│   ├── lib/
│   │   ├── prisma.ts           Prisma client singleton
│   │   ├── auth.ts             NextAuth config (Credentials + Google)
│   │   ├── google-calendar.ts  OAuth-aware Google Calendar client
│   │   └── utils.ts            cn(), formatters, streak calculator
│   └── middleware.ts           Protects all routes behind auth
└── README.md
```

## Design system

- **Background:** Deep black `#0A0A0A` with subtle emerald radial gradients
- **Cards:** `rgba(255,255,255,0.04)` glass with `backdrop-filter: blur(20px)`
- **Accent:** Emerald `#10B981` with soft glow
- **Motion:** Framer Motion entrance fades, hover glows, animated progress bars

## Next steps

The home page currently shows **placeholder data** for all widgets. Sprint 2 will replace the Schedule and To-Do widgets with live Google Calendar data once OAuth credentials are configured.

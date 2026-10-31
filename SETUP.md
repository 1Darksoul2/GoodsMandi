# GoodsMandi — Setup Guide

## Prerequisites
- Node.js 18+ installed
- A free Supabase account at [supabase.com](https://supabase.com)

---

## Step 1: Create a Supabase Project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) and create a new project
2. Choose a name (e.g., "goodsmandi") and set a database password
3. Select a region closest to your users (e.g., Mumbai for India)
4. Wait for the project to finish provisioning

---

## Step 2: Run Database Migrations

In your Supabase Dashboard, go to **SQL Editor** and run each file in `supabase/migrations/` **in order**, one at a time (paste the contents, click **Run**, wait for success):

1. `001_schema.sql` — tables, enums, triggers, RLS policies
2. `002_storage.sql` — storage buckets and their policies
3. `003_bid_attempts.sql` — bid revision counter
4. `004_bid_status_backup.sql` — adds the `backup` bid status (must run on its own, before 005)
5. `005_security_and_integrity.sql` — security hardening: locks admin/ban fields, enforces the college e-mail domain, validates bids, atomic winner selection, deal-only chat and ratings, image-only uploads

Already running an older copy of the app? Run only the files you have not run yet. `005` is safe to run again.

You can test all migrations locally before touching your project (needs Postgres 16 and `psql`):

```bash
DATABASE_URL=postgres://postgres:postgres@localhost/postgres supabase/tests/run.sh
```

---

## Step 3: Configure Authentication

1. In Supabase Dashboard, go to **Authentication > Providers**
2. Ensure **Email** provider is enabled
3. Go to **Authentication > URL Configuration**:
   - Set **Site URL** to `http://localhost:3000` (for development)
   - Add `http://localhost:3000/**` to **Redirect URLs** (covers e-mail confirmation and password reset, which both go through `/auth/callback`)

### Email Domain Restriction
Migration `005` adds a trigger on `auth.users` that rejects any e-mail not ending in `@stu.upes.ac.in`, so the rule holds even for requests that skip the signup form. Nothing to configure. To change the allowed domain, edit `public.enforce_college_email()` and `COLLEGE_DOMAIN` in `src/lib/constants.ts`.

### Password reset
The reset e-mail opens `/auth/callback?next=/reset-password`. Supabase uses a one-time code tied to the browser that requested the reset, so the link must be opened in that same browser.

---

## Step 4: Configure Storage

The migrations already created two storage buckets:
- `listing-photos` (public read, authenticated write)
- `profile-photos` (public read, authenticated write)

Both accept only JPEG, PNG, WebP and GIF images up to 5 MB (set by migration `005`).

Verify they exist by going to **Storage** in your Supabase Dashboard.

---

## Step 5: Get API Keys

1. Go to **Settings > API** in your Supabase Dashboard
2. Copy the **Project URL** and **anon public** key

---

## Step 6: Configure Environment Variables

1. Copy `.env.local.example` to `.env.local`:
   ```bash
   cp .env.local.example .env.local
   ```

2. Fill in your Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```

---

## Step 7: Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

---

## Step 8: Create an Admin User

1. Sign up through the app with your `@stu.upes.ac.in` email
2. Go to Supabase Dashboard > **Table Editor > profiles**
3. Find your user row and set `is_admin` to `true` (the dashboard can still change this column; the app's API cannot)
4. You can now access the admin dashboard at `/admin`

---

## Deployment to Vercel

1. Push this repo to GitHub
2. Import the repo in [Vercel](https://vercel.com)
3. Add the environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
4. Deploy!
5. Update your Supabase **Site URL** to your Vercel domain and add `https://<your-domain>/**` to **Redirect URLs**

---

## Tech Stack
- **Frontend**: Next.js 16.4 (App Router, TypeScript) + Tailwind CSS v3
- **Backend**: Supabase (Postgres, Auth, Storage, Realtime)
- **Hosting**: Vercel + Supabase Cloud

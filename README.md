# GoodsMandi
GoodsMandi — a campus-exclusive marketplace where students list items for sale and peers bid to buy, with silent bidding, seller-chosen winners, and offline exchange. Built with Next.js, Tailwind CSS, and Supabase for a single-college pilot at UPES.

## Getting Started

Full setup (Supabase project, migrations, auth settings, environment variables) is in [SETUP.md](SETUP.md). In short:

```bash
cp .env.local.example .env.local   # then fill in your Supabase URL and anon key
npm install
```

Then run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Checks

```bash
npm run lint
npx tsc --noEmit
supabase/tests/run.sh   # database policies and triggers; needs a local Postgres 16
```

CI runs all of these on every pull request (`.github/workflows/ci.yml`).

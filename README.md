# PocketAsset

PocketAsset is a private PKR personal-finance workspace built with Next.js, TypeScript, Tailwind CSS, Supabase, Recharts, and IndexedDB.

## Local setup

1. Use Node.js 20.9 or newer.
2. Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from your Supabase project.
3. Run the SQL files in `supabase/migrations` in filename order in the Supabase SQL editor.
4. Run `npm install`, then `npm run dev`.
5. Open `http://localhost:3000` and create an account.

The database migration enables row-level security on each exposed finance table and grants access only to authenticated users with matching `user_id` values. Never put a Supabase secret or service-role key in a `NEXT_PUBLIC_` variable.

## Available checks

- `npm test` — financial ledger calculation tests.
- `npm run lint` — ESLint.
- `npm run typecheck` — strict TypeScript check.
- `npm run build` — production build.

## Current implementation phase

The overview dashboard, daily money tracker, central Transactions manager, and Income Manager are implemented. Additional product modules are being added one at a time against the shared ledger.

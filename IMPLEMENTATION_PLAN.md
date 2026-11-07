# PocketAsset implementation plan

The repository is empty, so the project will be established from the product specification.

## Phase 1 — Foundation and overview dashboard — verified

- Create a strict TypeScript Next.js App Router application with Tailwind, responsive navigation, Supabase Auth, and a PostgreSQL schema protected by row-level security.
- Define accounts and ledger transactions first. Store PKR amounts as integer paisa; derive balances and dashboard totals from the ledger so transfers and opening balances are not counted as income or expenses.
- Build the overview dashboard from authenticated database records, with genuine empty states, date controls, account balances, weekly/monthly summaries, and quick transaction entry.
- Keep transaction drafts in IndexedDB for offline entry and use stable client-generated IDs to make sync idempotent.
- Verified: 7 financial calculation tests pass; ESLint, strict TypeScript, and production build pass. The local app route, manifest, and service worker respond successfully.

## Phase 2 — Daily money tracker — verified

- Add a seven-day view, account-level opening and closing balances, receipts, purchases, transfer distinction, and end-of-day summary.
- Add day close markers that allow later corrections, plus transaction correction and deletion audit records.
- Verify carry-forward, zero-income days, transfer neutrality, correction behavior, PKT date boundaries, and Monday-to-Sunday week boundaries before moving on.
- Verified: 8 financial calculation tests pass; ESLint and strict TypeScript pass. Supabase metadata writes require the included migration and a configured Supabase project.

## Phase 3 — Transactions manager — verified

- Add the central ledger view with search, date/account/category/type filters, newest/oldest sort, 25-row pagination, details, audited correction/removal, and filtered CSV export.
- Support all eight ledger transaction types from the manager.
- Verified: 10 unit tests pass, including date-range and transfer-account filtering; ESLint, strict TypeScript, and production build pass.

## Phase 4 — Income manager — verified

- Build actual income reporting plus a configurable allowance schedule. Expected allowance is planning metadata only and never creates a transaction or changes a balance.
- Include Monday-to-Sunday actual-versus-expected comparisons, holiday-aware schedules, missed/additional allowance calculations, and monthly source/zero-income reporting.
- Verified: 13 unit tests pass; ESLint, strict TypeScript, and production build pass. Allowance schedule persistence requires the included migration and a configured Supabase project.

## Phase 5 — Expense manager

- Add expense classification and actual-spend reporting, with trend signals based on the user's recorded ledger.

## Remaining modules

After Phase 1 is verified, implement the remaining pages as separate phases in the specification's order. Each phase should use the shared ledger and database model, include empty/loading/error states, and be verified before starting the next phase.

## External setup

The project can include environment templates and SQL migrations, but it cannot connect to Supabase until a project URL and publishable/anon key are supplied in local environment variables and the migration is applied.

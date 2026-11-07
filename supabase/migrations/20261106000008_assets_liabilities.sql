create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 120),
  asset_type text not null check (asset_type in ('electronics', 'jewelry', 'vehicle', 'real_estate', 'valuable_possession', 'other')),
  purchase_date date,
  purchase_cost_paisa bigint not null default 0 check (purchase_cost_paisa >= 0),
  current_estimated_value_paisa bigint not null check (current_estimated_value_paisa >= 0),
  ownership text default 'Sole owner',
  notes text check (notes is null or length(notes) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.liabilities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 120),
  liability_type text not null check (liability_type in ('borrowed_money', 'outstanding_payment', 'personal_loan', 'family_debt', 'other')),
  principal_amount_paisa bigint not null check (principal_amount_paisa > 0),
  remaining_balance_paisa bigint not null check (remaining_balance_paisa >= 0),
  owed_to text not null check (length(trim(owed_to)) between 1 and 100),
  due_date date,
  notes text check (notes is null or length(notes) <= 1000),
  is_settled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.assets enable row level security;
alter table public.liabilities enable row level security;

revoke all on public.assets, public.liabilities from anon, authenticated;
grant select, insert, update, delete on public.assets to authenticated;
grant select, insert, update, delete on public.liabilities to authenticated;

drop policy if exists assets_own on public.assets;
create policy assets_own on public.assets for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists liabilities_own on public.liabilities;
create policy liabilities_own on public.liabilities for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);


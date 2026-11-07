create table if not exists public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 120),
  target_amount_paisa bigint not null check (target_amount_paisa > 0),
  current_saved_paisa bigint not null default 0 check (current_saved_paisa >= 0),
  target_date date,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  status text not null default 'active' check (status in ('active', 'paused', 'completed')),
  category text not null default 'custom' check (category in ('emergency_fund', 'university', 'laptop', 'education', 'personal', 'investments', 'custom')),
  notes text check (notes is null or length(notes) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.savings_allocations (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.savings_goals(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  source_account_id uuid references public.accounts(id) on delete set null,
  amount_paisa bigint not null check (amount_paisa > 0),
  direction text not null check (direction in ('allocated', 'withdrawn')),
  notes text check (notes is null or length(notes) <= 500),
  created_at timestamptz not null default now()
);

alter table public.savings_goals enable row level security;
alter table public.savings_allocations enable row level security;

revoke all on public.savings_goals, public.savings_allocations from anon, authenticated;
grant select, insert, update, delete on public.savings_goals to authenticated;
grant select, insert, update, delete on public.savings_allocations to authenticated;

drop policy if exists savings_goals_own on public.savings_goals;
create policy savings_goals_own on public.savings_goals for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists savings_allocations_own on public.savings_allocations;
create policy savings_allocations_own on public.savings_allocations for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);


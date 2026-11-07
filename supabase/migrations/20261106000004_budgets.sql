create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 120),
  budget_type text not null check (budget_type in ('daily', 'weekly', 'monthly', 'category', 'university', 'household', 'shopping')),
  category text,
  amount_paisa bigint not null check (amount_paisa > 0),
  start_date date not null,
  end_date date,
  warning_thresholds smallint[] not null default array[50, 75, 90, 100]::smallint[],
  is_paused boolean not null default false,
  notes text check (notes is null or length(notes) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date is null or end_date >= start_date)
);

create index if not exists budgets_user_active_idx on public.budgets (user_id, start_date, end_date) where not is_paused;

alter table public.budgets enable row level security;
revoke all on public.budgets from anon, authenticated;
grant select, insert, update, delete on public.budgets to authenticated;

drop policy if exists budgets_select_own on public.budgets;
create policy budgets_select_own on public.budgets for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists budgets_insert_own on public.budgets;
create policy budgets_insert_own on public.budgets for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists budgets_update_own on public.budgets;
create policy budgets_update_own on public.budgets for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists budgets_delete_own on public.budgets;
create policy budgets_delete_own on public.budgets for delete to authenticated
  using ((select auth.uid()) = user_id);


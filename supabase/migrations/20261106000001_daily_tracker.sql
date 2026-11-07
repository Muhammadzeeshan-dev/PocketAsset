create table if not exists public.day_closures (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date date not null,
  opening_balance_paisa bigint not null,
  received_paisa bigint not null default 0 check (received_paisa >= 0),
  other_inflows_paisa bigint not null default 0 check (other_inflows_paisa >= 0),
  expenses_paisa bigint not null default 0 check (expenses_paisa >= 0),
  investment_purchases_paisa bigint not null default 0 check (investment_purchases_paisa >= 0),
  adjustments_paisa bigint not null default 0,
  closing_balance_paisa bigint not null,
  transaction_count integer not null default 0 check (transaction_count >= 0),
  closed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);

create table if not exists public.calendar_days (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date date not null,
  is_university_day boolean not null default false,
  is_holiday boolean not null default false,
  label text check (label is null or length(label) <= 100),
  notes text check (notes is null or length(notes) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);

create index if not exists calendar_days_user_date_idx on public.calendar_days (user_id, date);
create index if not exists day_closures_user_date_idx on public.day_closures (user_id, date desc);

alter table public.day_closures enable row level security;
alter table public.calendar_days enable row level security;
revoke all on public.day_closures, public.calendar_days from anon, authenticated;
grant select, insert, update on public.day_closures to authenticated;
grant select, insert, update, delete on public.calendar_days to authenticated;

drop policy if exists day_closures_select_own on public.day_closures;
create policy day_closures_select_own on public.day_closures for select to authenticated
  using ((select auth.uid()) = user_id);
drop policy if exists day_closures_insert_own on public.day_closures;
create policy day_closures_insert_own on public.day_closures for insert to authenticated
  with check ((select auth.uid()) = user_id);
drop policy if exists day_closures_update_own on public.day_closures;
create policy day_closures_update_own on public.day_closures for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists calendar_days_select_own on public.calendar_days;
create policy calendar_days_select_own on public.calendar_days for select to authenticated
  using ((select auth.uid()) = user_id);
drop policy if exists calendar_days_insert_own on public.calendar_days;
create policy calendar_days_insert_own on public.calendar_days for insert to authenticated
  with check ((select auth.uid()) = user_id);
drop policy if exists calendar_days_update_own on public.calendar_days;
create policy calendar_days_update_own on public.calendar_days for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
drop policy if exists calendar_days_delete_own on public.calendar_days;
create policy calendar_days_delete_own on public.calendar_days for delete to authenticated
  using ((select auth.uid()) = user_id);

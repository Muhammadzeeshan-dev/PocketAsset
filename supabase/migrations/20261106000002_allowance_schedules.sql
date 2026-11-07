create table if not exists public.allowance_schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  expected_amount_paisa bigint not null default 0 check (expected_amount_paisa >= 0),
  expected_weekdays smallint[] not null default array[1, 2, 3, 4, 5]::smallint[]
    check (expected_weekdays <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[]),
  start_date date not null,
  end_date date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date is null or end_date >= start_date),
  unique (user_id)
);

alter table public.allowance_schedules enable row level security;
revoke all on public.allowance_schedules from anon, authenticated;
grant select, insert, update, delete on public.allowance_schedules to authenticated;

drop policy if exists allowance_schedules_select_own on public.allowance_schedules;
create policy allowance_schedules_select_own on public.allowance_schedules for select to authenticated
  using ((select auth.uid()) = user_id);
drop policy if exists allowance_schedules_insert_own on public.allowance_schedules;
create policy allowance_schedules_insert_own on public.allowance_schedules for insert to authenticated
  with check ((select auth.uid()) = user_id);
drop policy if exists allowance_schedules_update_own on public.allowance_schedules;
create policy allowance_schedules_update_own on public.allowance_schedules for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
drop policy if exists allowance_schedules_delete_own on public.allowance_schedules;
create policy allowance_schedules_delete_own on public.allowance_schedules for delete to authenticated
  using ((select auth.uid()) = user_id);

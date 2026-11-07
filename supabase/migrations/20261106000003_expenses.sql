create table if not exists public.recurring_expense_schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete restrict,
  description text not null check (length(description) between 1 and 160),
  category text,
  amount_paisa bigint not null check (amount_paisa > 0),
  expense_classification text not null default 'essential'
    check (expense_classification in ('essential', 'non_essential', 'occasional', 'emergency', 'optional')),
  quantity numeric(12, 3) check (quantity is null or quantity > 0),
  interval_unit text not null check (interval_unit in ('weekly', 'monthly')),
  interval_count smallint not null default 1 check (interval_count between 1 and 12),
  next_due_date date not null,
  end_date date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date is null or end_date >= next_due_date)
);

alter table public.transactions add column if not exists expense_classification text;
alter table public.transactions add column if not exists quantity numeric(12, 3);
alter table public.transactions add column if not exists recurring_expense_id uuid references public.recurring_expense_schedules(id) on delete set null;
alter table public.transactions add column if not exists recurring_occurrence_date date;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'transactions_expense_classification_check') then
    alter table public.transactions add constraint transactions_expense_classification_check
      check (expense_classification is null or expense_classification in ('essential', 'non_essential', 'occasional', 'emergency', 'optional'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'transactions_quantity_check') then
    alter table public.transactions add constraint transactions_quantity_check check (quantity is null or quantity > 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'transactions_recurring_occurrence_pair_check') then
    alter table public.transactions add constraint transactions_recurring_occurrence_pair_check
      check ((recurring_expense_id is null) = (recurring_occurrence_date is null));
  end if;
end;
$$;

create unique index if not exists transactions_recurring_occurrence_unique
  on public.transactions (recurring_expense_id, recurring_occurrence_date)
  where recurring_expense_id is not null and recurring_occurrence_date is not null;

create index if not exists recurring_expense_schedules_user_due_idx
  on public.recurring_expense_schedules (user_id, next_due_date) where active;

create or replace function public.enforce_recurring_expense_account_ownership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.accounts
    where id = new.account_id and user_id = new.user_id
  ) then
    raise exception 'Recurring expense account must belong to the same user';
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_recurring_expense_account_ownership() from public, anon, authenticated;
drop trigger if exists recurring_expense_account_owner on public.recurring_expense_schedules;
create trigger recurring_expense_account_owner
before insert or update of account_id, user_id on public.recurring_expense_schedules
for each row execute function public.enforce_recurring_expense_account_ownership();

alter table public.recurring_expense_schedules enable row level security;
revoke all on public.recurring_expense_schedules from anon, authenticated;
grant select, insert, update, delete on public.recurring_expense_schedules to authenticated;

drop policy if exists recurring_expense_select_own on public.recurring_expense_schedules;
create policy recurring_expense_select_own on public.recurring_expense_schedules for select to authenticated
  using ((select auth.uid()) = user_id);
drop policy if exists recurring_expense_insert_own on public.recurring_expense_schedules;
create policy recurring_expense_insert_own on public.recurring_expense_schedules for insert to authenticated
  with check ((select auth.uid()) = user_id);
drop policy if exists recurring_expense_update_own on public.recurring_expense_schedules;
create policy recurring_expense_update_own on public.recurring_expense_schedules for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
drop policy if exists recurring_expense_delete_own on public.recurring_expense_schedules;
create policy recurring_expense_delete_own on public.recurring_expense_schedules for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ===============================================================
-- Migration: 20261106000000_core_ledger.sql
-- ===============================================================
create extension if not exists pgcrypto;

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 80),
  account_type text not null check (account_type in ('cash', 'wallet', 'bank', 'savings', 'brokerage_cash', 'custom')),
  opening_balance_paisa bigint not null default 0 check (opening_balance_paisa >= 0),
  currency char(3) not null default 'PKR' check (currency = 'PKR'),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete restrict,
  transfer_to_account_id uuid references public.accounts(id) on delete restrict,
  transaction_type text not null check (transaction_type in (
    'income', 'expense', 'transfer', 'refund', 'investment_purchase',
    'investment_sale', 'dividend', 'adjustment'
  )),
  amount_paisa bigint not null check (amount_paisa > 0),
  direction text not null default 'outflow' check (direction in ('inflow', 'outflow')),
  category text check (category is null or length(category) <= 80),
  description text not null check (length(trim(description)) between 1 and 160),
  notes text check (notes is null or length(notes) <= 2000),
  occurred_at timestamptz not null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint transactions_transfer_shape check (
    (transaction_type = 'transfer' and transfer_to_account_id is not null and transfer_to_account_id <> account_id)
    or (transaction_type <> 'transfer' and transfer_to_account_id is null)
  ),
  constraint transactions_direction_shape check (
    transaction_type = 'adjustment'
    or (transaction_type in ('income', 'refund', 'investment_sale', 'dividend') and direction = 'inflow')
    or (transaction_type in ('expense', 'investment_purchase', 'transfer') and direction = 'outflow')
  )
);

create index if not exists transactions_user_occurred_idx
  on public.transactions (user_id, occurred_at desc)
  where deleted_at is null;
create index if not exists transactions_user_account_idx
  on public.transactions (user_id, account_id)
  where deleted_at is null;

create table if not exists public.transaction_audit (
  id bigint generated always as identity primary key,
  transaction_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  changed_by uuid,
  operation text not null check (operation in ('UPDATE', 'DELETE')),
  before_data jsonb,
  after_data jsonb,
  changed_at timestamptz not null default now()
);

create or replace function public.enforce_transaction_account_ownership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  source_owner uuid;
  destination_owner uuid;
begin
  select a.user_id into source_owner
  from public.accounts as a
  where a.id = new.account_id;

  if source_owner is distinct from new.user_id then
    raise exception 'The selected account does not belong to this user.' using errcode = '23514';
  end if;

  if new.transaction_type = 'transfer' then
    select a.user_id into destination_owner
    from public.accounts as a
    where a.id = new.transfer_to_account_id;

    if destination_owner is distinct from new.user_id then
      raise exception 'The transfer destination does not belong to this user.' using errcode = '23514';
    end if;
  end if;

  if tg_op = 'UPDATE' and new.user_id is distinct from old.user_id then
    raise exception 'Transaction ownership cannot be changed.' using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_transaction_account_ownership() from public, anon, authenticated;
drop trigger if exists transactions_check_account_owner on public.transactions;
create trigger transactions_check_account_owner
before insert or update on public.transactions
for each row execute function public.enforce_transaction_account_ownership();

create or replace function public.audit_financial_transaction_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.transaction_audit (
    transaction_id, user_id, changed_by, operation, before_data, after_data
  ) values (
    coalesce(new.id, old.id),
    coalesce(new.user_id, old.user_id),
    auth.uid(),
    tg_op,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end
  );
  return coalesce(new, old);
end;
$$;

revoke all on function public.audit_financial_transaction_mutation() from public, anon, authenticated;
drop trigger if exists transactions_audit on public.transactions;
create trigger transactions_audit
after update or delete on public.transactions
for each row execute function public.audit_financial_transaction_mutation();

alter table public.accounts enable row level security;
alter table public.transactions enable row level security;
alter table public.transaction_audit enable row level security;

revoke all on public.accounts, public.transactions, public.transaction_audit from anon, authenticated;
grant select, insert, update, delete on public.accounts, public.transactions to authenticated;
grant select on public.transaction_audit to authenticated;

drop policy if exists accounts_select_own on public.accounts;
create policy accounts_select_own on public.accounts for select to authenticated
  using ((select auth.uid()) = user_id);
drop policy if exists accounts_insert_own on public.accounts;
create policy accounts_insert_own on public.accounts for insert to authenticated
  with check ((select auth.uid()) = user_id);
drop policy if exists accounts_update_own on public.accounts;
create policy accounts_update_own on public.accounts for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
drop policy if exists accounts_delete_own on public.accounts;
create policy accounts_delete_own on public.accounts for delete to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists transactions_select_own on public.transactions;
create policy transactions_select_own on public.transactions for select to authenticated
  using ((select auth.uid()) = user_id);
drop policy if exists transactions_insert_own on public.transactions;
create policy transactions_insert_own on public.transactions for insert to authenticated
  with check ((select auth.uid()) = user_id);
drop policy if exists transactions_update_own on public.transactions;
create policy transactions_update_own on public.transactions for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
drop policy if exists transactions_delete_own on public.transactions;
create policy transactions_delete_own on public.transactions for delete to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists audit_select_own on public.transaction_audit;
create policy audit_select_own on public.transaction_audit for select to authenticated
  using ((select auth.uid()) = user_id);

create or replace view public.account_balances
with (security_invoker = true)
as
with ledger_effects as (
  select
    t.user_id,
    t.account_id,
    case
      when t.transaction_type in ('income', 'refund', 'investment_sale', 'dividend') then t.amount_paisa
      when t.transaction_type in ('expense', 'investment_purchase') then -t.amount_paisa
      when t.transaction_type = 'adjustment' and t.direction = 'inflow' then t.amount_paisa
      when t.transaction_type = 'adjustment' then -t.amount_paisa
      else 0
    end as effect_paisa
  from public.transactions as t
  where t.deleted_at is null and t.transaction_type <> 'transfer'

  union all

  select t.user_id, t.account_id, -t.amount_paisa as effect_paisa
  from public.transactions as t
  where t.deleted_at is null and t.transaction_type = 'transfer'

  union all

  select t.user_id, t.transfer_to_account_id as account_id, t.amount_paisa as effect_paisa
  from public.transactions as t
  where t.deleted_at is null and t.transaction_type = 'transfer'
)
select
  a.id,
  a.user_id,
  a.name,
  a.account_type,
  a.opening_balance_paisa,
  a.currency,
  a.is_active,
  a.created_at,
  a.updated_at,
  a.opening_balance_paisa + coalesce(sum(le.effect_paisa), 0)::bigint as current_balance_paisa
from public.accounts as a
left join ledger_effects as le on le.user_id = a.user_id and le.account_id = a.id
group by a.id;

revoke all on public.account_balances from anon, authenticated;
grant select on public.account_balances to authenticated;



-- ===============================================================
-- Migration: 20261106000001_daily_tracker.sql
-- ===============================================================
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



-- ===============================================================
-- Migration: 20261106000002_allowance_schedules.sql
-- ===============================================================
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



-- ===============================================================
-- Migration: 20261106000003_expenses.sql
-- ===============================================================
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



-- ===============================================================
-- Migration: 20261106000004_budgets.sql
-- ===============================================================
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




-- ===============================================================
-- Migration: 20261106000005_household_inventory.sql
-- ===============================================================
create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 120),
  category text not null check (category in (
    'stationery', 'personal_care', 'perfume', 'clothing', 'shoes',
    'food_supplies', 'cleaning_supplies', 'household_products', 'electronics', 'other'
  )),
  current_quantity numeric(12, 3) not null default 0 check (current_quantity >= 0),
  unit text not null default 'units' check (length(unit) between 1 and 30),
  minimum_quantity numeric(12, 3) not null default 1 check (minimum_quantity >= 0),
  purchase_price_paisa bigint not null default 0 check (purchase_price_paisa >= 0),
  last_purchase_date date,
  location text check (location is null or length(location) <= 100),
  notes text check (notes is null or length(notes) <= 1000),
  expiry_date date,
  status text not null default 'available' check (status in ('available', 'running_low', 'out_of_stock', 'shopping_required', 'discontinued')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inventory_usage_logs (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.inventory_items(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  quantity_used numeric(12, 3) not null check (quantity_used > 0),
  notes text check (notes is null or length(notes) <= 500),
  used_at timestamptz not null default now()
);

create table if not exists public.shopping_list_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  inventory_item_id uuid references public.inventory_items(id) on delete set null,
  item_name text not null check (length(trim(item_name)) between 1 and 120),
  quantity numeric(12, 3) not null default 1 check (quantity > 0),
  unit text not null default 'units',
  estimated_price_paisa bigint not null default 0 check (estimated_price_paisa >= 0),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  is_purchased boolean not null default false,
  notes text check (notes is null or length(notes) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists inventory_items_user_cat_idx on public.inventory_items (user_id, category);
create index if not exists shopping_list_user_status_idx on public.shopping_list_items (user_id, is_purchased);

alter table public.inventory_items enable row level security;
alter table public.inventory_usage_logs enable row level security;
alter table public.shopping_list_items enable row level security;

revoke all on public.inventory_items, public.inventory_usage_logs, public.shopping_list_items from anon, authenticated;
grant select, insert, update, delete on public.inventory_items to authenticated;
grant select, insert, update, delete on public.inventory_usage_logs to authenticated;
grant select, insert, update, delete on public.shopping_list_items to authenticated;

drop policy if exists inventory_items_own on public.inventory_items;
create policy inventory_items_own on public.inventory_items for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists inventory_usage_logs_own on public.inventory_usage_logs;
create policy inventory_usage_logs_own on public.inventory_usage_logs for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists shopping_list_items_own on public.shopping_list_items;
create policy shopping_list_items_own on public.shopping_list_items for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);




-- ===============================================================
-- Migration: 20261106000006_savings_goals.sql
-- ===============================================================
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




-- ===============================================================
-- Migration: 20261106000007_investments_portfolio.sql
-- ===============================================================
create table if not exists public.stock_holdings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  symbol text not null check (length(trim(symbol)) between 1 and 20),
  company_name text not null check (length(trim(company_name)) between 1 and 120),
  shares_quantity numeric(12, 4) not null default 0 check (shares_quantity >= 0),
  average_buy_price_paisa bigint not null default 0 check (average_buy_price_paisa >= 0),
  current_market_price_paisa bigint not null default 0 check (current_market_price_paisa >= 0),
  last_price_updated_at timestamptz default now(),
  price_source text default 'Manual entry (verified)',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, symbol)
);

create table if not exists public.stock_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  holding_id uuid references public.stock_holdings(id) on delete set null,
  symbol text not null check (length(trim(symbol)) between 1 and 20),
  transaction_type text not null check (transaction_type in ('buy', 'sell', 'dividend')),
  shares_quantity numeric(12, 4) not null default 0 check (shares_quantity >= 0),
  price_per_share_paisa bigint not null default 0 check (price_per_share_paisa >= 0),
  total_amount_paisa bigint not null check (total_amount_paisa >= 0),
  brokerage_fees_paisa bigint not null default 0 check (brokerage_fees_paisa >= 0),
  taxes_paisa bigint not null default 0 check (taxes_paisa >= 0),
  settlement_account_id uuid references public.accounts(id) on delete set null,
  trade_date date not null,
  notes text check (notes is null or length(notes) <= 1000),
  created_at timestamptz not null default now()
);

alter table public.stock_holdings enable row level security;
alter table public.stock_transactions enable row level security;

revoke all on public.stock_holdings, public.stock_transactions from anon, authenticated;
grant select, insert, update, delete on public.stock_holdings to authenticated;
grant select, insert, update, delete on public.stock_transactions to authenticated;

drop policy if exists stock_holdings_own on public.stock_holdings;
create policy stock_holdings_own on public.stock_holdings for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists stock_transactions_own on public.stock_transactions;
create policy stock_transactions_own on public.stock_transactions for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);




-- ===============================================================
-- Migration: 20261106000008_assets_liabilities.sql
-- ===============================================================
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




-- ===============================================================
-- Migration: 20261106000009_user_settings.sql
-- ===============================================================
create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (display_name is null or length(display_name) <= 80),
  currency text not null default 'PKR' check (currency = 'PKR'),
  theme text not null default 'light' check (theme in ('light', 'dark', 'system')),
  daily_spending_limit_paisa bigint default 0 check (daily_spending_limit_paisa >= 0),
  enable_offline_mode boolean not null default true,
  enable_ai_assistant boolean not null default true,
  custom_categories jsonb default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;

revoke all on public.user_settings from anon, authenticated;
grant select, insert, update on public.user_settings to authenticated;

drop policy if exists user_settings_own on public.user_settings;
create policy user_settings_own on public.user_settings for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);




-- ===============================================================
-- Migration: 20261106000010_initial_real_data.sql
-- ===============================================================
-- PocketAsset Initial Real Financial Data (Starting Date: November 6, 2026)
-- Single-user private ledger opening balances & PSX holdings

create or replace function public.initialize_owner_real_data(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  cash_acc_id uuid;
  jazz_acc_id uuid;
  easy_acc_id uuid;
begin
  -- 1. Insert Verified Opening Accounts (Starting Date: November 6, 2026)
  -- Cash: PKR 7,620 | JazzCash: PKR 10 | Easypaisa: PKR 1,599 | Total: PKR 9,229
  insert into public.accounts (id, user_id, name, account_type, opening_balance_paisa, currency, is_active)
  values
    (gen_random_uuid(), target_user_id, 'Cash in hand', 'cash', 762000, 'PKR', true),
    (gen_random_uuid(), target_user_id, 'JazzCash', 'wallet', 1000, 'PKR', true),
    (gen_random_uuid(), target_user_id, 'Easypaisa', 'wallet', 159900, 'PKR', true),
    (gen_random_uuid(), target_user_id, 'Bank Account', 'bank', 0, 'PKR', true),
    (gen_random_uuid(), target_user_id, 'Savings Account', 'savings', 0, 'PKR', true),
    (gen_random_uuid(), target_user_id, 'Brokerage Cash Balance', 'brokerage_cash', 0, 'PKR', true)
  on conflict do nothing;

  -- 2. Insert Verified Historical PSX Holdings (November 6, 2026 Snapshot)
  -- Total Cost: PKR 16,148.63 | Market Value: PKR 17,404.26 | Unrealized Profit: PKR 1,255.63
  insert into public.stock_holdings (
    id, user_id, symbol, company_name, shares_quantity, average_buy_price_paisa,
    current_market_price_paisa, last_price_updated_at, price_source, notes
  )
  values
    (
      gen_random_uuid(), target_user_id, 'FFC', 'Fauji Fertilizer Company Limited',
      6, 52562, 56281, '2026-11-06 12:00:00+05', 'Verified PSX Statement (2026-11-06)', 'Cost: Rs. 3,153.72 | Snapshot: Rs. 3,376.86'
    ),
    (
      gen_random_uuid(), target_user_id, 'LUCK', 'Lucky Cement Limited',
      13, 39444, 42730, '2026-11-06 12:00:00+05', 'Verified PSX Statement (2026-11-06)', 'Cost: Rs. 5,127.72 | Snapshot: Rs. 5,554.90'
    ),
    (
      gen_random_uuid(), target_user_id, 'MEBL', 'Meezan Bank Limited',
      8, 48506, 54930, '2026-11-06 12:00:00+05', 'Verified PSX Statement (2026-11-06)', 'Cost: Rs. 3,880.48 | Snapshot: Rs. 4,394.40'
    ),
    (
      gen_random_uuid(), target_user_id, 'OGDC', 'Oil & Gas Development Company Limited',
      13, 30667, 31370, '2026-11-06 12:00:00+05', 'Verified PSX Statement (2026-11-06)', 'Cost: Rs. 3,986.71 | Snapshot: Rs. 4,078.10'
    )
  on conflict (user_id, symbol) do nothing;
end;
$$;




-- ===============================================================
-- Migration: 20261106000011_phase2_security_auth.sql
-- ===============================================================
-- POCKETASSET PHASE 2: SECURE AUTHENTICATION, ADMIN PANEL, OTP & ACTIVITY MONITORING
-- Migration: 20261106000011_phase2_security_auth.sql
-- Description: Security tables, immutable audit logs, session records, admin OTP challenges, security notifications, RLS

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- 2. Authorized Admins Table (Server allowlist & DB record)
CREATE TABLE IF NOT EXISTS public.authorized_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  added_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

ALTER TABLE public.authorized_admins ENABLE ROW LEVEL SECURITY;

-- Only authenticated users can verify if their own email is an authorized admin
CREATE POLICY "Admins can check own authorization"
  ON public.authorized_admins FOR SELECT
  TO authenticated
  USING (lower(email) = lower(auth.jwt() ->> 'email'));

-- Seed default authorized admin (Private single-owner)
INSERT INTO public.authorized_admins (email, is_active)
VALUES ('zeeshan@pocketasset.pk', true)
ON CONFLICT (email) DO NOTHING;

-- 3. Login Audit Logs Table (Immutable audit trail)
CREATE TABLE IF NOT EXISTS public.login_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT NOT NULL,
  session_id TEXT,
  server_timestamp TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  client_timezone TEXT,
  device_type TEXT NOT NULL DEFAULT 'Desktop',
  browser TEXT,
  operating_system TEXT,
  ip_address TEXT,
  approx_location TEXT DEFAULT 'Location unavailable',
  login_method TEXT NOT NULL DEFAULT 'password',
  status TEXT NOT NULL DEFAULT 'success',
  failure_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_login_audit_user_id ON public.login_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_login_audit_server_timestamp ON public.login_audit_logs(server_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_login_audit_status ON public.login_audit_logs(status);

ALTER TABLE public.login_audit_logs ENABLE ROW LEVEL SECURITY;

-- Owner can read their own login audit logs
CREATE POLICY "Users can view own login logs"
  ON public.login_audit_logs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR lower(user_email) = lower(auth.jwt() ->> 'email'));

-- Authenticated users or server can insert login logs
CREATE POLICY "Users can insert own login logs"
  ON public.login_audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- Immutable: No client update or delete
-- (Service role key or superuser bypasses RLS for maintenance)

-- 4. Session Records Table (Active & Revoked Sessions)
CREATE TABLE IF NOT EXISTS public.session_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  device_type TEXT NOT NULL DEFAULT 'Desktop',
  browser TEXT,
  operating_system TEXT,
  approx_location TEXT DEFAULT 'Location unavailable',
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  expires_at TIMESTAMPTZ NOT NULL,
  is_revoked BOOLEAN NOT NULL DEFAULT false,
  revoked_at TIMESTAMPTZ,
  revoked_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_session_records_user ON public.session_records(user_id);
CREATE INDEX IF NOT EXISTS idx_session_records_session_id ON public.session_records(session_id);
CREATE INDEX IF NOT EXISTS idx_session_records_is_revoked ON public.session_records(is_revoked);

ALTER TABLE public.session_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions"
  ON public.session_records FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own sessions (e.g. revoke)"
  ON public.session_records FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can insert own sessions"
  ON public.session_records FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 5. Page Activity Logs Table (Navigation Events Only - Privacy Preserved)
CREATE TABLE IF NOT EXISTS public.page_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT,
  page_name TEXT NOT NULL,
  route TEXT NOT NULL,
  visited_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  duration_seconds INTEGER DEFAULT 0,
  device_type TEXT DEFAULT 'Desktop',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_page_activity_user ON public.page_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_page_activity_visited_at ON public.page_activity_logs(visited_at DESC);

ALTER TABLE public.page_activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own page activity"
  ON public.page_activity_logs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own page activity"
  ON public.page_activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 6. Admin OTP Challenges Table (Hashed OTP, Expiry, Rate Limit)
CREATE TABLE IF NOT EXISTS public.admin_otp_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  admin_email TEXT NOT NULL,
  otp_hash TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  expires_at TIMESTAMPTZ NOT NULL,
  is_used BOOLEAN NOT NULL DEFAULT false,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_admin_otp_user_id ON public.admin_otp_challenges(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_otp_expires_at ON public.admin_otp_challenges(expires_at);

ALTER TABLE public.admin_otp_challenges ENABLE ROW LEVEL SECURITY;

-- Client roles (anon and authenticated) CANNOT read, insert, update or delete OTP challenges directly!
-- This table is strictly server-side access only via server action/API with service role key or internal procedures.

-- 7. Security Notifications Table
CREATE TABLE IF NOT EXISTS public.security_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL, -- 'login', 'new_device', 'admin_otp', 'session_revocation', 'security_alert'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_security_notifications_user ON public.security_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_security_notifications_read ON public.security_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_security_notifications_created_at ON public.security_notifications(created_at DESC);

ALTER TABLE public.security_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON public.security_notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications (mark read)"
  ON public.security_notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can insert own notifications"
  ON public.security_notifications FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 8. Security Settings Table
CREATE TABLE IF NOT EXISTS public.security_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  otp_expiry_minutes INTEGER NOT NULL DEFAULT 5,
  session_timeout_hours INTEGER NOT NULL DEFAULT 24,
  admin_session_timeout_minutes INTEGER NOT NULL DEFAULT 30,
  notify_new_device BOOLEAN NOT NULL DEFAULT true,
  notify_failed_login BOOLEAN NOT NULL DEFAULT true,
  notify_admin_otp BOOLEAN NOT NULL DEFAULT true,
  failed_login_threshold INTEGER NOT NULL DEFAULT 5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

ALTER TABLE public.security_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own security settings"
  ON public.security_settings FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own security settings"
  ON public.security_settings FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can insert own security settings"
  ON public.security_settings FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());




-- ===============================================================
-- Migration: 20261106000012_phase2_security_hardening.sql
-- ===============================================================
-- POCKETASSET PHASE 2: SECURITY HARDENING & AUDIT MIGRATION
-- Migration: 20261106000012_phase2_security_hardening.sql
-- Description: Closes RLS spoofing vectors, enforces audit log authenticity, creates composite indexes for session revocation

-- 1. Tighten Login Audit Log Insertion RLS
-- Prevent authenticated users from inserting audit logs claiming user_id is NULL or spoofing other emails
DROP POLICY IF EXISTS "Users can insert own login logs" ON public.login_audit_logs;

CREATE POLICY "Users can insert own login logs strictly"
  ON public.login_audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    lower(user_email) = lower(auth.jwt() ->> 'email')
  );

-- 2. Ensure session revocation index exists for rapid revocation checks
CREATE INDEX IF NOT EXISTS idx_session_records_lookup
  ON public.session_records(session_id, is_revoked);

-- 3. Verify admin_otp_challenges remains strictly server-side
-- Default deny for anon & authenticated roles is preserved (no client policies)
ALTER TABLE public.admin_otp_challenges ENABLE ROW LEVEL SECURITY;

-- 4. Ensure Immutable Audit Logs Trigger
-- Create a trigger that prevents updates or deletes even if an authenticated user attempts it
CREATE OR REPLACE FUNCTION public.prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit logs are immutable and cannot be updated or deleted.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_immutable_login_audit ON public.login_audit_logs;
CREATE TRIGGER trg_immutable_login_audit
  BEFORE UPDATE OR DELETE ON public.login_audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_audit_log_modification();

DROP TRIGGER IF EXISTS trg_immutable_page_activity ON public.page_activity_logs;
CREATE TRIGGER trg_immutable_page_activity
  BEFORE UPDATE OR DELETE ON public.page_activity_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_audit_log_modification();





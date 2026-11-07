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

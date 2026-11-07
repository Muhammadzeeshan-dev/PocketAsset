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


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


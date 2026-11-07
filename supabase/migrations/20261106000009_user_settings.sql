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


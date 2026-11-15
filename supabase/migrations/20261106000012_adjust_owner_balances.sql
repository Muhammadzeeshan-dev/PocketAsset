-- PocketAsset Migration: Ensure transactions id default and update opening balances
-- Verified Balances: Cash in hand: PKR 4,000 | JazzCash: PKR 3,210 | Easypaisa: PKR 1,599

-- 1. Ensure transactions table has default gen_random_uuid() for id
alter table if exists public.transactions
  alter column id set default gen_random_uuid();

-- 2. Update accounts opening balances
update public.accounts
set opening_balance_paisa = 400000, updated_at = now()
where name = 'Cash in hand';

update public.accounts
set opening_balance_paisa = 321000, updated_at = now()
where name = 'JazzCash';

update public.accounts
set opening_balance_paisa = 159900, updated_at = now()
where name = 'Easypaisa';


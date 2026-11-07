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


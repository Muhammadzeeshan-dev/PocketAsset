import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { FinanceAccount, FinanceTransaction } from "./finance";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

let browserClient: SupabaseClient | null = null;

export const DEMO_ACCOUNTS: FinanceAccount[] = [
  { id: "acc-cash", name: "Cash in hand", account_type: "cash", opening_balance_paisa: 762000n, currency: "PKR", is_active: true },
  { id: "acc-jazz", name: "JazzCash", account_type: "wallet", opening_balance_paisa: 1000n, currency: "PKR", is_active: true },
  { id: "acc-easy", name: "Easypaisa", account_type: "wallet", opening_balance_paisa: 159900n, currency: "PKR", is_active: true },
  { id: "acc-bank", name: "Bank Account", account_type: "bank", opening_balance_paisa: 0n, currency: "PKR", is_active: true },
  { id: "acc-savings", name: "Savings Account", account_type: "savings", opening_balance_paisa: 0n, currency: "PKR", is_active: true },
  { id: "acc-brokerage", name: "Brokerage Cash Balance", account_type: "brokerage_cash", opening_balance_paisa: 0n, currency: "PKR", is_active: true },
];

export const DEMO_TRANSACTIONS: FinanceTransaction[] = [];

let memoryTransactions = [...DEMO_TRANSACTIONS];

export function createDemoSupabaseClient(): SupabaseClient {
  const queryBuilder = (table: string) => {
    const currentData = table === "account_balances" || table === "accounts"
      ? DEMO_ACCOUNTS
      : memoryTransactions;

    type MockBuilder = {
      select: () => MockBuilder;
      order: () => MockBuilder;
      is: () => MockBuilder;
      range: (_from?: number, _to?: number) => Promise<{ data: unknown; error: null }>;
      eq: () => MockBuilder;
      single: () => Promise<{ data: unknown; error: null }>;
      insert: (record: unknown) => Promise<{ data: unknown; error: null }>;
      update: (updates: unknown) => Promise<{ data: unknown; error: null }>;
      delete: () => Promise<{ data: null; error: null }>;
      then: (resolve: (val: { data: unknown; error: null }) => unknown) => unknown;
    };

    const builder: MockBuilder = {
      select: () => builder,
      order: () => builder,
      is: () => builder,
      range: () => {
        return Promise.resolve({ data: currentData, error: null });
      },
      eq: () => builder,
      single: () => Promise.resolve({ data: currentData[0] || null, error: null }),
      insert: (record: unknown) => {
        const item = (Array.isArray(record) ? record[0] : record) as FinanceTransaction;
        if (table === "transactions") {
          memoryTransactions = [item, ...memoryTransactions];
        }
        return Promise.resolve({ data: item, error: null });
      },
      update: (updates: unknown) => {
        return Promise.resolve({ data: updates, error: null });
      },
      delete: () => Promise.resolve({ data: null, error: null }),
      then: (resolve) => resolve({ data: currentData, error: null }),
    };

    return builder;
  };

  return {
    from: (table: string) => queryBuilder(table),
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signInWithPassword: () => Promise.resolve({ data: { user: null }, error: null }),
      signUp: () => Promise.resolve({ data: { user: null }, error: null }),
      signOut: () => Promise.resolve({ error: null }),
      updateUser: () => Promise.resolve({ data: { user: null }, error: null }),
      resetPasswordForEmail: () => Promise.resolve({ data: {}, error: null }),
      exchangeCodeForSession: () => Promise.resolve({ data: { session: null }, error: null }),
    },
  } as unknown as SupabaseClient;
}

export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseKey) return null;
  if (!browserClient) {
    browserClient = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true,
      },
    });
  }
  return browserClient;
}

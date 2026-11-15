import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { FinanceAccount, FinanceTransaction } from "./finance";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

let browserClient: SupabaseClient | null = null;

export const DEMO_ACCOUNTS: FinanceAccount[] = [
  { id: "acc-cash", name: "Cash in hand", account_type: "cash", opening_balance_paisa: 400000n, currency: "PKR", is_active: true },
  { id: "acc-jazz", name: "JazzCash", account_type: "wallet", opening_balance_paisa: 321000n, currency: "PKR", is_active: true },
  { id: "acc-easy", name: "Easypaisa", account_type: "wallet", opening_balance_paisa: 159900n, currency: "PKR", is_active: true },
  { id: "acc-bank", name: "Bank Account", account_type: "bank", opening_balance_paisa: 0n, currency: "PKR", is_active: true },
  { id: "acc-savings", name: "Savings Account", account_type: "savings", opening_balance_paisa: 0n, currency: "PKR", is_active: true },
  { id: "acc-brokerage", name: "Brokerage Cash Balance", account_type: "brokerage_cash", opening_balance_paisa: 0n, currency: "PKR", is_active: true },
];

export const DEMO_TRANSACTIONS: FinanceTransaction[] = [];

let memoryTransactions = [...DEMO_TRANSACTIONS];

const STORAGE_DEMO_ACCOUNTS = "pocketasset_persisted_accounts";
const STORAGE_DEMO_TRANSACTIONS = "pocketasset_persisted_transactions";
const STORAGE_DEMO_RECURRING = "pocketasset_persisted_recurring";

export function getPersistedAccounts(): FinanceAccount[] {
  if (typeof window === "undefined" || !window.localStorage) return DEMO_ACCOUNTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_DEMO_ACCOUNTS);
    if (!raw) return DEMO_ACCOUNTS;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return DEMO_ACCOUNTS;
    return parsed.map((a: any) => ({
      ...a,
      opening_balance_paisa: BigInt(a.opening_balance_paisa || 0),
    }));
  } catch {
    return DEMO_ACCOUNTS;
  }
}

export function savePersistedAccounts(accounts: FinanceAccount[]): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    const serialized = accounts.map((a) => ({
      ...a,
      opening_balance_paisa: a.opening_balance_paisa.toString(),
    }));
    window.localStorage.setItem(STORAGE_DEMO_ACCOUNTS, JSON.stringify(serialized));
  } catch {
    // ignore
  }
}

export function getPersistedTransactions(): FinanceTransaction[] {
  if (typeof window === "undefined" || !window.localStorage) return memoryTransactions;
  try {
    const raw = window.localStorage.getItem(STORAGE_DEMO_TRANSACTIONS);
    if (!raw) return memoryTransactions;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return memoryTransactions;
    return parsed.map((t: any) => ({
      ...t,
      amount_paisa: typeof t.amount_paisa === "string" ? t.amount_paisa : String(t.amount_paisa || 0),
    }));
  } catch {
    return memoryTransactions;
  }
}

export function savePersistedTransactions(txs: FinanceTransaction[]): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.setItem(STORAGE_DEMO_TRANSACTIONS, JSON.stringify(txs));
  } catch {
    // ignore
  }
}

export function getPersistedRecurringSchedules(): unknown[] {
  if (typeof window === "undefined" || !window.localStorage) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_DEMO_RECURRING);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function savePersistedRecurringSchedules(schedules: unknown[]): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.setItem(STORAGE_DEMO_RECURRING, JSON.stringify(schedules));
  } catch {
    // ignore
  }
}

export function createDemoSupabaseClient(): SupabaseClient {
  const queryBuilder = (table: string) => {
    let filterCol: string | null = null;
    let filterVal: unknown = null;
    let pendingUpdates: Record<string, unknown> | null = null;

    const executeUpdate = () => {
      if (pendingUpdates && (table === "accounts" || table === "account_balances")) {
        const currentAccounts = getPersistedAccounts();
        const target = currentAccounts.find((acc) => {
          if (!filterCol) return true;
          return (acc as unknown as Record<string, unknown>)[filterCol] === filterVal;
        });
        if (target) {
          Object.assign(target, pendingUpdates);
          if (target.opening_balance_paisa !== undefined) {
            target.opening_balance_paisa = BigInt(target.opening_balance_paisa || 0);
          }
          savePersistedAccounts(currentAccounts);
        }
      }
      if (pendingUpdates && table === "transactions") {
        const currentTxs = getPersistedTransactions();
        const target = currentTxs.find((t) => {
          if (!filterCol) return true;
          return (t as unknown as Record<string, unknown>)[filterCol] === filterVal;
        });
        if (target) {
          Object.assign(target, pendingUpdates);
          savePersistedTransactions(currentTxs);
          memoryTransactions = currentTxs;
        }
      }
      if (pendingUpdates && table === "recurring_expense_schedules") {
        const currentSchedules = getPersistedRecurringSchedules() as Record<string, unknown>[];
        const target = currentSchedules.find((s) => {
          if (!filterCol) return true;
          return s[filterCol] === filterVal;
        });
        if (target) {
          Object.assign(target, pendingUpdates);
          savePersistedRecurringSchedules(currentSchedules);
        }
      }
    };

    type MockBuilder = {
      select: () => MockBuilder;
      order: () => MockBuilder;
      is: () => MockBuilder;
      gte: (col?: string, val?: unknown) => MockBuilder;
      lte: (col?: string, val?: unknown) => MockBuilder;
      range: (_from?: number, _to?: number) => Promise<{ data: unknown; error: null }>;
      eq: (col?: string, val?: unknown) => MockBuilder;
      single: () => Promise<{ data: unknown; error: null }>;
      maybeSingle: () => Promise<{ data: unknown; error: null }>;
      insert: (record: unknown) => Promise<{ data: unknown; error: null }>;
      upsert: (record: unknown, opts?: unknown) => MockBuilder;
      update: (updates: unknown) => MockBuilder;
      delete: () => Promise<{ data: null; error: null }>;
      then: (resolve: (val: { data: unknown; error: null }) => unknown) => unknown;
    };

    const builder: MockBuilder = {
      select: () => builder,
      order: () => builder,
      is: () => builder,
      gte: () => builder,
      lte: () => builder,
      upsert: () => builder,
      eq: (col?: string, val?: unknown) => {
        if (col) {
          filterCol = col;
          filterVal = val;
          if (pendingUpdates) executeUpdate();
        }
        return builder;
      },
      range: () => {
        const currentData = table === "account_balances" || table === "accounts"
          ? getPersistedAccounts()
          : table === "recurring_expense_schedules"
          ? getPersistedRecurringSchedules()
          : table === "calendar_days" || table === "day_closures"
          ? []
          : getPersistedTransactions();
        return Promise.resolve({ data: currentData, error: null });
      },
      single: () => {
        const currentData = table === "account_balances" || table === "accounts"
          ? getPersistedAccounts()
          : table === "recurring_expense_schedules"
          ? getPersistedRecurringSchedules()
          : table === "calendar_days" || table === "day_closures"
          ? []
          : getPersistedTransactions();
        return Promise.resolve({ data: (currentData as unknown[])[0] || null, error: null });
      },
      maybeSingle: () => {
        const currentData = table === "account_balances" || table === "accounts"
          ? getPersistedAccounts()
          : table === "recurring_expense_schedules"
          ? getPersistedRecurringSchedules()
          : table === "calendar_days" || table === "day_closures"
          ? []
          : getPersistedTransactions();
        return Promise.resolve({ data: (currentData as unknown[])[0] || null, error: null });
      },
      insert: (record: unknown) => {
        const item = (Array.isArray(record) ? record[0] : record) as Record<string, unknown>;
        if (table === "transactions") {
          const currentTxs = getPersistedTransactions();
          const txWithId: FinanceTransaction = {
            id: (item.id as string) || `tx-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            account_id: (item.account_id as string) || "acc-cash",
            transfer_to_account_id: (item.transfer_to_account_id as string) ?? null,
            transaction_type: (item.transaction_type as any) || "adjustment",
            amount_paisa: (item.amount_paisa as bigint | string | number) ?? 0n,
            direction: (item.direction as any) || "inflow",
            occurred_at: (item.occurred_at as string) || new Date().toISOString(),
            category: (item.category as string) ?? null,
            description: (item.description as string) || "Manual adjustment",
            notes: (item.notes as string) ?? null,
          };
          const updatedTxs = [txWithId, ...currentTxs];
          savePersistedTransactions(updatedTxs);
          memoryTransactions = updatedTxs;
          return Promise.resolve({ data: txWithId, error: null });
        }
        if (table === "accounts") {
          const currentAccounts = getPersistedAccounts();
          const accWithId: FinanceAccount = {
            id: (item.id as string) || `acc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            name: (item.name as string) || "New Account",
            account_type: (item.account_type as any) || "cash",
            opening_balance_paisa: (item.opening_balance_paisa as any) ?? 0n,
            currency: (item.currency as string) || "PKR",
            is_active: item.is_active !== false,
          };
          const updatedAccounts = [...currentAccounts, accWithId];
          savePersistedAccounts(updatedAccounts);
          return Promise.resolve({ data: accWithId, error: null });
        }
        if (table === "recurring_expense_schedules") {
          const currentSchedules = getPersistedRecurringSchedules() as Record<string, unknown>[];
          const newSchedule = {
            id: (item.id as string) || `sch-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            ...item,
          };
          const updated = [...currentSchedules, newSchedule];
          savePersistedRecurringSchedules(updated);
          return Promise.resolve({ data: newSchedule, error: null });
        }
        return Promise.resolve({ data: item, error: null });
      },
      update: (updates: unknown) => {
        pendingUpdates = (updates as Record<string, unknown>) || {};
        executeUpdate();
        return builder;
      },
      delete: () => {
        if (table === "transactions" && filterCol === "id" && filterVal) {
          const currentTxs = getPersistedTransactions();
          const filtered = currentTxs.filter((t) => t.id !== filterVal);
          savePersistedTransactions(filtered);
          memoryTransactions = filtered;
        }
        if (table === "recurring_expense_schedules" && filterCol === "id" && filterVal) {
          const currentSchedules = getPersistedRecurringSchedules() as Record<string, unknown>[];
          const filtered = currentSchedules.filter((s) => s.id !== filterVal);
          savePersistedRecurringSchedules(filtered);
        }
        return Promise.resolve({ data: null, error: null });
      },
      then: (resolve) => {
        executeUpdate();
        const currentData = table === "account_balances" || table === "accounts"
          ? getPersistedAccounts()
          : table === "recurring_expense_schedules"
          ? getPersistedRecurringSchedules()
          : table === "calendar_days" || table === "day_closures"
          ? []
          : getPersistedTransactions();
        return Promise.resolve(resolve({ data: pendingUpdates || currentData, error: null }));
      },
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

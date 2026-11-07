import type { FinanceAccount, FinanceTransaction } from "./finance";
import type { Budget } from "./budgets";
import type { InventoryItem } from "./inventory";
import type { SavingsGoal } from "./savings";
import type { StockHolding } from "./investments";
import type { Asset, Liability } from "./assets";

export interface UserSettings {
  display_name: string;
  currency: string;
  theme: "light" | "dark" | "system";
  daily_spending_limit_paisa: string | number | bigint;
  enable_offline_mode: boolean;
  enable_ai_assistant: boolean;
  custom_categories: string[];
}

export interface BackupData {
  version: "1.0";
  exportedAt: string;
  accounts: FinanceAccount[];
  transactions: FinanceTransaction[];
  budgets?: Budget[];
  inventory?: InventoryItem[];
  savingsGoals?: SavingsGoal[];
  stockHoldings?: StockHolding[];
  assets?: Asset[];
  liabilities?: Liability[];
  settings?: UserSettings;
}

export function createFullBackup(data: Omit<BackupData, "version" | "exportedAt">): string {
  const backup: BackupData = {
    version: "1.0",
    exportedAt: new Date().toISOString(),
    ...data,
  };
  return JSON.stringify(backup, null, 2);
}

export function validateAndParseBackup(jsonString: string): BackupData {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    throw new Error("Invalid backup file: Could not parse JSON.");
  }

  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("Invalid backup structure: Expected an object.");
  }

  const record = parsed as Record<string, unknown>;
  if (!Array.isArray(record.accounts) || !Array.isArray(record.transactions)) {
    throw new Error("Invalid backup data: Missing required 'accounts' or 'transactions' ledger records.");
  }

  return record as unknown as BackupData;
}


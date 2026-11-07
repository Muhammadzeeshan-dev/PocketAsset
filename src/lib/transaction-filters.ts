import { addDaysToDateKey, getPakistanDateKey, startOfWeekDateKey, type FinanceAccount, type FinanceTransaction, type TransactionType } from "./finance";

export type TransactionDatePreset = "all" | "today" | "yesterday" | "this_week" | "last_week" | "this_month" | "last_month" | "custom";
export type TransactionDateRange = { start: string | null; end: string | null };

export function getTransactionDateRange(preset: TransactionDatePreset, today: string, customStart = "", customEnd = ""): TransactionDateRange {
  if (preset === "today") return { start: today, end: today };
  if (preset === "yesterday") {
    const yesterday = addDaysToDateKey(today, -1);
    return { start: yesterday, end: yesterday };
  }
  if (preset === "this_week") {
    const start = startOfWeekDateKey(today);
    return { start, end: addDaysToDateKey(start, 6) };
  }
  if (preset === "last_week") {
    const end = addDaysToDateKey(startOfWeekDateKey(today), -1);
    return { start: addDaysToDateKey(end, -6), end };
  }
  if (preset === "this_month") return { start: `${today.slice(0, 7)}-01`, end: today };
  if (preset === "last_month") {
    const [year, month] = today.slice(0, 7).split("-").map(Number);
    const lastMonthFirst = new Date(Date.UTC(year, month - 2, 1));
    const start = `${lastMonthFirst.getUTCFullYear()}-${String(lastMonthFirst.getUTCMonth() + 1).padStart(2, "0")}-01`;
    return { start, end: addDaysToDateKey(`${today.slice(0, 7)}-01`, -1) };
  }
  if (preset === "custom") return { start: customStart || null, end: customEnd || null };
  return { start: null, end: null };
}

export function filterTransactions({
  transactions,
  accounts,
  today,
  preset,
  customStart = "",
  customEnd = "",
  accountId = "all",
  category = "all",
  type = "all",
  search = "",
  sort = "newest",
}: {
  transactions: FinanceTransaction[];
  accounts: FinanceAccount[];
  today: string;
  preset: TransactionDatePreset;
  customStart?: string;
  customEnd?: string;
  accountId?: string;
  category?: string;
  type?: TransactionType | "all";
  search?: string;
  sort?: "newest" | "oldest";
}): FinanceTransaction[] {
  const { start, end } = getTransactionDateRange(preset, today, customStart, customEnd);
  const needle = search.trim().toLocaleLowerCase();
  const matches = transactions.filter((transaction) => {
    const date = getPakistanDateKey(transaction.occurred_at);
    if (start && date < start) return false;
    if (end && date > end) return false;
    if (accountId !== "all" && transaction.account_id !== accountId && transaction.transfer_to_account_id !== accountId) return false;
    if (category !== "all" && (transaction.category?.trim() || "Uncategorized") !== category) return false;
    if (type !== "all" && transaction.transaction_type !== type) return false;
    if (!needle) return true;
    const accountNames = [transaction.account_id, transaction.transfer_to_account_id]
      .map((id) => accounts.find((account) => account.id === id)?.name ?? "")
      .join(" ");
    const amount = String(Number(BigInt(transaction.amount_paisa)) / 100);
    return [transaction.description, transaction.category, transaction.notes, accountNames, amount]
      .some((value) => value?.toLocaleLowerCase().includes(needle));
  });
  return matches.sort((left, right) => sort === "newest"
    ? right.occurred_at.localeCompare(left.occurred_at)
    : left.occurred_at.localeCompare(right.occurred_at));
}

import { describe, expect, it } from "vitest";
import { getTransactionDateRange, filterTransactions } from "./transaction-filters";
import type { FinanceAccount, FinanceTransaction } from "./finance";

const cash: FinanceAccount = { id: "cash", name: "Cash in hand", account_type: "cash", opening_balance_paisa: "0", currency: "PKR", is_active: true };
const wallet: FinanceAccount = { id: "wallet", name: "Easypaisa", account_type: "wallet", opening_balance_paisa: "0", currency: "PKR", is_active: true };
const records: FinanceTransaction[] = [
  { id: "1", account_id: "cash", transfer_to_account_id: null, transaction_type: "income", amount_paisa: "80000", direction: "inflow", occurred_at: "2026-11-02T07:00:00Z", category: "University allowance", description: "Allowance", notes: null },
  { id: "2", account_id: "cash", transfer_to_account_id: null, transaction_type: "expense", amount_paisa: "45000", direction: "outflow", occurred_at: "2026-11-02T08:00:00Z", category: "Transport", description: "Bus fare", notes: "To campus" },
  { id: "3", account_id: "cash", transfer_to_account_id: "wallet", transaction_type: "transfer", amount_paisa: "10000", direction: "outflow", occurred_at: "2026-11-03T08:00:00Z", category: null, description: "Cash to Easypaisa", notes: null },
];

describe("transaction manager filters", () => {
  it("resolves PKT-friendly week, month, and custom date presets", () => {
    expect(getTransactionDateRange("this_week", "2026-11-08")).toEqual({ start: "2026-11-02", end: "2026-11-08" });
    expect(getTransactionDateRange("last_week", "2026-11-08")).toEqual({ start: "2026-10-26", end: "2026-11-01" });
    expect(getTransactionDateRange("last_month", "2026-01-12")).toEqual({ start: "2025-12-01", end: "2025-12-31" });
    expect(getTransactionDateRange("custom", "2026-11-08", "2026-11-04", "2026-11-06")).toEqual({ start: "2026-11-04", end: "2026-11-06" });
  });

  it("filters by the receiving side of transfers, category and type, and supports search and sorting", () => {
    expect(filterTransactions({ transactions: records, accounts: [cash, wallet], today: "2026-11-03", preset: "all", accountId: "wallet" }).map((item) => item.id)).toEqual(["3"]);
    expect(filterTransactions({ transactions: records, accounts: [cash, wallet], today: "2026-11-03", preset: "all", category: "Transport", type: "expense" }).map((item) => item.id)).toEqual(["2"]);
    expect(filterTransactions({ transactions: records, accounts: [cash, wallet], today: "2026-11-03", preset: "all", search: "easypaisa" }).map((item) => item.id)).toEqual(["3"]);
    expect(filterTransactions({ transactions: records, accounts: [cash, wallet], today: "2026-11-03", preset: "today", sort: "oldest" }).map((item) => item.id)).toEqual(["3"]);
  });
});

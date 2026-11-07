import { describe, expect, it } from "vitest";
import {
  calculateAccountBalance,
  getDaySummary,
  getMonthlySummary,
  getPakistanDateKey,
  getWeeklySummary,
  parseRupeesToPaisa,
  type FinanceAccount,
  type FinanceTransaction,
} from "./finance";

const cash: FinanceAccount = {
  id: "cash-1",
  name: "Cash in hand",
  account_type: "cash",
  opening_balance_paisa: "20000",
  currency: "PKR",
  is_active: true,
};

function tx(overrides: Partial<FinanceTransaction> & Pick<FinanceTransaction, "id" | "transaction_type" | "amount_paisa" | "occurred_at">): FinanceTransaction {
  const isTransfer = overrides.transaction_type === "transfer";
  const type = overrides.transaction_type;
  return Object.assign({
    id: overrides.id,
    account_id: "cash-1",
    transfer_to_account_id: isTransfer ? "wallet-1" : null,
    transaction_type: type,
    amount_paisa: overrides.amount_paisa,
    direction: ["income", "refund", "dividend", "investment_sale"].includes(type) ? "inflow" : "outflow",
    occurred_at: overrides.occurred_at,
    category: null,
    description: type,
  }, overrides);
}

describe("PocketAsset ledger calculations", () => {
  it("treats an opening balance as carried money, not income", () => {
    const summary = getDaySummary("2026-11-01", [cash], []);
    expect(summary.openingBalance).toBe(20000n);
    expect(summary.received).toBe(0n);
    expect(summary.closingBalance).toBe(20000n);
  });

  it("carries a balance through a zero-income day", () => {
    const transactions = [
      tx({ id: "allowance", transaction_type: "income", amount_paisa: "80000", occurred_at: "2026-11-02T07:00:00.000Z", category: "University allowance" }),
      tx({ id: "bus", transaction_type: "expense", amount_paisa: "45000", occurred_at: "2026-11-02T08:00:00.000Z" }),
      tx({ id: "lunch", transaction_type: "expense", amount_paisa: "20000", occurred_at: "2026-11-02T09:00:00.000Z" }),
      tx({ id: "drink", transaction_type: "expense", amount_paisa: "5000", occurred_at: "2026-11-02T10:00:00.000Z" }),
    ];
    const monday = getDaySummary("2026-11-02", [cash], transactions);
    const tuesday = getDaySummary("2026-11-03", [cash], transactions);

    expect(monday.openingBalance).toBe(20000n);
    expect(monday.received).toBe(80000n);
    expect(monday.expenses).toBe(70000n);
    expect(monday.closingBalance).toBe(30000n);
    expect(tuesday.openingBalance).toBe(30000n);
    expect(tuesday.received).toBe(0n);
    expect(tuesday.closingBalance).toBe(30000n);
  });

  it("uses Pakistan calendar dates and keeps the week Monday through Sunday", () => {
    expect(getPakistanDateKey("2026-11-02T20:00:00.000Z")).toBe("2026-11-03");
    const week = getWeeklySummary("2026-11-08", [cash], []);
    expect(week.map((day) => day.date)).toEqual([
      "2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05", "2026-11-06", "2026-11-07", "2026-11-08",
    ]);
    expect(week.every((day) => day.received === 0n && day.closingBalance === 20000n)).toBe(true);
  });

  it("moves money between accounts without changing total cash or income and expense totals", () => {
    const wallet: FinanceAccount = {
      id: "wallet-1",
      name: "Easypaisa",
      account_type: "wallet",
      opening_balance_paisa: "10000",
      currency: "PKR",
      is_active: true,
    };
    const transfer = tx({
      id: "transfer-1",
      transaction_type: "transfer",
      amount_paisa: "30000",
      occurred_at: "2026-11-02T07:00:00.000Z",
      account_id: cash.id,
      transfer_to_account_id: wallet.id,
    });

    expect(calculateAccountBalance(cash, [transfer])).toBe(-10000n);
    expect(calculateAccountBalance(wallet, [transfer])).toBe(40000n);
    const week = getWeeklySummary("2026-11-02", [cash, wallet], [transfer]);
    expect(week[0].received).toBe(0n);
    expect(week[0].expenses).toBe(0n);
    expect(week[0].closingBalance).toBe(30000n);
  });

  it("keeps investment purchases out of ordinary expense totals", () => {
    const purchase = tx({
      id: "stock-purchase",
      transaction_type: "investment_purchase",
      amount_paisa: "50000",
      occurred_at: "2026-11-02T07:00:00.000Z",
    });
    const summary = getMonthlySummary("2026-11", [purchase]);
    const day = getDaySummary("2026-11-02", [cash], [purchase]);
    expect(summary.expenses).toBe(0n);
    expect(day.investmentPurchases).toBe(50000n);
    expect(day.closingBalance).toBe(-30000n);
  });

  it("parses rupees to integer paisa without floating point arithmetic", () => {
    expect(parseRupeesToPaisa("1,234.05")).toBe(123405n);
    expect(() => parseRupeesToPaisa("12.345")).toThrow();
    expect(() => parseRupeesToPaisa("0")).toThrow();
  });

  it("does not classify refunds or investment sale proceeds as new income", () => {
    const transactions = [
      tx({ id: "refund", transaction_type: "refund", amount_paisa: "1500", occurred_at: "2026-11-02T07:00:00.000Z" }),
      tx({ id: "sale", transaction_type: "investment_sale", amount_paisa: "8000", occurred_at: "2026-11-02T08:00:00.000Z" }),
      tx({ id: "dividend", transaction_type: "dividend", amount_paisa: "2000", occurred_at: "2026-11-02T09:00:00.000Z" }),
    ];
    const summary = getMonthlySummary("2026-11", transactions);
    const day = getDaySummary("2026-11-02", [cash], transactions);
    expect(summary.income).toBe(2000n);
    expect(day.received).toBe(2000n);
    expect(day.otherInflows).toBe(9500n);
    expect(day.closingBalance).toBe(31500n);
  });

  it("recalculates a historical closing balance after a correction and ignores soft-deleted entries", () => {
    const originalExpense = tx({ id: "fare", transaction_type: "expense", amount_paisa: "45000", occurred_at: "2026-11-02T07:00:00.000Z" });
    const correctedExpense = { ...originalExpense, amount_paisa: "40000" };
    const deletedIncome = tx({ id: "deleted-income", transaction_type: "income", amount_paisa: "100000", occurred_at: "2026-11-02T08:00:00.000Z", deleted_at: "2026-11-03T00:00:00.000Z" });

    expect(getDaySummary("2026-11-02", [cash], [originalExpense]).closingBalance).toBe(-25000n);
    expect(getDaySummary("2026-11-02", [cash], [correctedExpense, deletedIncome]).closingBalance).toBe(-20000n);
  });

  it("verifies November 6, 2026 opening liquid balances (Rs 9,229) and carry-forward sequence", () => {
    const realAccounts: FinanceAccount[] = [
      { id: "cash", name: "Cash", account_type: "cash", opening_balance_paisa: 762000n, currency: "PKR", is_active: true },
      { id: "jazz", name: "JazzCash", account_type: "wallet", opening_balance_paisa: 1000n, currency: "PKR", is_active: true },
      { id: "easy", name: "Easypaisa", account_type: "wallet", opening_balance_paisa: 159900n, currency: "PKR", is_active: true },
    ];

    // Friday Nov 6: Starting balance is Rs. 9,229. No new income on Nov 6.
    const friSummary = getDaySummary("2026-11-06", realAccounts, []);
    expect(friSummary.openingBalance).toBe(922900n); // Rs. 9,229
    expect(friSummary.received).toBe(0n);
    expect(friSummary.expenses).toBe(0n);
    expect(friSummary.closingBalance).toBe(922900n);

    // Suppose user records transactions:
    // Friday: Income Rs. 800, Expenses Rs. 700 -> Closing Rs. 9,329
    const fridayTx = [
      tx({ id: "f-inc", account_id: "cash", transaction_type: "income", amount_paisa: 80000n, occurred_at: "2026-11-06T09:00:00Z" }),
      tx({ id: "f-exp", account_id: "cash", transaction_type: "expense", amount_paisa: 70000n, occurred_at: "2026-11-06T14:00:00Z" }),
    ];
    const fri = getDaySummary("2026-11-06", realAccounts, fridayTx);
    expect(fri.closingBalance).toBe(932900n); // Rs. 9,329

    // Saturday Nov 7 (Zero-income day): Opening = 9,329, In = 0, Out = 0, Closing = 9,329
    const sat = getDaySummary("2026-11-07", realAccounts, fridayTx);
    expect(sat.openingBalance).toBe(932900n);
    expect(sat.closingBalance).toBe(932900n);

    // Sunday Nov 8 (Zero-income day): Opening = 9,329, In = 0, Out = 0, Closing = 9,329
    const sun = getDaySummary("2026-11-08", realAccounts, fridayTx);
    expect(sun.openingBalance).toBe(932900n);
    expect(sun.closingBalance).toBe(932900n);

    // Monday Nov 9 (University Day): Income Rs. 800, Expenses Rs. 450 -> Closing Rs. 9,679
    const allTx = [
      ...fridayTx,
      tx({ id: "m-inc", account_id: "cash", transaction_type: "income", amount_paisa: 80000n, occurred_at: "2026-11-09T08:30:00Z" }),
      tx({ id: "m-exp", account_id: "cash", transaction_type: "expense", amount_paisa: 45000n, occurred_at: "2026-11-09T10:00:00Z" }),
    ];
    const mon = getDaySummary("2026-11-09", realAccounts, allTx);
    expect(mon.openingBalance).toBe(932900n);
    expect(mon.received).toBe(80000n);
    expect(mon.expenses).toBe(45000n);
    expect(mon.closingBalance).toBe(967900n); // Rs. 9,679
  });
});

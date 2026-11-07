import { describe, expect, it } from "vitest";
import { generateCsvExport, getYearlySummary } from "./reports";
import type { FinanceAccount, FinanceTransaction } from "./finance";

describe("Reports & Analytics Suite", () => {
  const accounts: FinanceAccount[] = [
    { id: "a1", name: "Cash in hand", account_type: "cash", opening_balance_paisa: 0n, currency: "PKR", is_active: true },
  ];

  const transactions: FinanceTransaction[] = [
    {
      id: "tx1",
      account_id: "a1",
      transfer_to_account_id: null,
      transaction_type: "income",
      amount_paisa: 5000000n, // Rs. 50,000
      direction: "inflow",
      occurred_at: "2026-11-01T10:00:00Z",
      category: "Freelance",
      description: "Project payout",
    },
    {
      id: "tx2",
      account_id: "a1",
      transfer_to_account_id: null,
      transaction_type: "expense",
      amount_paisa: 1500000n, // Rs. 15,000
      direction: "outflow",
      occurred_at: "2026-11-05T10:00:00Z",
      category: "Food",
      description: "Monthly groceries",
    },
  ];

  it("calculates yearly summary correctly", () => {
    const yearly = getYearlySummary("2026", transactions);
    expect(yearly.totalIncomePaisa).toBe(5000000n);
    expect(yearly.totalExpensesPaisa).toBe(1500000n);
    expect(yearly.totalSavingsPaisa).toBe(3500000n);
    expect(yearly.categoryBreakdown[0].category).toBe("Food");
    expect(yearly.categoryBreakdown[0].percentage).toBe(100);
  });

  it("exports valid CSV ledger format", () => {
    const csv = generateCsvExport(transactions, accounts);
    expect(csv).toContain("Date & Time,Type,Account");
    expect(csv).toContain("Cash in hand");
    expect(csv).toContain("50000.00");
    expect(csv).toContain("Freelance");
  });
});

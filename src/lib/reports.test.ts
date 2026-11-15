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

  it("updates monthly and yearly summaries when balance adjustments and corrections are added", () => {
    const transactionsWithAdjustment: FinanceTransaction[] = [
      ...transactions,
      {
        id: "tx3-adj-in",
        account_id: "a1",
        transfer_to_account_id: null,
        transaction_type: "adjustment",
        amount_paisa: 400000n, // +Rs. 4,000 cash correction
        direction: "inflow",
        occurred_at: "2026-11-10T12:00:00Z",
        category: "Adjustment",
        description: "Cash audit correction",
      },
      {
        id: "tx4-adj-out",
        account_id: "a1",
        transfer_to_account_id: null,
        transaction_type: "adjustment",
        amount_paisa: 50000n, // -Rs. 500 correction
        direction: "outflow",
        occurred_at: "2026-11-12T12:00:00Z",
        category: "Adjustment",
        description: "Correction of forgotten petty spend",
      },
    ];

    const yearly = getYearlySummary("2026", transactionsWithAdjustment);
    // Net adjustment = +400,000 - 50,000 = +350,000
    expect(yearly.totalAdjustmentsPaisa).toBe(350000n);
    // Total Inflows = 5,000,000 + 400,000 = 5,400,000
    expect(yearly.totalInflowsPaisa).toBe(5400000n);
    // Total Outflows = 1,500,000 + 50,000 = 1,550,000
    expect(yearly.totalOutflowsPaisa).toBe(1550000n);
    // Savings = 5,400,000 - 1,550,000 = 3,850,000
    expect(yearly.totalSavingsPaisa).toBe(3850000n);

    // Verify November monthly breakdown reflects the adjustments
    const nov = yearly.monthlyBreakdown.find((m) => m.month === "2026-11");
    expect(nov).toBeDefined();
    expect(nov?.adjustmentsPaisa).toBe(350000n);
    expect(nov?.savingsPaisa).toBe(3850000n);
  });

  it("exports valid CSV ledger format including adjustments", () => {
    const csv = generateCsvExport(transactions, accounts);
    expect(csv).toContain("Date & Time,Type,Account");
    expect(csv).toContain("Cash in hand");
    expect(csv).toContain("50000.00");
    expect(csv).toContain("Freelance");
  });
});

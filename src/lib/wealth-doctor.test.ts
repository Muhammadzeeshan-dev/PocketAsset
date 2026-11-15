import { describe, expect, it } from "vitest";
import { diagnoseWealthHealth } from "./wealth-doctor";
import type { FinanceAccount, FinanceTransaction } from "./finance";

describe("AI Wealth Doctor & Financial Health Suite", () => {
  const accounts: FinanceAccount[] = [
    { id: "cash", name: "Cash in hand", account_type: "cash", opening_balance_paisa: 400000n, currency: "PKR", is_active: true }, // Rs. 4,000
    { id: "jazz", name: "JazzCash", account_type: "wallet", opening_balance_paisa: 321000n, currency: "PKR", is_active: true },   // Rs. 3,210
    { id: "easy", name: "Easypaisa", account_type: "wallet", opening_balance_paisa: 159900n, currency: "PKR", is_active: true },  // Rs. 1,599
  ];

  it("diagnoses zero-debt profile and awards 100 on debt freedom pillar", () => {
    const report = diagnoseWealthHealth(accounts, [], [], [], 1740426n);

    expect(report.pillars.debtFreedom.score).toBe(100);
    expect(report.pillars.debtFreedom.status).toBe("excellent");
    expect(report.grade).toMatch(/A|B/);
    expect(report.overallScore).toBeGreaterThanOrEqual(70);
  });

  it("evaluates liquid runway and produces actionable prescriptions", () => {
    const report = diagnoseWealthHealth(accounts, [], [], [], 1740426n);

    expect(report.prescriptions.length).toBeGreaterThan(0);
    expect(report.prescriptions[0].action).toBeDefined();
    expect(report.pillars.liquidity.metricValue).toContain("Days");
  });

  it("handles active inflows and calculates accurate savings retention rate", () => {
    const transactions: FinanceTransaction[] = [
      {
        id: "tx-inc",
        account_id: "cash",
        transfer_to_account_id: null,
        transaction_type: "income",
        amount_paisa: 1000000n, // Rs. 10,000
        direction: "inflow",
        occurred_at: "2026-11-01T10:00:00Z",
        category: "Allowance",
        description: "Monthly allowance",
      },
      {
        id: "tx-exp",
        account_id: "cash",
        transfer_to_account_id: null,
        transaction_type: "expense",
        amount_paisa: 300000n, // Rs. 3,000
        direction: "outflow",
        occurred_at: "2026-11-05T10:00:00Z",
        category: "Groceries",
        description: "Study snacks",
      },
    ];

    const report = diagnoseWealthHealth(accounts, transactions, [], [], 1740426n);
    // Net savings = 10,000 - 3,000 = 7,000 (70% savings rate)
    expect(report.pillars.savingsRate.score).toBe(100);
    expect(report.pillars.savingsRate.metricValue).toBe("70%");
    expect(report.overallScore).toBeGreaterThanOrEqual(80);
  });
});

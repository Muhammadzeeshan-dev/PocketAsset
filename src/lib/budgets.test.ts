import { describe, expect, it } from "vitest";
import { calculateBudgetSpending, evaluateBudgetStatus, calculateWeeklyBudgetBreakdown, type Budget } from "./budgets";
import type { FinanceTransaction } from "./finance";

describe("Budget calculation suite", () => {
  const sampleBudget: Budget = {
    id: "b1",
    user_id: "u1",
    name: "Food & Transport",
    budget_type: "category",
    category: "Food",
    amount_paisa: 1000000n, // Rs. 10,000
    start_date: "2026-11-01",
    end_date: "2026-11-30",
    warning_thresholds: [50, 75, 90, 100],
    is_paused: false,
  };

  const sampleTransactions: FinanceTransaction[] = [
    {
      id: "tx1",
      account_id: "acc1",
      transfer_to_account_id: null,
      transaction_type: "expense",
      amount_paisa: 600000n, // Rs. 6,000
      direction: "outflow",
      occurred_at: "2026-11-05T10:00:00Z",
      category: "Food",
      description: "Groceries",
    },
    {
      id: "tx2",
      account_id: "acc1",
      transfer_to_account_id: null,
      transaction_type: "expense",
      amount_paisa: 250000n, // Rs. 2,500
      direction: "outflow",
      occurred_at: "2026-11-06T10:00:00Z",
      category: "Transport", // different category
      description: "Cab",
    },
    {
      id: "tx3",
      account_id: "acc1",
      transfer_to_account_id: null,
      transaction_type: "expense",
      amount_paisa: 300000n, // Rs. 3,000
      direction: "outflow",
      occurred_at: "2026-11-07T10:00:00Z",
      category: "Food",
      description: "Dinner",
    },
  ];

  it("calculates spending for a specific category budget accurately", () => {
    const spent = calculateBudgetSpending(sampleBudget, sampleTransactions);
    // 6000 + 3000 = Rs. 9,000 (900000 paisa)
    expect(spent).toBe(900000n);
  });

  it("triggers correct warning threshold (90%)", () => {
    const status = evaluateBudgetStatus(sampleBudget, sampleTransactions);
    expect(status.spentPaisa).toBe(900000n);
    expect(status.remainingPaisa).toBe(100000n);
    expect(status.percentUsed).toBe(90);
    expect(status.isOverspent).toBe(false);
    expect(status.activeAlertThreshold).toBe(90);
  });

  it("calculates weekly breakdown correctly across 7 days", () => {
    const weeklyBreakdown = calculateWeeklyBudgetBreakdown(700000n, "2026-11-02", sampleTransactions);
    expect(weeklyBreakdown.length).toBe(7);
    expect(weeklyBreakdown[0].plannedPaisa).toBe(100000n); // Rs 1,000 per day
  });
});


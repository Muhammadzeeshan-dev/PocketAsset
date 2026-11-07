import { describe, expect, it } from "vitest";
import { calculateNetWorth, type Asset, type Liability } from "./assets";
import type { FinanceAccount, FinanceTransaction } from "./finance";

describe("Assets, Liabilities & Net Worth rules", () => {
  const accounts: FinanceAccount[] = [
    {
      id: "acc1",
      name: "Cash",
      account_type: "cash",
      opening_balance_paisa: 500000n, // Rs. 5,000
      currency: "PKR",
      is_active: true,
    },
    {
      id: "acc2",
      name: "JazzCash",
      account_type: "wallet",
      opening_balance_paisa: 1000000n, // Rs. 10,000
      currency: "PKR",
      is_active: true,
    },
  ];

  const transactions: FinanceTransaction[] = [
    {
      id: "tx1",
      account_id: "acc1",
      transfer_to_account_id: null,
      transaction_type: "expense",
      amount_paisa: 200000n, // Rs. 2,000
      direction: "outflow",
      occurred_at: "2026-11-05T12:00:00Z",
      category: "Food",
      description: "Lunch",
    },
  ];

  const physicalAssets: Asset[] = [
    {
      id: "a1",
      user_id: "u1",
      name: "Dell Laptop",
      asset_type: "electronics",
      purchase_date: "2025-01-01",
      purchase_cost_paisa: 12000000n, // Rs. 120,000
      current_estimated_value_paisa: 9500000n, // Rs. 95,000
      ownership: "Sole owner",
    },
  ];

  const liabilities: Liability[] = [
    {
      id: "l1",
      user_id: "u1",
      name: "Friend borrow",
      liability_type: "borrowed_money",
      principal_amount_paisa: 500000n, // Rs. 5,000
      remaining_balance_paisa: 300000n, // Rs. 3,000 remaining
      owed_to: "Ali",
      due_date: "2026-12-01",
      is_settled: false,
    },
  ];

  it("calculates liquid cash, total assets, liabilities and net worth correctly", () => {
    // Liquid cash = (5000 - 2000) + 10000 = Rs. 13,000 (1300000 paisa)
    // Stocks = Rs. 17,404.26 (1740426 paisa)
    // Physical = Rs. 95,000 (9500000 paisa)
    // Total Assets = 13,000 + 17,404.26 + 95,000 = Rs. 125,404.26 (12540426 paisa)
    // Total Liabilities = Rs. 3,000 (300000 paisa)
    // Total Net Worth = 125,404.26 - 3,000 = Rs. 122,404.26 (12240426 paisa)
    const breakdown = calculateNetWorth(accounts, transactions, 1740426n, physicalAssets, liabilities);

    expect(breakdown.liquidCashPaisa).toBe(1300000n);
    expect(breakdown.totalLiabilitiesPaisa).toBe(300000n);
    expect(breakdown.totalAssetsPaisa).toBe(12540426n);
    expect(breakdown.totalNetWorthPaisa).toBe(12240426n);
    expect(breakdown.liquidNetWorthPaisa).toBe(1000000n); // 13,000 - 3,000 = Rs 10,000
  });

  it("excludes settled liabilities from net worth deductions", () => {
    const settledLiabilities = [{ ...liabilities[0], is_settled: true }];
    const breakdown = calculateNetWorth(accounts, transactions, 0n, [], settledLiabilities);
    expect(breakdown.totalLiabilitiesPaisa).toBe(0n);
    expect(breakdown.totalNetWorthPaisa).toBe(breakdown.liquidCashPaisa);
  });
});


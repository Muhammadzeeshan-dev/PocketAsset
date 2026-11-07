import { describe, expect, it } from "vitest";
import { answerFinancialQueryLocally } from "./assistant";
import type { FinanceAccount, FinanceTransaction } from "./finance";
import type { PortfolioSummary } from "./investments";

describe("AI Financial Assistant Ledger Query Engine", () => {
  const accounts: FinanceAccount[] = [
    { id: "a1", name: "Cash in hand", account_type: "cash", opening_balance_paisa: 500000n, currency: "PKR", is_active: true },
    { id: "a2", name: "JazzCash", account_type: "wallet", opening_balance_paisa: 1000000n, currency: "PKR", is_active: true },
  ];

  const transactions: FinanceTransaction[] = [
    {
      id: "tx1",
      account_id: "a1",
      transfer_to_account_id: null,
      transaction_type: "income",
      amount_paisa: 80000n, // Rs. 800
      direction: "inflow",
      occurred_at: "2026-11-02T08:00:00Z", // Monday
      category: "University Allowance",
      description: "University allowance",
    },
    {
      id: "tx2",
      account_id: "a1",
      transfer_to_account_id: null,
      transaction_type: "expense",
      amount_paisa: 45000n, // Rs. 450
      direction: "outflow",
      occurred_at: "2026-11-05T09:00:00Z",
      category: "Transport",
      description: "Bus fare",
    },
    {
      id: "tx3",
      account_id: "a1",
      transfer_to_account_id: null,
      transaction_type: "expense",
      amount_paisa: 20000n, // Rs. 200
      direction: "outflow",
      occurred_at: "2026-11-05T13:00:00Z",
      category: "Food",
      description: "University lunch",
    },
  ];

  const portfolio: PortfolioSummary = {
    holdings: [],
    totalCostPaisa: 1614863n,
    totalMarketValuePaisa: 1740426n,
    totalUnrealizedPaisa: 125563n,
    totalReturnPercentage: 7.78,
    totalDividendsPaisa: 0n,
  };

  it("answers how much is left in accounts correctly", () => {
    const res = answerFinancialQueryLocally("How much is left in my cash account?", accounts, transactions, portfolio, "2026-11-06");
    expect(res.reply).toContain("Cash in hand");
    expect(res.reply).toContain("JazzCash");
    expect(res.snippet?.value).toContain("Rs");
  });

  it("answers Monday allowance question accurately from ledger", () => {
    const res = answerFinancialQueryLocally("How much money did I receive this Monday?", accounts, transactions, portfolio, "2026-11-06");
    expect(res.reply).toContain("Rs 800.00");
  });

  it("answers affordability query with exact arithmetic", () => {
    // Total liquid = 5000 + 10000 + 800 - 450 - 200 = Rs. 15,150
    const res = answerFinancialQueryLocally("Can I afford Rs 5,000?", accounts, transactions, portfolio, "2026-11-06");
    expect(res.reply).toContain("Yes, you currently have");
    expect(res.snippet?.breakdownExplanation).toContain("15,150.00");
  });
});


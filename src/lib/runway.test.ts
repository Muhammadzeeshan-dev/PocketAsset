import { describe, expect, it } from "vitest";
import { calculateCashRunway } from "./runway";
import type { FinanceAccount, FinanceTransaction } from "./finance";

describe("Cash Runway & Burn Rate Prediction Engine", () => {
  const accounts: FinanceAccount[] = [
    { id: "acc-cash", name: "Cash in hand", account_type: "cash", opening_balance_paisa: 400000n, currency: "PKR", is_active: true }, // Rs. 4,000
    { id: "acc-jazz", name: "JazzCash", account_type: "wallet", opening_balance_paisa: 321000n, currency: "PKR", is_active: true }, // Rs. 3,210
    { id: "acc-easy", name: "Easypaisa", account_type: "wallet", opening_balance_paisa: 159900n, currency: "PKR", is_active: true }, // Rs. 1,599
  ];

  it("calculates runway accurately with default student spending profile", () => {
    const transactions: FinanceTransaction[] = [];
    const analysis = calculateCashRunway(accounts, transactions, "2026-11-15");

    // Total liquid = 4000 + 3210 + 1599 = Rs. 8,809 (880900n paisa)
    expect(analysis.totalLiquidBalancePaisa).toBe(880900n);
    expect(analysis.pocketCashBalancePaisa).toBe(400000n);
    // At default Rs. 450/day: 4,000 / 450 = 8 days
    expect(analysis.pocketCashRunwayDays).toBe(8);
    // Total liquid runway: 8,809 / 450 = 19 days
    expect(analysis.totalLiquidRunwayDays).toBe(19);
    expect(analysis.status).toBe("healthy");
  });

  it("triggers critical status when pocket cash runway drops to <= 2 days", () => {
    const lowCashAccounts: FinanceAccount[] = [
      { id: "acc-cash", name: "Cash in hand", account_type: "cash", opening_balance_paisa: 60000n, currency: "PKR", is_active: true }, // Rs. 600
    ];
    const analysis = calculateCashRunway(lowCashAccounts, [], "2026-11-15");

    // 600 / 450 = 1 day runway
    expect(analysis.pocketCashRunwayDays).toBe(1);
    expect(analysis.status).toBe("critical");
  });
});


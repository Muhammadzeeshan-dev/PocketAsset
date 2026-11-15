import { describe, expect, it } from "vitest";
import { generateCashFlowForecast } from "./predictive-cashflow";
import type { FinanceAccount, FinanceTransaction } from "./finance";

describe("30-Day Predictive Cash Flow & Inactivity Safe-Zone Suite", () => {
  const accounts: FinanceAccount[] = [
    { id: "cash", name: "Cash in hand", account_type: "cash", opening_balance_paisa: 400000n, currency: "PKR", is_active: true }, // Rs. 4,000
    { id: "jazz", name: "JazzCash", account_type: "wallet", opening_balance_paisa: 321000n, currency: "PKR", is_active: true },   // Rs. 3,210
    { id: "easy", name: "Easypaisa", account_type: "wallet", opening_balance_paisa: 159900n, currency: "PKR", is_active: true },  // Rs. 1,599
  ];

  it("projects 30 days of forward cash flow correctly", () => {
    const forecast = generateCashFlowForecast(accounts, [], "2026-11-15", 30);

    expect(forecast.currentCashPaisa).toBe(400000n);
    expect(forecast.currentWalletPaisa).toBe(480900n); // 3210 + 1599 = 4809
    expect(forecast.currentLiquidPaisa).toBe(880900n); // Rs. 8,809
    expect(forecast.projectedDays.length).toBe(30);

    // Days start from 2026-11-16
    expect(forecast.projectedDays[0].dateKey).toBe("2026-11-16");
    expect(forecast.projectedDays[29].dateKey).toBe("2026-12-15");
  });

  it("triggers rebalance advice when cash in hand is predicted to deplete within 15 days", () => {
    // Starting with Rs. 4,000 cash and Rs. 450 daily burn (60% cash = Rs. 270/day)
    // 4,000 / 270 = ~14.8 days
    const forecast = generateCashFlowForecast(accounts, [], "2026-11-15", 30);

    expect(forecast.daysUntilCashExhaustion).toBeLessThanOrEqual(16);
    expect(forecast.rebalanceAdvice.message).toBeDefined();
  });

  it("correctly identifies comfort, lean, and critical zones", () => {
    const forecast = generateCashFlowForecast(accounts, [], "2026-11-15", 30);

    const firstDay = forecast.projectedDays[0];
    expect(firstDay.zone).toBe("comfort");

    // Later days will shift to lean or critical as cash burns down
    const hasLeanOrCritical = forecast.projectedDays.some((d) => d.zone === "lean" || d.zone === "critical");
    expect(hasLeanOrCritical).toBe(true);
  });
});

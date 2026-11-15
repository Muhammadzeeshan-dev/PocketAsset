import { describe, expect, it } from "vitest";
import { calculateZakat, DEFAULT_ZAKAT_RATES } from "./zakat";
import type { FinanceAccount, FinanceTransaction } from "./finance";

describe("Islamic Zakat & Shariah Wealth Calculation Engine", () => {
  it("determines non-eligibility when total wealth is below Silver Nisab threshold", () => {
    const accounts: FinanceAccount[] = [
      { id: "acc-cash", name: "Cash in hand", account_type: "cash", opening_balance_paisa: 400000n, currency: "PKR", is_active: true }, // Rs. 4,000
      { id: "acc-jazz", name: "JazzCash", account_type: "wallet", opening_balance_paisa: 321000n, currency: "PKR", is_active: true }, // Rs. 3,210
    ];
    const transactions: FinanceTransaction[] = [];
    const stockMarketValuePaisa = 1740426n; // Rs. 17,404.26

    const zakat = calculateZakat(accounts, transactions, stockMarketValuePaisa, [], [], DEFAULT_ZAKAT_RATES);

    // Silver Nisab: 52.5 * 3,300 = Rs. 173,250 (17,325,000 paisa)
    expect(zakat.nisabThresholdPaisa).toBe(17325000n);
    // User wealth is ~Rs. 12,430, which is below Nisab
    expect(zakat.isEligibleForZakat).toBe(false);
    expect(zakat.zakatDuePaisa).toBe(0n);
  });

  it("calculates exact 2.5% Zakat when wealth exceeds Nisab threshold", () => {
    const wealthyAccounts: FinanceAccount[] = [
      { id: "acc-bank", name: "Savings", account_type: "bank", opening_balance_paisa: 40000000n, currency: "PKR", is_active: true }, // Rs. 400,000
    ];
    const zakat = calculateZakat(wealthyAccounts, [], 0n, [], [], DEFAULT_ZAKAT_RATES);

    expect(zakat.isEligibleForZakat).toBe(true);
    // 2.5% of 400,000 is 10,000 (1,000,000 paisa)
    expect(zakat.zakatDuePaisa).toBe(1000000n);
  });
});


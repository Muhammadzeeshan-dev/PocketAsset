import { describe, expect, it } from "vitest";
import {
  calculateAccountBalance,
  parseRupeesToPaisa,
  formatPkr,
  type FinanceAccount,
  type FinanceTransaction,
} from "./finance";
import { calculateNetWorth, type Asset, type Liability } from "./assets";

describe("Account Balance Adjustment & Reconciliation Engine", () => {
  const cashAccount: FinanceAccount = {
    id: "acc-cash",
    name: "Cash in hand",
    account_type: "cash",
    opening_balance_paisa: 762000n, // Rs. 7,620
    currency: "PKR",
    is_active: true,
  };

  it("calculates exact balance before and after unrecorded inflow adjustment", () => {
    const transactions: FinanceTransaction[] = [
      {
        id: "tx-expense-1",
        account_id: "acc-cash",
        transfer_to_account_id: null,
        transaction_type: "expense",
        amount_paisa: 62000n, // -Rs. 620
        direction: "outflow",
        occurred_at: "2026-11-06T12:00:00Z",
        category: "Food",
        description: "Campus lunch",
      },
    ];

    // Current balance should be 7620 - 620 = 7000
    const current = calculateAccountBalance(cashAccount, transactions);
    expect(current).toBe(700000n);
    expect(formatPkr(current)).toBe("Rs 7,000.00");

    // User finds actual pocket cash is Rs. 10,000. Delta is +Rs. 3,000
    const actualPaisa = parseRupeesToPaisa("10000");
    const delta = actualPaisa - current;
    expect(delta).toBe(300000n);

    // Apply adjustment transaction
    const adjustmentTx: FinanceTransaction = {
      id: "tx-adj-1",
      account_id: "acc-cash",
      transfer_to_account_id: null,
      transaction_type: "adjustment",
      amount_paisa: delta,
      direction: "inflow",
      occurred_at: "2026-11-07T12:00:00Z",
      category: "Adjustment",
      description: "Balance adjustment: Cash in hand",
      notes: "Cash audit / balance reconciliation",
    };

    const newTransactions = [...transactions, adjustmentTx];
    const adjustedBalance = calculateAccountBalance(cashAccount, newTransactions);
    expect(adjustedBalance).toBe(1000000n);
    expect(formatPkr(adjustedBalance)).toBe("Rs 10,000.00");
  });

  it("calculates exact balance after unrecorded outflow adjustment (spending unrecorded)", () => {
    const transactions: FinanceTransaction[] = [];
    const current = calculateAccountBalance(cashAccount, transactions);
    expect(current).toBe(762000n);

    // User counted pocket and has Rs. 5,000. Delta is -Rs. 2,620
    const actualPaisa = parseRupeesToPaisa("5000");
    const delta = actualPaisa - current;
    expect(delta).toBe(-262000n);

    const adjustmentTx: FinanceTransaction = {
      id: "tx-adj-2",
      account_id: "acc-cash",
      transfer_to_account_id: null,
      transaction_type: "adjustment",
      amount_paisa: -delta, // absolute amount in paisa
      direction: "outflow",
      occurred_at: "2026-11-07T12:00:00Z",
      category: "Adjustment",
      description: "Balance adjustment: Cash in hand",
      notes: "Forgot to record previous day transit and snack expenses",
    };

    const newTransactions = [adjustmentTx];
    const adjustedBalance = calculateAccountBalance(cashAccount, newTransactions);
    expect(adjustedBalance).toBe(500000n);
    expect(formatPkr(adjustedBalance)).toBe("Rs 5,000.00");
  });

  it("verifies Net Worth calculation when physical assets and liabilities are reset to zero", () => {
    const emptyAssets: Asset[] = [];
    const emptyLiabilities: Liability[] = [];
    const accounts: FinanceAccount[] = [cashAccount];
    const transactions: FinanceTransaction[] = [];
    const stockMarketValuePaisa = 1740426n; // Rs. 17,404.26

    const netWorth = calculateNetWorth(
      accounts,
      transactions,
      stockMarketValuePaisa,
      emptyAssets,
      emptyLiabilities,
    );

    expect(netWorth.physicalAssetsPaisa).toBe(0n);
    expect(netWorth.totalLiabilitiesPaisa).toBe(0n);
    expect(netWorth.debtToAssetRatio).toBe(0);
    expect(netWorth.liquidCashPaisa).toBe(762000n);
    expect(netWorth.liquidNetWorthPaisa).toBe(762000n);
    // Total Net Worth = liquidCash + stockMarketValue + 0 - 0 = 7,620.00 + 17,404.26 = 25,024.26
    expect(netWorth.totalNetWorthPaisa).toBe(762000n + 1740426n);
  });
});

import { describe, expect, it } from "vitest";
import { calculateWhtRefunds, generateFbrClaimSchedule } from "./tax-optimizer";
import type { FinanceTransaction } from "./finance";

describe("AI Pakistani Tax Optimizer & WHT Refund Suite", () => {
  it("calculates 15% Section 236 advance tax on mobile loads", () => {
    const transactions: FinanceTransaction[] = [
      {
        id: "tx-mobile",
        account_id: "jazz",
        transfer_to_account_id: null,
        transaction_type: "expense",
        amount_paisa: 100000n, // Rs. 1,000 mobile load
        direction: "outflow",
        occurred_at: "2026-11-02T10:00:00Z",
        category: "Mobile Load",
        description: "Jazz Super Card Package",
      },
    ];

    const report = calculateWhtRefunds(transactions, "2026", "filer");
    // 15% of Rs. 1,000 = Rs. 150 (15,000 paisa)
    expect(report.breakdown.mobileTelecom.deductedTaxPaisa).toBe(15000n);
    expect(report.totalAdjustableTaxPaisa).toBe(15000n);
    expect(report.refundClaimScheduleNotes.length).toBeGreaterThan(0);
  });

  it("calculates 10% Section 235 advance tax on electricity bills and 15% dividend tax", () => {
    const transactions: FinanceTransaction[] = [
      {
        id: "tx-ke",
        account_id: "easy",
        transfer_to_account_id: null,
        transaction_type: "expense",
        amount_paisa: 500000n, // Rs. 5,000 KE bill
        direction: "outflow",
        occurred_at: "2026-11-05T10:00:00Z",
        category: "Utilities",
        description: "K-Electric Bill",
      },
      {
        id: "tx-div",
        account_id: "bank",
        transfer_to_account_id: null,
        transaction_type: "dividend",
        amount_paisa: 200000n, // Rs. 2,000 dividend payout
        direction: "inflow",
        occurred_at: "2026-11-06T10:00:00Z",
        category: "Investments",
        description: "Engro Corp Dividend",
      },
    ];

    const report = calculateWhtRefunds(transactions, "2026", "filer");
    // 10% of 5,000 = 500 (50,000 paisa)
    expect(report.breakdown.electricityBills.deductedTaxPaisa).toBe(50000n);
    // 15% of 2,000 = 300 (30,000 paisa)
    expect(report.breakdown.psxDividends.deductedTaxPaisa).toBe(30000n);
    // Total = 50,000 + 30,000 = 80,000 paisa (Rs. 800)
    expect(report.totalAdjustableTaxPaisa).toBe(80000n);
  });

  it("generates formatted FBR IRIS Section 170 refund schedule text", () => {
    const report = calculateWhtRefunds([], "2026", "filer");
    const schedule = generateFbrClaimSchedule(report);
    expect(schedule).toContain("FBR SECTION 170 REFUND");
    expect(schedule).toContain("Tax Year 2026");
    expect(schedule).toContain("Sec 236");
    expect(schedule).toContain("PocketAsset Institutional Finance Engine");
  });
});

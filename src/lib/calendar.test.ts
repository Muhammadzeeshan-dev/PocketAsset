import { describe, expect, it } from "vitest";
import { getMonthCalendarData } from "./calendar";
import type { FinanceAccount, FinanceTransaction } from "./finance";

describe("Monthly Financial Calendar Engine", () => {
  const realAccounts: FinanceAccount[] = [
    { id: "cash", name: "Cash", account_type: "cash", opening_balance_paisa: 762000n, currency: "PKR", is_active: true },
    { id: "jazz", name: "JazzCash", account_type: "wallet", opening_balance_paisa: 1000n, currency: "PKR", is_active: true },
    { id: "easy", name: "Easypaisa", account_type: "wallet", opening_balance_paisa: 159900n, currency: "PKR", is_active: true },
  ];

  const transactions: FinanceTransaction[] = [
    {
      id: "tx-fri",
      account_id: "cash",
      transfer_to_account_id: null,
      transaction_type: "expense",
      amount_paisa: 45000n, // Rs. 450
      direction: "outflow",
      occurred_at: "2026-11-06T10:00:00Z",
      category: "Transport",
      description: "Bus fare",
    },
  ];

  it("generates a full monthly calendar grid starting on Monday", () => {
    const calendar = getMonthCalendarData("2026-11", realAccounts, transactions, "2026-11-06");

    expect(calendar.monthKey).toBe("2026-11");
    expect(calendar.monthName).toContain("November 2026");
    expect(calendar.days.length % 7).toBe(0); // Full weeks
    expect(calendar.days.length).toBeGreaterThanOrEqual(28);

    // Find Nov 6
    const nov6 = calendar.days.find((d) => d.date === "2026-11-06")!;
    expect(nov6).toBeDefined();
    expect(nov6.isCurrentMonth).toBe(true);
    expect(nov6.isToday).toBe(true);
    expect(nov6.summary.openingBalance).toBe(922900n); // Rs. 9,229
    expect(nov6.summary.expenses).toBe(45000n); // Rs. 450
    expect(nov6.summary.closingBalance).toBe(877900n); // Rs. 8,779
    expect(nov6.isZeroIncomeDay).toBe(true); // zero income on that day
  });

  it("identifies Saturday and Sunday as configurable weekend/holidays", () => {
    const calendar = getMonthCalendarData("2026-11", realAccounts, transactions, "2026-11-06");
    const nov7 = calendar.days.find((d) => d.date === "2026-11-07")!; // Saturday
    const nov8 = calendar.days.find((d) => d.date === "2026-11-08")!; // Sunday

    expect(nov7.isHoliday).toBe(true);
    expect(nov8.isHoliday).toBe(true);
    expect(nov7.isUniversityDay).toBe(false);
    expect(nov8.isUniversityDay).toBe(false);
  });
});


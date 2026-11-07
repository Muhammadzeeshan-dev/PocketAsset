import { describe, expect, it } from "vitest";
import { compareAllowance, expectedAllowanceForDate, type AllowanceSchedule } from "./allowance";

const schedule: AllowanceSchedule = {
  expected_amount_paisa: "80000",
  expected_weekdays: [1, 2, 3, 4, 5],
  start_date: "2026-11-02",
  end_date: "2026-11-30",
  active: true,
};

describe("allowance planning", () => {
  it("calculates expected weekday amounts without creating actual income", () => {
    expect(expectedAllowanceForDate("2026-11-02", schedule)).toBe(80000n);
    expect(expectedAllowanceForDate("2026-11-07", schedule)).toBe(0n);
    expect(expectedAllowanceForDate("2026-11-04", schedule, true)).toBe(0n);
  });

  it("supports user-selected weekend schedules and inclusive start/end dates", () => {
    const custom = { ...schedule, expected_weekdays: [0, 6], start_date: "2026-11-07", end_date: "2026-11-08" };
    expect(expectedAllowanceForDate("2026-11-07", custom)).toBe(80000n);
    expect(expectedAllowanceForDate("2026-11-08", custom)).toBe(80000n);
    expect(expectedAllowanceForDate("2026-11-09", custom)).toBeNull();
    expect(expectedAllowanceForDate("2026-11-06", custom)).toBeNull();
  });

  it("reports missed and additional allowance only against actual received money", () => {
    expect(compareAllowance(50000n, 80000n)).toEqual({ missed: 30000n, additional: 0n });
    expect(compareAllowance(95000n, 80000n)).toEqual({ missed: 0n, additional: 15000n });
    expect(compareAllowance(0n, null)).toEqual({ missed: null, additional: null });
  });
});

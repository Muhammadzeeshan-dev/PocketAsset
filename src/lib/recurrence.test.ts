import { describe, expect, it } from "vitest";
import { nextRecurrenceDate } from "./recurrence";

describe("explicit recurring expense schedules", () => {
  it("moves weekly schedules forward by the selected number of weeks", () => {
    expect(nextRecurrenceDate("2026-11-06", "weekly", 2)).toBe("2026-11-20");
  });

  it("keeps monthly end-of-month schedules at month end, including leap years", () => {
    expect(nextRecurrenceDate("2027-01-31", "monthly", 1)).toBe("2027-02-28");
    expect(nextRecurrenceDate("2028-02-29", "monthly", 1)).toBe("2028-03-31");
    expect(nextRecurrenceDate("2026-01-15", "monthly", 1)).toBe("2026-02-15");
  });

  it("rejects invalid intervals", () => {
    expect(() => nextRecurrenceDate("2026-11-06", "monthly", 0)).toThrow();
  });
});

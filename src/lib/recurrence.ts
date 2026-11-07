export type RecurrenceUnit = "weekly" | "monthly";

export function nextRecurrenceDate(dateKey: string, unit: RecurrenceUnit, intervalCount: number): string {
  if (!Number.isInteger(intervalCount) || intervalCount < 1 || intervalCount > 12) throw new Error("Recurrence interval must be between 1 and 12.");
  const [year, month, day] = dateKey.split("-").map(Number);
  if (unit === "weekly") {
    const next = new Date(Date.UTC(year, month - 1, day + 7 * intervalCount));
    return toDateKey(next);
  }
  const currentMonthDays = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const isLastDay = day === currentMonthDays;
  const targetMonth = new Date(Date.UTC(year, month - 1 + intervalCount, 1));
  const targetMonthDays = new Date(Date.UTC(targetMonth.getUTCFullYear(), targetMonth.getUTCMonth() + 1, 0)).getUTCDate();
  const targetDay = isLastDay ? targetMonthDays : Math.min(day, targetMonthDays);
  return `${targetMonth.getUTCFullYear()}-${String(targetMonth.getUTCMonth() + 1).padStart(2, "0")}-${String(targetDay).padStart(2, "0")}`;
}

function toDateKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

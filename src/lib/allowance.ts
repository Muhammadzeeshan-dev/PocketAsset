export type AllowanceSchedule = {
  expected_amount_paisa: string | number | bigint;
  expected_weekdays: number[];
  start_date: string;
  end_date: string | null;
  active: boolean;
};

export function expectedAllowanceForDate(date: string, schedule: AllowanceSchedule | null, isHoliday = false): bigint | null {
  if (!schedule || !schedule.active || date < schedule.start_date || (schedule.end_date !== null && date > schedule.end_date)) return null;
  const [year, month, day] = date.split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  if (isHoliday || !schedule.expected_weekdays.includes(weekday)) return 0n;
  return BigInt(schedule.expected_amount_paisa);
}

export function compareAllowance(actual: bigint, expected: bigint | null): { missed: bigint | null; additional: bigint | null } {
  if (expected === null) return { missed: null, additional: null };
  return {
    missed: expected > actual ? expected - actual : 0n,
    additional: actual > expected ? actual - expected : 0n,
  };
}

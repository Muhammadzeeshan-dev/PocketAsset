import {
  addDaysToDateKey,
  getDaySummary,
  getMonthlySummary,
  getPakistanDateKey,
  type DaySummary,
  type FinanceAccount,
  type FinanceTransaction,
} from "./finance";

export interface CalendarDayCell {
  date: string; // YYYY-MM-DD
  dayNumber: number; // 1 - 31
  isCurrentMonth: boolean;
  isToday: boolean;
  isZeroIncomeDay: boolean;
  isUniversityDay: boolean;
  isHoliday: boolean;
  summary: DaySummary;
}

export interface MonthCalendarData {
  monthKey: string; // YYYY-MM
  monthName: string; // "November 2026"
  days: CalendarDayCell[];
  monthlyIncomePaisa: bigint;
  monthlyExpensesPaisa: bigint;
  monthlySavingsPaisa: bigint;
}

export function getMonthCalendarData(
  monthKey: string, // YYYY-MM
  accounts: FinanceAccount[],
  transactions: FinanceTransaction[],
  todayKey = "2026-11-06",
): MonthCalendarData {
  const [yearStr, monthStr] = monthKey.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10); // 1-12

  const firstDayUtc = new Date(Date.UTC(year, month - 1, 1, 12));
  const monthName = new Intl.DateTimeFormat("en-PK", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(firstDayUtc);

  // Number of days in current month
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  // Weekday of 1st day (0 = Sun, 1 = Mon, ... 6 = Sat)
  const firstDayWeekday = firstDayUtc.getUTCDay();
  // We want grid to start on Monday (Mon = 0, Tue = 1, ... Sun = 6)
  const leadingDaysCount = (firstDayWeekday + 6) % 7;

  const totalGridCells = Math.ceil((leadingDaysCount + daysInMonth) / 7) * 7;
  const gridStartDate = addDaysToDateKey(`${monthKey}-01`, -leadingDaysCount);

  const days: CalendarDayCell[] = [];

  for (let i = 0; i < totalGridCells; i++) {
    const dateStr = addDaysToDateKey(gridStartDate, i);
    const [y, m, d] = dateStr.split("-").map(Number);
    const dateUtc = new Date(Date.UTC(y, m - 1, d, 12));
    const weekday = dateUtc.getUTCDay(); // 0 is Sun, 6 is Sat

    const isCurrentMonth = dateStr.startsWith(monthKey);
    const isToday = dateStr === todayKey;
    const isHoliday = weekday === 0 || weekday === 6; // Sat or Sun
    const isUniversityDay = !isHoliday; // Mon - Fri

    const summary = getDaySummary(dateStr, accounts, transactions);
    const totalReceived = summary.received + summary.otherInflows;
    const isZeroIncomeDay = totalReceived === 0n;

    days.push({
      date: dateStr,
      dayNumber: d,
      isCurrentMonth,
      isToday,
      isZeroIncomeDay,
      isUniversityDay,
      isHoliday,
      summary,
    });
  }

  const monthlySummary = getMonthlySummary(monthKey, transactions);

  return {
    monthKey,
    monthName,
    days,
    monthlyIncomePaisa: monthlySummary.income,
    monthlyExpensesPaisa: monthlySummary.expenses,
    monthlySavingsPaisa: monthlySummary.savings,
  };
}


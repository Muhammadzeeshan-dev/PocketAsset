import { formatPkr, toPaisa, type FinanceTransaction } from "./finance";

export type BudgetType =
  | "daily"
  | "weekly"
  | "monthly"
  | "category"
  | "university"
  | "household"
  | "shopping";

export interface Budget {
  id: string;
  user_id: string;
  name: string;
  budget_type: BudgetType;
  category: string | null;
  amount_paisa: string | number | bigint;
  start_date: string;
  end_date: string | null;
  warning_thresholds: number[];
  is_paused: boolean;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface BudgetStatus {
  budget: Budget;
  spentPaisa: bigint;
  remainingPaisa: bigint;
  percentUsed: number;
  isOverspent: boolean;
  activeAlertThreshold: number | null;
}

export interface DayBudgetComparison {
  date: string;
  dayLabel: string;
  plannedPaisa: bigint;
  spentPaisa: bigint;
  remainingPaisa: bigint;
  isOverspent: boolean;
}

export function calculateBudgetSpending(
  budget: Budget,
  transactions: FinanceTransaction[],
  targetDateOrMonth?: string,
): bigint {
  const amount = toPaisa(budget.amount_paisa);
  if (amount <= 0n) return 0n;

  return transactions.reduce((total, tx) => {
    if (tx.deleted_at || tx.transaction_type !== "expense") return total;
    const txDate = tx.occurred_at.slice(0, 10);

    // Date range check
    if (txDate < budget.start_date) return total;
    if (budget.end_date && txDate > budget.end_date) return total;

    // Optional target date/month filter
    if (targetDateOrMonth) {
      if (targetDateOrMonth.length === 7 && !txDate.startsWith(targetDateOrMonth)) return total;
      if (targetDateOrMonth.length === 10 && txDate !== targetDateOrMonth) return total;
    }

    // Category / Type matching
    if (budget.budget_type === "category" && budget.category) {
      if (tx.category?.toLowerCase() !== budget.category.toLowerCase()) return total;
    } else if (budget.budget_type === "university") {
      const cat = (tx.category || "").toLowerCase();
      const desc = (tx.description || "").toLowerCase();
      const isUni = cat.includes("uni") || cat.includes("bus") || cat.includes("rickshaw") ||
        cat.includes("stationery") || desc.includes("bus") || desc.includes("fare") || desc.includes("uni");
      if (!isUni) return total;
    } else if (budget.budget_type === "household") {
      const cat = (tx.category || "").toLowerCase();
      const isHouse = cat.includes("grocer") || cat.includes("house") || cat.includes("clean") ||
        cat.includes("electric") || cat.includes("gas") || cat.includes("internet");
      if (!isHouse) return total;
    }

    return total + toPaisa(tx.amount_paisa);
  }, 0n);
}

export function evaluateBudgetStatus(
  budget: Budget,
  transactions: FinanceTransaction[],
  targetPeriod?: string,
): BudgetStatus {
  const allocated = toPaisa(budget.amount_paisa);
  const spent = calculateBudgetSpending(budget, transactions, targetPeriod);
  const remaining = allocated - spent;
  const percentUsed = allocated > 0n ? Math.min(Math.round((Number(spent) / Number(allocated)) * 100), 999) : 0;
  const isOverspent = spent > allocated;

  const sortedThresholds = [...(budget.warning_thresholds || [50, 75, 90, 100])].sort((a, b) => b - a);
  let activeAlertThreshold: number | null = null;
  for (const t of sortedThresholds) {
    if (percentUsed >= t) {
      activeAlertThreshold = t;
      break;
    }
  }

  return {
    budget,
    spentPaisa: spent,
    remainingPaisa: remaining,
    percentUsed,
    isOverspent,
    activeAlertThreshold,
  };
}

export function calculateWeeklyBudgetBreakdown(
  weeklyPlannedPaisa: bigint,
  weekStartDate: string, // YYYY-MM-DD (Monday)
  transactions: FinanceTransaction[],
): DayBudgetComparison[] {
  const dailyPlanned = weeklyPlannedPaisa / 7n;
  const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(`${weekStartDate}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + i);
    const dateStr = d.toISOString().slice(0, 10);

    const dayExpenses = transactions.reduce((acc, tx) => {
      if (tx.deleted_at || tx.transaction_type !== "expense") return acc;
      if (tx.occurred_at.slice(0, 10) === dateStr) {
        return acc + toPaisa(tx.amount_paisa);
      }
      return acc;
    }, 0n);

    const rem = dailyPlanned - dayExpenses;
    return {
      date: dateStr,
      dayLabel: weekdays[i],
      plannedPaisa: dailyPlanned,
      spentPaisa: dayExpenses,
      remainingPaisa: rem,
      isOverspent: dayExpenses > dailyPlanned,
    };
  });
}


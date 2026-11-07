import {
  formatPkr,
  toPaisa,
  type FinanceAccount,
  type FinanceTransaction,
  type DaySummary,
  getDaySummary,
  getMonthlySummary,
  getWeeklySummary,
  startOfWeekDateKey,
  addDaysToDateKey,
  getPakistanDateKey,
} from "./finance";

export interface YearlySummary {
  year: string;
  totalIncomePaisa: bigint;
  totalExpensesPaisa: bigint;
  totalSavingsPaisa: bigint;
  monthlyBreakdown: Array<{
    month: string;
    monthName: string;
    incomePaisa: bigint;
    expensesPaisa: bigint;
    savingsPaisa: bigint;
  }>;
  categoryBreakdown: Array<{ category: string; amountPaisa: bigint; percentage: number }>;
}

export function getYearlySummary(year: string, transactions: FinanceTransaction[]): YearlySummary {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  let totalIncome = 0n;
  let totalExpenses = 0n;

  const monthlyBreakdown = months.map((monthName, idx) => {
    const monthNum = String(idx + 1).padStart(2, "0");
    const monthKey = `${year}-${monthNum}`;
    const summary = getMonthlySummary(monthKey, transactions);
    totalIncome += summary.income;
    totalExpenses += summary.expenses;

    return {
      month: monthKey,
      monthName,
      incomePaisa: summary.income,
      expensesPaisa: summary.expenses,
      savingsPaisa: summary.savings,
    };
  });

  const categories = new Map<string, bigint>();
  transactions.forEach((tx) => {
    if (tx.deleted_at || tx.transaction_type !== "expense") return;
    if (!tx.occurred_at.slice(0, 4).includes(year)) return;
    const cat = tx.category?.trim() || "Uncategorized";
    categories.set(cat, (categories.get(cat) ?? 0n) + toPaisa(tx.amount_paisa));
  });

  const totalExp = totalExpenses > 0n ? Number(totalExpenses) : 1;
  const categoryBreakdown = [...categories.entries()]
    .map(([category, amountPaisa]) => ({
      category,
      amountPaisa,
      percentage: Number(((Number(amountPaisa) / totalExp) * 100).toFixed(1)),
    }))
    .sort((a, b) => (b.amountPaisa > a.amountPaisa ? 1 : -1));

  return {
    year,
    totalIncomePaisa: totalIncome,
    totalExpensesPaisa: totalExpenses,
    totalSavingsPaisa: totalIncome - totalExpenses,
    monthlyBreakdown,
    categoryBreakdown,
  };
}

export function generateCsvExport(transactions: FinanceTransaction[], accounts: FinanceAccount[]): string {
  const accountMap = new Map(accounts.map((a) => [a.id, a.name]));

  const headers = [
    "Date & Time",
    "Type",
    "Account",
    "Transfer To",
    "Amount (PKR)",
    "Category",
    "Description",
    "Classification",
    "Notes",
  ];

  const escapeCsv = (val: string | null | undefined) => {
    if (val === null || val === undefined) return '""';
    const s = String(val).replace(/"/g, '""');
    return `"${s}"`;
  };

  const rows = transactions
    .filter((tx) => !tx.deleted_at)
    .sort((a, b) => b.occurred_at.localeCompare(a.occurred_at))
    .map((tx) => {
      const amountRupees = (Number(toPaisa(tx.amount_paisa)) / 100).toFixed(2);
      const accName = accountMap.get(tx.account_id) || "Unknown Account";
      const transferTo = tx.transfer_to_account_id ? accountMap.get(tx.transfer_to_account_id) || "" : "";

      return [
        escapeCsv(tx.occurred_at),
        escapeCsv(tx.transaction_type),
        escapeCsv(accName),
        escapeCsv(transferTo),
        amountRupees,
        escapeCsv(tx.category),
        escapeCsv(tx.description),
        escapeCsv(tx.expense_classification || ""),
        escapeCsv(tx.notes || ""),
      ].join(",");
    });

  return [headers.join(","), ...rows].join("\r\n");
}


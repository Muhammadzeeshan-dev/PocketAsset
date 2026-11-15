import {
  calculateAccountBalance,
  getPakistanDateKey,
  toPaisa,
  type FinanceAccount,
  type FinanceTransaction,
} from "./finance";

export interface RunwayAnalysis {
  pocketCashBalancePaisa: bigint;
  totalLiquidBalancePaisa: bigint;
  averageDailyBurnPaisa: bigint;
  pocketCashRunwayDays: number;
  totalLiquidRunwayDays: number;
  status: "healthy" | "caution" | "critical";
  daysRemainingInMonth: number;
  projectedMonthEndPaisa: bigint;
  recent7DaysExpensesPaisa: bigint;
}

export function calculateCashRunway(
  accounts: FinanceAccount[],
  transactions: FinanceTransaction[],
  referenceDateKey?: string,
): RunwayAnalysis {
  const todayKey = referenceDateKey || getPakistanDateKey(new Date());

  // 1. Identify Cash in hand account
  const cashAcc = accounts.find((a) => a.account_type === "cash" || a.name.toLowerCase().includes("cash"));
  const pocketCashBalancePaisa = cashAcc ? calculateAccountBalance(cashAcc, transactions) : 0n;

  // 2. Identify Total Liquid Balance
  const liquidAccounts = accounts.filter(
    (a) => a.is_active && (a.account_type === "cash" || a.account_type === "wallet" || a.account_type === "bank")
  );
  const totalLiquidBalancePaisa = liquidAccounts.reduce(
    (acc, a) => acc + calculateAccountBalance(a, transactions),
    0n
  );

  // 3. Compute Outflows over past 14 days
  const [yearStr, monthStr, dayStr] = todayKey.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);

  const cutoff7Date = new Date(Date.UTC(year, month - 1, day - 7)).toISOString().slice(0, 10);
  const cutoff14Date = new Date(Date.UTC(year, month - 1, day - 14)).toISOString().slice(0, 10);

  let recent7DaysExpensesPaisa = 0n;
  let recent14DaysExpensesPaisa = 0n;

  for (const tx of transactions) {
    if (tx.deleted_at || tx.transaction_type !== "expense") continue;
    const txDate = getPakistanDateKey(tx.occurred_at);

    if (txDate <= todayKey && txDate >= cutoff7Date) {
      recent7DaysExpensesPaisa += toPaisa(tx.amount_paisa);
    }
    if (txDate <= todayKey && txDate >= cutoff14Date) {
      recent14DaysExpensesPaisa += toPaisa(tx.amount_paisa);
    }
  }

  // If user has recorded transactions in past 14 days, use actual daily average.
  // Otherwise, default to standard university daily student spending: Rs. 450 (45,000 paisa)
  let averageDailyBurnPaisa: bigint;
  if (recent14DaysExpensesPaisa > 0n) {
    averageDailyBurnPaisa = recent14DaysExpensesPaisa / 14n;
    if (averageDailyBurnPaisa === 0n) averageDailyBurnPaisa = 45000n;
  } else if (recent7DaysExpensesPaisa > 0n) {
    averageDailyBurnPaisa = recent7DaysExpensesPaisa / 7n;
  } else {
    averageDailyBurnPaisa = 45000n; // Default Rs. 450/day
  }

  // 4. Calculate Runway in Days
  const pocketCashRunwayDays = averageDailyBurnPaisa > 0n
    ? Math.max(0, Math.floor(Number(pocketCashBalancePaisa) / Number(averageDailyBurnPaisa)))
    : 999;

  const totalLiquidRunwayDays = averageDailyBurnPaisa > 0n
    ? Math.max(0, Math.floor(Number(totalLiquidBalancePaisa) / Number(averageDailyBurnPaisa)))
    : 999;

  // 5. Determine health status
  let status: "healthy" | "caution" | "critical" = "healthy";
  if (pocketCashRunwayDays <= 2 || totalLiquidRunwayDays <= 4) {
    status = "critical";
  } else if (pocketCashRunwayDays <= 6 || totalLiquidRunwayDays <= 10) {
    status = "caution";
  }

  // 6. Projected month-end balance
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const daysRemainingInMonth = Math.max(0, daysInMonth - day);
  const projectedMonthOutflow = averageDailyBurnPaisa * BigInt(daysRemainingInMonth);
  const projectedMonthEndPaisa = totalLiquidBalancePaisa - projectedMonthOutflow;

  return {
    pocketCashBalancePaisa,
    totalLiquidBalancePaisa,
    averageDailyBurnPaisa,
    pocketCashRunwayDays,
    totalLiquidRunwayDays,
    status,
    daysRemainingInMonth,
    projectedMonthEndPaisa,
    recent7DaysExpensesPaisa,
  };
}


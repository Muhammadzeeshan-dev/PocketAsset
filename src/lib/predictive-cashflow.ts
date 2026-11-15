import {
  addDaysToDateKey,
  calculateAccountBalance,
  getPakistanDateKey,
  toPaisa,
  type FinanceAccount,
  type FinanceTransaction,
} from "./finance";

export interface ProjectedDay {
  dateKey: string;
  dayName: string;
  projectedLiquidBalancePaisa: bigint;
  projectedCashPaisa: bigint;
  projectedWalletPaisa: bigint;
  zone: "comfort" | "lean" | "critical";
  flagAlert?: string;
}

export interface CashFlowForecast {
  currentLiquidPaisa: bigint;
  currentCashPaisa: bigint;
  currentWalletPaisa: bigint;
  dailyBurnPaisa: bigint;
  projectedDays: ProjectedDay[];
  daysUntilCashExhaustion: number;
  projectedBalanceDay30Paisa: bigint;
  rebalanceAdvice: {
    needed: boolean;
    recommendedTransferPaisa: bigint;
    sourceAccountName?: string;
    targetAccountName?: string;
    targetDateKey?: string;
    message: string;
  };
}

export function generateCashFlowForecast(
  accounts: FinanceAccount[],
  transactions: FinanceTransaction[],
  startDateKey?: string,
  forecastDays = 30
): CashFlowForecast {
  const todayKey = startDateKey || getPakistanDateKey(new Date());

  const cashAcc = accounts.find((a) => a.account_type === "cash" || a.name.toLowerCase().includes("cash"));
  const walletAccs = accounts.filter((a) => a.account_type === "wallet" || a.name.toLowerCase().includes("jazz") || a.name.toLowerCase().includes("easy"));

  const currentCashPaisa = cashAcc ? calculateAccountBalance(cashAcc, transactions) : 0n;
  const currentWalletPaisa = walletAccs.reduce((sum, a) => sum + calculateAccountBalance(a, transactions), 0n);
  const currentLiquidPaisa = currentCashPaisa + currentWalletPaisa;

  // Calculate daily burn from past 14 days
  const [yearStr, monthStr, dayStr] = todayKey.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  const cutoff14Date = new Date(Date.UTC(year, month - 1, day - 14)).toISOString().slice(0, 10);

  let past14DaysExpenses = 0n;
  for (const tx of transactions) {
    if (tx.deleted_at || tx.transaction_type !== "expense") continue;
    const txDate = getPakistanDateKey(tx.occurred_at);
    if (txDate <= todayKey && txDate >= cutoff14Date) {
      past14DaysExpenses += toPaisa(tx.amount_paisa);
    }
  }

  // Daily student spending velocity: default to Rs. 450 (45,000 paisa) or real historical rate
  let dailyBurnPaisa: bigint;
  if (past14DaysExpenses > 0n) {
    dailyBurnPaisa = past14DaysExpenses / 14n;
    if (dailyBurnPaisa === 0n) dailyBurnPaisa = 45000n;
  } else {
    dailyBurnPaisa = 45000n; // Default Rs. 450 / day
  }

  // Split daily burn: 60% cash, 40% wallet
  const dailyCashBurn = (dailyBurnPaisa * 60n) / 100n;
  const dailyWalletBurn = dailyBurnPaisa - dailyCashBurn;

  const projectedDays: ProjectedDay[] = [];
  let simCash = currentCashPaisa;
  let simWallet = currentWalletPaisa;
  let daysUntilCashExhaustion = 999;

  for (let i = 1; i <= forecastDays; i++) {
    const nextDate = addDaysToDateKey(todayKey, i);
    const [y, m, d] = nextDate.split("-").map(Number);
    const dayName = new Intl.DateTimeFormat("en-PK", { weekday: "short", timeZone: "UTC" })
      .format(new Date(Date.UTC(y, m - 1, d, 12)));

    simCash = simCash - dailyCashBurn;
    simWallet = simWallet - dailyWalletBurn;
    const simLiquid = simCash + simWallet;

    let zone: ProjectedDay["zone"] = "comfort";
    let flagAlert: string | undefined = undefined;

    if (simCash <= 0n) {
      if (daysUntilCashExhaustion === 999) daysUntilCashExhaustion = i;
      zone = "critical";
      flagAlert = "Cash depleted";
    } else if (simCash <= 100000n) { // Rs. 1,000
      zone = "lean";
      flagAlert = "Low cash in hand (< Rs 1,000)";
    }

    projectedDays.push({
      dateKey: nextDate,
      dayName,
      projectedLiquidBalancePaisa: simLiquid > 0n ? simLiquid : 0n,
      projectedCashPaisa: simCash > 0n ? simCash : 0n,
      projectedWalletPaisa: simWallet > 0n ? simWallet : 0n,
      zone,
      flagAlert,
    });
  }

  // Rebalance recommendation
  const primaryWallet = walletAccs.find((a) => calculateAccountBalance(a, transactions) > 200000n);
  const rebalanceNeeded = daysUntilCashExhaustion <= 12 && (primaryWallet !== undefined);

  let rebalanceAdvice: CashFlowForecast["rebalanceAdvice"];
  if (rebalanceNeeded && primaryWallet && cashAcc) {
    const targetDayIndex = Math.max(1, daysUntilCashExhaustion - 2);
    const targetDateKey = addDaysToDateKey(todayKey, targetDayIndex);
    rebalanceAdvice = {
      needed: true,
      recommendedTransferPaisa: 200000n, // Rs. 2,000
      sourceAccountName: primaryWallet.name,
      targetAccountName: cashAcc.name,
      targetDateKey,
      message: `Cash in hand will drop to critical level in ~${daysUntilCashExhaustion} days. Recommended: Transfer Rs. 2,000 from ${primaryWallet.name} to Cash by ${targetDateKey} to avoid running out of pocket allowance.`,
    };
  } else {
    rebalanceAdvice = {
      needed: false,
      recommendedTransferPaisa: 0n,
      message: `Liquidity across cash and mobile wallets is balanced for the current velocity (${Number(dailyBurnPaisa) / 100} PKR/day).`,
    };
  }

  return {
    currentLiquidPaisa,
    currentCashPaisa,
    currentWalletPaisa,
    dailyBurnPaisa,
    projectedDays,
    daysUntilCashExhaustion: daysUntilCashExhaustion === 999 ? 30 : daysUntilCashExhaustion,
    projectedBalanceDay30Paisa: projectedDays[projectedDays.length - 1]?.projectedLiquidBalancePaisa || 0n,
    rebalanceAdvice,
  };
}

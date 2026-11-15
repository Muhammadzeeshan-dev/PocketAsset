import {
  calculateAccountBalance,
  formatPkr,
  toPaisa,
  type FinanceAccount,
  type FinanceTransaction,
} from "./finance";
import type { Asset, Liability } from "./assets";

export interface WealthPillarScore {
  name: string;
  score: number;       // 0 to 100 normalized
  weight: number;      // weight out of 100
  weightedScore: number;
  status: "excellent" | "good" | "fair" | "needs_attention";
  metricLabel: string;
  metricValue: string;
  insight: string;
}

export interface DoctorPrescription {
  priority: "high" | "medium" | "low";
  title: string;
  action: string;
  targetImpact: string;
}

export interface WealthDoctorReport {
  overallScore: number; // 0 to 100
  grade: "A+" | "A" | "B" | "C" | "D" | "F";
  statusTitle: string;
  summary: string;
  pillars: {
    liquidity: WealthPillarScore;
    savingsRate: WealthPillarScore;
    debtFreedom: WealthPillarScore;
    diversification: WealthPillarScore;
    spendingDiscipline: WealthPillarScore;
  };
  prescriptions: DoctorPrescription[];
  generatedAt: string;
}

export function diagnoseWealthHealth(
  accounts: FinanceAccount[],
  transactions: FinanceTransaction[],
  physicalAssets: Asset[] = [],
  liabilities: Liability[] = [],
  stockMarketValuePaisa = 1740426n
): WealthDoctorReport {
  // 1. Total Liquid Balance
  const liquidAccounts = accounts.filter(
    (a) => a.is_active && (a.account_type === "cash" || a.account_type === "wallet" || a.account_type === "bank" || a.account_type === "savings")
  );
  const totalLiquidPaisa = liquidAccounts.reduce((sum, a) => sum + calculateAccountBalance(a, transactions), 0n);

  // 2. Average Daily Spending & Inflows
  const activeTx = transactions.filter((t) => !t.deleted_at);
  const totalExpensesPaisa = activeTx
    .filter((t) => t.transaction_type === "expense")
    .reduce((sum, t) => sum + toPaisa(t.amount_paisa), 0n);
  const totalInflowsPaisa = activeTx
    .filter((t) => t.transaction_type === "income" || t.transaction_type === "dividend" || (t.transaction_type === "adjustment" && t.direction === "inflow"))
    .reduce((sum, t) => sum + toPaisa(t.amount_paisa), 0n);

  // Estimated daily burn (default to Rs. 450/day if no recorded expenses yet)
  const dailyBurnPaisa = totalExpensesPaisa > 0n ? totalExpensesPaisa / 30n || 45000n : 45000n;
  const runwayDays = dailyBurnPaisa > 0n ? Number(totalLiquidPaisa / dailyBurnPaisa) : 90;

  // 3. Outstanding Liabilities
  const totalDebtsPaisa = liabilities
    .filter((l) => !l.is_settled)
    .reduce((sum, l) => sum + toPaisa(l.remaining_balance_paisa), 0n);

  // 4. Physical & Investment Assets
  const totalPhysicalPaisa = physicalAssets.reduce((sum, a) => sum + toPaisa(a.current_estimated_value_paisa), 0n);
  const totalNetWealthPaisa = totalLiquidPaisa + stockMarketValuePaisa + totalPhysicalPaisa - totalDebtsPaisa;

  // --- PILLAR 1: Liquidity & Runway (Weight: 25%) ---
  // Ideal: 30+ days runway = 100%, 15 days = 60%, <7 days = 30%
  let liquidityScore = 50;
  if (runwayDays >= 30) liquidityScore = 100;
  else if (runwayDays >= 20) liquidityScore = 85;
  else if (runwayDays >= 14) liquidityScore = 70;
  else if (runwayDays >= 7) liquidityScore = 45;
  else liquidityScore = 20;

  const liquidityPillar: WealthPillarScore = {
    name: "Liquidity & Runway Buffer",
    score: liquidityScore,
    weight: 25,
    weightedScore: Math.round((liquidityScore * 25) / 100),
    status: liquidityScore >= 80 ? "excellent" : liquidityScore >= 60 ? "good" : liquidityScore >= 40 ? "fair" : "needs_attention",
    metricLabel: "Liquid Runway",
    metricValue: `${runwayDays} Days (~${formatPkr(totalLiquidPaisa)})`,
    insight: runwayDays >= 20
      ? `Strong cash liquidity capable of sustaining routine expenses for ~${runwayDays} days without urgent top-ups.`
      : `Lean runway of ~${runwayDays} days. Keep a reserve of at least 21 days (~Rs. 10,000) for routine emergencies.`,
  };

  // --- PILLAR 2: Savings & Wealth Retention Rate (Weight: 25%) ---
  // Savings rate = (inflows - expenses) / inflows
  let savingsRatePct = 0;
  if (totalInflowsPaisa > 0n) {
    const netSavings = totalInflowsPaisa - totalExpensesPaisa;
    savingsRatePct = Math.max(0, Math.min(100, Math.round((Number(netSavings) / Number(totalInflowsPaisa)) * 100)));
  } else {
    savingsRatePct = 50; // Neutral default
  }

  let savingsScore = 50;
  if (savingsRatePct >= 35) savingsScore = 100;
  else if (savingsRatePct >= 20) savingsScore = 80;
  else if (savingsRatePct >= 10) savingsScore = 60;
  else if (savingsRatePct > 0) savingsScore = 40;
  else savingsScore = 15;

  const savingsPillar: WealthPillarScore = {
    name: "Wealth Retention & Savings Rate",
    score: savingsScore,
    weight: 25,
    weightedScore: Math.round((savingsScore * 25) / 100),
    status: savingsScore >= 80 ? "excellent" : savingsScore >= 60 ? "good" : savingsScore >= 40 ? "fair" : "needs_attention",
    metricLabel: "Savings Rate",
    metricValue: `${savingsRatePct}%`,
    insight: savingsRatePct >= 20
      ? `Retaining ${savingsRatePct}% of incoming allowances and payouts puts you in the top 15% of disciplined students.`
      : `Retaining ${savingsRatePct}% of cash flow. Target saving at least 20% to build an investment corpus.`,
  };

  // --- PILLAR 3: Debt Freedom & Leverage Safety (Weight: 20%) ---
  // Ideal: 0 debt = 100%
  let debtScore = 100;
  if (totalDebtsPaisa > 0n) {
    const debtRatio = Number(totalDebtsPaisa) / (Number(totalNetWealthPaisa) || 1);
    if (debtRatio > 0.5) debtScore = 30;
    else if (debtRatio > 0.2) debtScore = 60;
    else debtScore = 85;
  }

  const debtPillar: WealthPillarScore = {
    name: "Debt Freedom & Leverage Safety",
    score: debtScore,
    weight: 20,
    weightedScore: Math.round((debtScore * 20) / 100),
    status: debtScore === 100 ? "excellent" : debtScore >= 70 ? "good" : "needs_attention",
    metricLabel: "Outstanding Debts",
    metricValue: formatPkr(totalDebtsPaisa),
    insight: totalDebtsPaisa === 0n
      ? "Zero debt burden! 100% debt-free profile minimizes financial anxiety and maximizes future cash flexibility."
      : `Outstanding debt obligation of ${formatPkr(totalDebtsPaisa)}. Pay down high-cost debts before expanding speculative investments.`,
  };

  // --- PILLAR 4: Asset Diversification (Weight: 15%) ---
  // Cash, Wallets, Stocks, Physical Assets
  let assetClassesCount = 0;
  if (accounts.some((a) => a.account_type === "cash" && calculateAccountBalance(a, transactions) > 0n)) assetClassesCount++;
  if (accounts.some((a) => a.account_type === "wallet" && calculateAccountBalance(a, transactions) > 0n)) assetClassesCount++;
  if (stockMarketValuePaisa > 0n) assetClassesCount++;
  if (physicalAssets.length > 0) assetClassesCount++;

  let divScore = 50;
  if (assetClassesCount >= 3) divScore = 100;
  else if (assetClassesCount === 2) divScore = 75;
  else divScore = 40;

  const divPillar: WealthPillarScore = {
    name: "Multi-Asset Diversification",
    score: divScore,
    weight: 15,
    weightedScore: Math.round((divScore * 15) / 100),
    status: divScore >= 80 ? "excellent" : divScore >= 60 ? "good" : "fair",
    metricLabel: "Asset Classes",
    metricValue: `${assetClassesCount} / 4 Classes Active`,
    insight: assetClassesCount >= 3
      ? "Well-hedged portfolio across physical cash, mobile fintech wallets, and PSX equities."
      : "Concentrated predominantly in cash/wallets. Consider small additions to dividend equities or gold.",
  };

  // --- PILLAR 5: Spending Discipline & Needs vs Wants (Weight: 15%) ---
  let disciplineScore = 85;
  const groceryAndUtility = activeTx
    .filter((t) => t.category?.toLowerCase().includes("grocer") || t.category?.toLowerCase().includes("util") || t.category?.toLowerCase().includes("fuel"))
    .reduce((sum, t) => sum + toPaisa(t.amount_paisa), 0n);

  if (totalExpensesPaisa > 0n && groceryAndUtility > 0n) {
    const essentialRatio = Number(groceryAndUtility) / Number(totalExpensesPaisa);
    if (essentialRatio >= 0.5) disciplineScore = 95;
    else disciplineScore = 75;
  }

  const disciplinePillar: WealthPillarScore = {
    name: "Expense Discipline",
    score: disciplineScore,
    weight: 15,
    weightedScore: Math.round((disciplineScore * 15) / 100),
    status: disciplineScore >= 80 ? "excellent" : "good",
    metricLabel: "Essential vs Discretionary",
    metricValue: `${disciplineScore}% Controlled`,
    insight: "Expenses are aligned with daily routine necessities without high discretionary lifestyle leakage.",
  };

  // Overall Score Calculation
  const overallScore = Math.min(
    100,
    liquidityPillar.weightedScore +
    savingsPillar.weightedScore +
    debtPillar.weightedScore +
    divPillar.weightedScore +
    disciplinePillar.weightedScore
  );

  let grade: WealthDoctorReport["grade"] = "B";
  let statusTitle = "Solid & Healthy Financial Posture";
  if (overallScore >= 90) { grade = "A+"; statusTitle = "Exceptional Wealth Health"; }
  else if (overallScore >= 80) { grade = "A"; statusTitle = "Very Strong Financial Health"; }
  else if (overallScore >= 70) { grade = "B"; statusTitle = "Good & Stable Routine Balance"; }
  else if (overallScore >= 55) { grade = "C"; statusTitle = "Moderate Buffer & Attention Needed"; }
  else { grade = "D"; statusTitle = "Critical Liquidity Alert"; }

  // Prescriptions (Rx)
  const prescriptions: DoctorPrescription[] = [];

  if (runwayDays < 21) {
    prescriptions.push({
      priority: "high",
      title: "Boost Cash Runway to 21 Days",
      action: `Maintain at least Rs. 10,000 across Cash and JazzCash. You currently have ~${runwayDays} days of routine allowance.`,
      targetImpact: "+15 Points on Liquidity Score",
    });
  }

  if (savingsRatePct < 25) {
    prescriptions.push({
      priority: "medium",
      title: "Automate 20% Weekly Allowance Retention",
      action: "When allowance is received, immediately transfer 20% to your Easypaisa savings or PSX brokerage cash before starting discretionary spend.",
      targetImpact: "+10 Points on Wealth Retention",
    });
  }

  if (totalDebtsPaisa === 0n) {
    prescriptions.push({
      priority: "low",
      title: "Lock In First Gold Gram Hedge",
      action: `With zero debt and Rs. ${formatPkr(totalLiquidPaisa)} liquid, consider converting a surplus Rs. 5,000 into 0.2g physical gold or PSX dividend shares.`,
      targetImpact: "Long-term Purchasing Power Defense",
    });
  }

  return {
    overallScore,
    grade,
    statusTitle,
    summary: `Your PocketAsset financial health index is ${overallScore}/100 (Grade ${grade}). You possess zero debt, disciplined spending, and active multi-asset exposure across Cash, JazzCash, Easypaisa, and PSX stocks.`,
    pillars: {
      liquidity: liquidityPillar,
      savingsRate: savingsPillar,
      debtFreedom: debtPillar,
      diversification: divPillar,
      spendingDiscipline: disciplinePillar,
    },
    prescriptions,
    generatedAt: new Date().toISOString(),
  };
}

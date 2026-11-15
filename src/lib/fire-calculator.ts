import { formatPkr } from "./finance";

export interface WealthMilestone {
  id: string;
  title: string;
  targetPaisa: bigint;
  description: string;
  currentProgressPct: number;
  monthsRemaining: number;
  targetDateStr: string;
  isAchieved: boolean;
}

export interface FireSimulationResult {
  currentNetWorthPaisa: bigint;
  monthlySavingsPaisa: bigint;
  annualReturnRatePct: number; // e.g. 14%
  annualInflationRatePct: number; // e.g. 11%
  realReturnRatePct: number;
  milestones: WealthMilestone[];
  fireNumberPaisa: bigint; // 25x annual expenses (4% rule)
  yearsToFullFire: number;
  compoundedBalance5YearsPaisa: bigint;
  compoundedBalance10YearsPaisa: bigint;
}

export function simulateWealthMilestones(
  currentNetWorthPaisa: bigint,
  monthlySavingsPaisa: bigint,
  annualExpensesPaisa: bigint,
  annualReturnRatePct = 14.5,
  annualInflationRatePct = 11.0
): FireSimulationResult {
  const realReturnRate = Math.max(1, annualReturnRatePct - annualInflationRatePct);
  const monthlyRate = annualReturnRatePct / 100 / 12;

  // FIRE Number = 25x Annual Living Expenses (Standard 4% safe withdrawal rule)
  // Default annual expense benchmark: Rs. 360,000 (Rs. 30k/month) if none recorded
  const livingExpenses = annualExpensesPaisa > 0n ? annualExpensesPaisa : 36000000n;
  const fireNumberPaisa = livingExpenses * 25n;

  const milestonesDef = [
    { id: "lakh-1", title: "First 1 Lakh (PKR 100k)", targetPaisa: 10000000n, desc: "Foundational Emergency & Routine Buffer" },
    { id: "lakh-5", title: "Half Million (PKR 500k)", targetPaisa: 50000000n, desc: "Liquid Cushion & Serious Capital" },
    { id: "million-1", title: "First Million (PKR 10 Lakh)", targetPaisa: 100000000n, desc: "The Milestone: Compound Interest Takes Flight" },
    { id: "crore-1", title: "First Crore (PKR 10 Million)", targetPaisa: 1000000000n, desc: "Generational Wealth & Complete Financial Independence" },
  ];

  const milestones: WealthMilestone[] = milestonesDef.map((m) => {
    const isAchieved = currentNetWorthPaisa >= m.targetPaisa;
    const progress = Math.min(100, Math.round((Number(currentNetWorthPaisa) / Number(m.targetPaisa)) * 100));

    if (isAchieved) {
      return {
        id: m.id,
        title: m.title,
        targetPaisa: m.targetPaisa,
        description: m.desc,
        currentProgressPct: 100,
        monthsRemaining: 0,
        targetDateStr: "Achieved ✓",
        isAchieved: true,
      };
    }

    // Simulate months required with compounding
    let simWealth = Number(currentNetWorthPaisa);
    const monthlyContribution = Number(monthlySavingsPaisa) > 0 ? Number(monthlySavingsPaisa) : 500000; // default Rs. 5,000/mo
    let months = 0;

    while (simWealth < Number(m.targetPaisa) && months < 600) {
      simWealth = simWealth * (1 + monthlyRate) + monthlyContribution;
      months++;
    }

    const today = new Date();
    const targetDate = new Date(today.getFullYear(), today.getMonth() + months, 1);
    const targetDateStr = targetDate.toLocaleDateString("en-PK", { month: "short", year: "numeric" });

    return {
      id: m.id,
      title: m.title,
      targetPaisa: m.targetPaisa,
      description: m.desc,
      currentProgressPct: progress,
      monthsRemaining: months,
      targetDateStr,
      isAchieved: false,
    };
  });

  // Calculate Compounded wealth after 5 and 10 years
  let wealth5yr = Number(currentNetWorthPaisa);
  const monthlySavingsNum = Number(monthlySavingsPaisa) > 0 ? Number(monthlySavingsPaisa) : 500000;

  for (let m = 0; m < 60; m++) {
    wealth5yr = wealth5yr * (1 + monthlyRate) + monthlySavingsNum;
  }

  let wealth10yr = Number(currentNetWorthPaisa);
  for (let m = 0; m < 120; m++) {
    wealth10yr = wealth10yr * (1 + monthlyRate) + monthlySavingsNum;
  }

  // Years to Full FIRE
  let simFire = Number(currentNetWorthPaisa);
  let fireMonths = 0;
  while (simFire < Number(fireNumberPaisa) && fireMonths < 600) {
    simFire = simFire * (1 + monthlyRate) + monthlySavingsNum;
    fireMonths++;
  }
  const yearsToFullFire = Number((fireMonths / 12).toFixed(1));

  return {
    currentNetWorthPaisa,
    monthlySavingsPaisa,
    annualReturnRatePct,
    annualInflationRatePct,
    realReturnRatePct: Number(realReturnRate.toFixed(1)),
    milestones,
    fireNumberPaisa,
    yearsToFullFire,
    compoundedBalance5YearsPaisa: BigInt(Math.round(wealth5yr)),
    compoundedBalance10YearsPaisa: BigInt(Math.round(wealth10yr)),
  };
}

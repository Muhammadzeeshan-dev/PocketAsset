import { toPaisa, type FinanceAccount, type FinanceTransaction } from "./finance";

export type SavingsGoalCategory =
  | "emergency_fund"
  | "university"
  | "laptop"
  | "education"
  | "personal"
  | "investments"
  | "custom";

export interface SavingsGoal {
  id: string;
  user_id: string;
  name: string;
  target_amount_paisa: string | number | bigint;
  current_saved_paisa: string | number | bigint;
  target_date: string | null;
  priority: "low" | "medium" | "high";
  status: "active" | "paused" | "completed";
  category: SavingsGoalCategory;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface SavingsAllocation {
  id: string;
  goal_id: string;
  user_id: string;
  source_account_id?: string | null;
  amount_paisa: string | number | bigint;
  direction: "allocated" | "withdrawn";
  notes?: string | null;
  created_at: string;
}

export interface EmergencyFundMilestone {
  title: string;
  targetPaisa: bigint;
  description: string;
}

export function getEmergencyFundMilestones(monthlyEssentialExpensesPaisa: bigint): EmergencyFundMilestone[] {
  const oneMonth = monthlyEssentialExpensesPaisa > 0n ? monthlyEssentialExpensesPaisa : 2500000n; // Default Rs 25,000 if no data
  return [
    { title: "Starter Cushion", targetPaisa: 500000n, description: "Rs. 5,000 initial emergency shield" },
    { title: "Core Buffer", targetPaisa: 1000000n, description: "Rs. 10,000 safety cushion" },
    { title: "Major Reserve", targetPaisa: 2500000n, description: "Rs. 25,000 resilient rainy-day fund" },
    { title: "1 Month Essentials", targetPaisa: oneMonth, description: "1 full month of living & university essentials" },
    { title: "3 Months Essentials", targetPaisa: oneMonth * 3n, description: "3 full months of living & university essentials" },
  ];
}

export function calculateGoalProgress(goal: SavingsGoal): {
  targetPaisa: bigint;
  savedPaisa: bigint;
  percent: number;
  remainingPaisa: bigint;
  isCompleted: boolean;
} {
  const target = toPaisa(goal.target_amount_paisa);
  const saved = toPaisa(goal.current_saved_paisa);
  const remaining = target > saved ? target - saved : 0n;
  const percent = target > 0n ? Math.min(Math.round((Number(saved) / Number(target)) * 100), 100) : 0;
  return {
    targetPaisa: target,
    savedPaisa: saved,
    percent,
    remainingPaisa: remaining,
    isCompleted: saved >= target && target > 0n,
  };
}

export function calculateTotalAllocatedSavings(goals: SavingsGoal[]): bigint {
  return goals.reduce((sum, g) => sum + toPaisa(g.current_saved_paisa), 0n);
}

export function calculateUnallocatedLiquidMoney(
  totalLiquidPaisa: bigint,
  goals: SavingsGoal[],
): bigint {
  const allocated = calculateTotalAllocatedSavings(goals);
  return totalLiquidPaisa > allocated ? totalLiquidPaisa - allocated : 0n;
}


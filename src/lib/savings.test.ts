import { describe, expect, it } from "vitest";
import {
  calculateGoalProgress,
  calculateTotalAllocatedSavings,
  calculateUnallocatedLiquidMoney,
  getEmergencyFundMilestones,
  type SavingsGoal,
} from "./savings";

describe("Savings and emergency fund rules", () => {
  const sampleGoal: SavingsGoal = {
    id: "g1",
    user_id: "u1",
    name: "Emergency Fund",
    target_amount_paisa: 1000000n, // Rs. 10,000
    current_saved_paisa: 600000n, // Rs. 6,000
    target_date: "2026-12-31",
    priority: "high",
    status: "active",
    category: "emergency_fund",
  };

  it("calculates progress percentage and remaining amount without double-counting", () => {
    const progress = calculateGoalProgress(sampleGoal);
    expect(progress.percent).toBe(60);
    expect(progress.remainingPaisa).toBe(400000n); // Rs. 4,000
    expect(progress.isCompleted).toBe(false);
  });

  it("calculates unallocated liquid cash clearly", () => {
    const totalLiquid = 1500000n; // Rs. 15,000
    const unallocated = calculateUnallocatedLiquidMoney(totalLiquid, [sampleGoal]);
    expect(unallocated).toBe(900000n); // Rs. 9,000 remaining unallocated
  });

  it("generates correct emergency fund milestones", () => {
    const milestones = getEmergencyFundMilestones(3000000n); // Rs. 30,000 essential
    expect(milestones[0].targetPaisa).toBe(500000n); // Rs. 5,000
    expect(milestones[3].targetPaisa).toBe(3000000n); // Rs. 30,000
    expect(milestones[4].targetPaisa).toBe(9000000n); // Rs. 90,000 (3 mo)
  });
});


import { describe, expect, it } from "vitest";
import { simulateWealthMilestones } from "./fire-calculator";

describe("Milestone Wealth Projection & FIRE Suite", () => {
  it("projects progression toward First Lakh and First Million with compound returns", () => {
    // Current net worth: Rs. 26,000 (Liquid ~8,800 + Stocks ~17,400)
    const currentWealth = 2600000n;
    // Monthly savings contribution: Rs. 5,000
    const monthlySavings = 500000n;
    // Annual living expenses: Rs. 200,000
    const annualExpenses = 20000000n;

    const sim = simulateWealthMilestones(
      currentWealth,
      monthlySavings,
      annualExpenses,
      14.5,
      11.0
    );

    expect(sim.milestones.length).toBe(4);
    // 25x annual expenses of 200k = Rs. 5,000,000
    expect(sim.fireNumberPaisa).toBe(500000000n);
    expect(sim.compoundedBalance5YearsPaisa).toBeGreaterThan(currentWealth);
    expect(sim.compoundedBalance10YearsPaisa).toBeGreaterThan(sim.compoundedBalance5YearsPaisa);
    expect(sim.yearsToFullFire).toBeGreaterThan(0);
  });

  it("marks already achieved milestones as 100% complete", () => {
    // Current net worth: Rs. 150,000 (Already passed First Lakh of 100k)
    const currentWealth = 15000000n;
    const sim = simulateWealthMilestones(currentWealth, 500000n, 20000000n);

    const lakhMilestone = sim.milestones.find((m) => m.id === "lakh-1")!;
    expect(lakhMilestone.isAchieved).toBe(true);
    expect(lakhMilestone.currentProgressPct).toBe(100);
    expect(lakhMilestone.targetDateStr).toBe("Achieved ✓");
  });
});

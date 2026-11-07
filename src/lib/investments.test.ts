import { describe, expect, it } from "vitest";
import {
  calculateHoldingMetrics,
  calculatePortfolioSummary,
  INITIAL_VERIFIED_HOLDINGS,
  type StockHolding,
} from "./investments";

describe("PSX Investment Portfolio rules", () => {
  const dummyHoldings: StockHolding[] = INITIAL_VERIFIED_HOLDINGS.map((h, i) => ({
    ...h,
    id: `holding-${i + 1}`,
    user_id: "user-1",
  }));

  it("calculates FFC metrics accurately based on opening values", () => {
    const ffc = dummyHoldings.find((h) => h.symbol === "FFC")!;
    const metrics = calculateHoldingMetrics(ffc);
    // 6 * 525.62 = 3153.72 (315372 paisa)
    expect(metrics.totalCostPaisa).toBe(315372n);
    // 6 * 562.81 = 3376.86 (337686 paisa)
    expect(metrics.marketValuePaisa).toBe(337686n);
    expect(metrics.unrealizedPaisa).toBe(22314n); // Rs. 223.14 profit
    expect(metrics.returnPercentage).toBeGreaterThan(0);
  });

  it("calculates exact portfolio cost (Rs. 16,148.63), market value (Rs. 17,404.26) and profit (Rs. 1,255.63)", () => {
    const summary = calculatePortfolioSummary(dummyHoldings);
    expect(summary.totalCostPaisa).toBe(1614863n);
    expect(summary.totalMarketValuePaisa).toBe(1740426n);
    expect(summary.totalUnrealizedPaisa).toBe(125563n);
    expect(summary.totalReturnPercentage).toBeCloseTo(7.78, 1);
  });

  it("ensures stock holdings sum up to 100% allocation", () => {
    const summary = calculatePortfolioSummary(dummyHoldings);
    const sumAllocations = summary.holdings.reduce((sum, h) => sum + h.allocationPercentage, 0);
    expect(Math.round(sumAllocations)).toBe(100);
  });
});


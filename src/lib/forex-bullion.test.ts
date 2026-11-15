import { describe, expect, it } from "vitest";
import {
  calculateHedgeMetrics,
  convertForeignToPkr,
  convertPkrToForeign,
  getGoldRatePerGram,
  LIVE_BULLION_RATES,
} from "./forex-bullion";

describe("Pakistan Saraf Bullion & Forex Hedge Suite", () => {
  it("calculates accurate gold rate per gram from tola price", () => {
    // 282,500 / 11.6638 = ~24,220
    const perGram = getGoldRatePerGram(LIVE_BULLION_RATES);
    expect(perGram).toBeGreaterThan(2400000n); // 24,000+
    expect(perGram).toBeLessThan(2500000n);
  });

  it("converts foreign currency to PKR and back accurately", () => {
    // $100 USD at 278.40 = Rs. 27,840 (2,784,000 paisa)
    const pkrPaisa = convertForeignToPkr(100, "USD");
    expect(pkrPaisa).toBe(2784000n);

    // Convert 2,784,000 paisa back to USD
    const usd = convertPkrToForeign(pkrPaisa, "USD");
    expect(usd).toBe(100);
  });

  it("evaluates lean university student liquid wealth (e.g. Rs. 8,809) with optimal liquidity advice", () => {
    const liquidPaisa = 880900n; // Rs. 8,809
    const metrics = calculateHedgeMetrics(liquidPaisa, 11.8);

    expect(metrics.usdEquivalent).toBe(31.64);
    expect(metrics.goldGramsEquivalent).toBeGreaterThan(0.3);
    expect(metrics.silverTolasEquivalent).toBeGreaterThan(2.5);
    expect(metrics.hedgeRecommendation.status).toBe("optimal_liquidity");
    expect(metrics.hedgeRecommendation.advice).toContain("100% in liquid Cash / JazzCash");
  });

  it("suggests inflation hedge when liquid reserves exceed Rs. 50,000", () => {
    const surplusPaisa = 6500000n; // Rs. 65,000
    const metrics = calculateHedgeMetrics(surplusPaisa, 12.0);

    expect(metrics.usdEquivalent).toBeGreaterThan(230);
    expect(metrics.hedgeRecommendation.status).toBe("surplus_invest");
    expect(metrics.hedgeRecommendation.advice).toContain("dividend-yielding PSX stocks");
  });
});

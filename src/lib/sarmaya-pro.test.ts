import { describe, it, expect } from "vitest";
import {
  PSX_DIVIDEND_ARISTOCRATS,
  calculateDividendForecast,
  calculateDripGrowth,
  runMonteCarloSimulation,
  calculateMacroStressTest,
  calculateFireMatrix,
  filterAndSortPsxStocks,
  calculateKse100ValuationThermometer,
  calculateQuantumGoalPlan,
  PRESET_QUANTUM_GOALS,
} from "./sarmaya-pro";

describe("Sarmaya Pro Financial Suite calculations", () => {
  it("provides comprehensive PSX dividend aristocrats data", () => {
    expect(PSX_DIVIDEND_ARISTOCRATS.length).toBeGreaterThanOrEqual(8);
    const ffc = PSX_DIVIDEND_ARISTOCRATS.find((s) => s.ticker === "FFC");
    expect(ffc).toBeDefined();
    expect(ffc?.priceRupees).toBeGreaterThan(0);
    expect(ffc?.dividendYieldPercent).toBeGreaterThan(10);
    expect(ffc?.payoutFrequency).toBe("Quarterly");
  });

  it("calculates dividend forecasts with accurate 15% filer vs 30% non-filer FBR withholding tax", () => {
    const ffc = PSX_DIVIDEND_ARISTOCRATS.find((s) => s.ticker === "FFC")!;
    const shares = 1000;

    // Filer (15% tax)
    const filerForecast = calculateDividendForecast(ffc, shares, true);
    expect(filerForecast.withholdingTaxPercent).toBe(15);
    expect(filerForecast.grossAnnualDividendRupees).toBe(Math.round(1000 * ffc.annualDpsRupees));
    expect(filerForecast.withholdingTaxRupees).toBe(Math.round(filerForecast.grossAnnualDividendRupees * 0.15));
    expect(filerForecast.netAnnualDividendRupees).toBe(
      filerForecast.grossAnnualDividendRupees - filerForecast.withholdingTaxRupees
    );

    // Non-Filer (30% tax penalty)
    const nonFilerForecast = calculateDividendForecast(ffc, shares, false);
    expect(nonFilerForecast.withholdingTaxPercent).toBe(30);
    expect(nonFilerForecast.taxSavingsByBeingFilerRupees).toBeGreaterThan(0);
    expect(filerForecast.netAnnualDividendRupees).toBeGreaterThan(nonFilerForecast.netAnnualDividendRupees);
  });

  it("calculates DRIP (Dividend Reinvestment Plan) compounding over 10 years", () => {
    const initialCapital = 100_000;
    const dividendYield = 15;
    const capitalAppreciation = 8;
    const drip = calculateDripGrowth(initialCapital, dividendYield, capitalAppreciation, 10, true);

    expect(drip).toHaveLength(10);
    expect(drip[0].year).toBe(1);
    expect(drip[9].year).toBe(10);
    // Compounding advantage should be significantly higher at year 10 than year 1
    expect(drip[9].withDripValueRupees).toBeGreaterThan(drip[9].withoutDripValueRupees);
    expect(drip[9].compoundAdvantagePercent).toBeGreaterThan(15);
  });

  it("runs 30-year Monte Carlo wealth simulation with milestone predictions", () => {
    const sim = runMonteCarloSimulation({
      currentAge: 25,
      startingWealthRupees: 50_000,
      monthlyContributionRupees: 20_000,
      expectedAnnualReturnPercent: 15,
      annualVolatilityPercent: 16,
      annualInflationPercent: 9.5,
      simulationYears: 30,
    });

    expect(sim.projections).toHaveLength(30);
    expect(sim.projections[0].age).toBe(26);
    expect(sim.projections[29].age).toBe(55);

    // Median should exceed conservative, and optimistic should exceed median
    const year10 = sim.projections[9];
    expect(year10.optimisticRupees).toBeGreaterThan(year10.medianRupees);
    expect(year10.medianRupees).toBeGreaterThan(year10.conservativeRupees);

    // Milestone should identify when 1 Crore is reached
    expect(sim.milestones.yearsToOneCrore).not.toBeNull();
    expect(sim.milestones.probabilityOfReachingOneCrorePercent).toBeGreaterThan(50);
  });

  it("evaluates macroeconomic shocks and survival runway in stress test shield", () => {
    // Test with user's verified liquid balance: Rs. 8,809 (880,900 paisa)
    const liquidPaisa = 880_900n;
    const essentialPaisa = 15_000_00n; // Rs. 15,000 / month
    const totalPaisa = 25_000_00n; // Rs. 25,000 / month

    const stress = calculateMacroStressTest(liquidPaisa, essentialPaisa, totalPaisa);
    expect(stress.currentLiquidRupees).toBe(8809);
    expect(stress.scenarios).toHaveLength(4);

    const zeroIncome = stress.scenarios.find((s) => s.id === "zero-income");
    expect(zeroIncome).toBeDefined();
    expect(zeroIncome?.liquidityRunwayMonths).toBeLessThan(1); // 8809 / 15000 is ~0.6 months
    expect(zeroIncome?.severityLevel).toBe("Critical");

    const pkrDeval = stress.scenarios.find((s) => s.id === "pkr-devaluation");
    expect(pkrDeval?.defensiveRecommendations.length).toBeGreaterThan(0);
  });

  it("calculates Pakistani FIRE Matrix with Lean, Standard, and Fat FIRE targets", () => {
    const essentialPaisa = 30_000_00n; // Rs. 30,000 / month
    const totalPaisa = 50_000_00n; // Rs. 50,000 / month
    const netWorthPaisa = 100_000_00n; // Rs. 100,000
    const savingsPaisa = 15_000_00n; // Rs. 15,000 / month

    const fire = calculateFireMatrix(essentialPaisa, totalPaisa, netWorthPaisa, savingsPaisa);

    // Lean FIRE: 25x annual essential (30,000 * 12 * 25 = 9,000,000 = 90 Lakhs)
    expect(fire.leanFire.corpusRupees).toBe(9_000_000);
    // Standard FIRE: 30x annual total (50,000 * 12 * 30 = 18,000,000 = 1.8 Crore)
    expect(fire.standardFire.corpusRupees).toBe(18_000_000);
    // Fat FIRE: 40x annual luxury
    expect(fire.fatFire.corpusRupees).toBeGreaterThan(fire.standardFire.corpusRupees);
  });

  it("filters and sorts PSX alpha screener stocks accurately", () => {
    // 1. Sector filter
    const fertilizerStocks = filterAndSortPsxStocks(PSX_DIVIDEND_ARISTOCRATS, { sector: "Fertilizer" });
    expect(fertilizerStocks.length).toBeGreaterThanOrEqual(2);
    fertilizerStocks.forEach((s) => expect(s.sector).toBe("Fertilizer"));

    // 2. Shariah compliance filter
    const shariahOnly = filterAndSortPsxStocks(PSX_DIVIDEND_ARISTOCRATS, { shariahOnly: true });
    expect(shariahOnly.length).toBeGreaterThanOrEqual(5);
    shariahOnly.forEach((s) => expect(s.isShariahCompliant).toBe(true));

    // 3. Sort by yield descending
    const byYield = filterAndSortPsxStocks(PSX_DIVIDEND_ARISTOCRATS, { sortBy: "yield" });
    for (let i = 0; i < byYield.length - 1; i++) {
      expect(byYield[i].dividendYieldPercent).toBeGreaterThanOrEqual(byYield[i + 1].dividendYieldPercent);
    }

    // 4. Search query
    const meezanSearch = filterAndSortPsxStocks(PSX_DIVIDEND_ARISTOCRATS, { searchQuery: "meezan" });
    expect(meezanSearch.some((s) => s.ticker === "MEBL")).toBe(true);
  });

  it("evaluates KSE-100 valuation thermometer and regime analysis", () => {
    const thermometer = calculateKse100ValuationThermometer();
    expect(thermometer.currentKseIndex).toBeGreaterThan(90000);
    expect(thermometer.forwardPeRatio).toBeLessThan(6);
    expect(thermometer.peDiscountPercent).toBeGreaterThan(30);
    expect(thermometer.marketRegime).toBe("DEEP_VALUE");
    expect(thermometer.thermometerScore).toBeGreaterThanOrEqual(80);
    expect(
      thermometer.tacticalAllocation.equitiesPercent +
      thermometer.tacticalAllocation.sovereignSukukOrGovtPercent +
      thermometer.tacticalAllocation.goldBullionPercent +
      thermometer.tacticalAllocation.liquidCashPercent
    ).toBe(100);
  });

  it("calculates quantum wealth milestone goals with inflation adjustments", () => {
    expect(PRESET_QUANTUM_GOALS.length).toBeGreaterThanOrEqual(5);

    // Goal: 1 Crore in 8 years starting with 0 capital at 15% return and 9% inflation
    const goal = calculateQuantumGoalPlan(10_000_000, 8, 0, 15, 9);
    expect(goal.nominalTargetRupees).toBe(10_000_000);
    expect(goal.inflationAdjustedTargetRupees).toBeGreaterThan(goal.nominalTargetRupees);
    expect(goal.requiredMonthlySipRupees).toBeGreaterThan(0);
    expect(goal.wealthCreatedByCompoundingRupees).toBeGreaterThan(0);
    expect(goal.compoundingMultiplier).toBeGreaterThan(1);
  });
});

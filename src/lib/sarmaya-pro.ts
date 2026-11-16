// ============================================================================
// PocketAsset Sarmaya Pro Financial Suite - Institutional Wealth Engine
// Inspired by Sarmaya.pk Premium & INDmoney / Zerodha Console Pro
// Tailored for Pakistan (PSX, FBR ATL Tax, Inflation CPI, FIRE)
// ============================================================================

export interface PsxDividendStock {
  ticker: string;
  name: string;
  sector: string;
  priceRupees: number;
  dividendYieldPercent: number;
  annualDpsRupees: number; // Dividend Per Share
  payoutFrequency: "Quarterly" | "Bi-Annual" | "Annual";
  typicalExMonths: string[];
  description: string;
  peRatio?: number;
  pbRatio?: number;
  roePercent?: number;
  beta?: number;
  grahamFairValueRupees?: number;
  valuationDiscountPercent?: number;
  isShariahCompliant?: boolean;
  alphaScore?: number;
  alphaRating?: "A+" | "A" | "B+" | "B";
}

export const PSX_DIVIDEND_ARISTOCRATS: PsxDividendStock[] = [
  {
    ticker: "FFC",
    name: "Fauji Fertilizer Company",
    sector: "Fertilizer",
    priceRupees: 285.5,
    dividendYieldPercent: 16.5,
    annualDpsRupees: 47.1,
    payoutFrequency: "Quarterly",
    typicalExMonths: ["Apr", "Jul", "Oct", "Jan"],
    description: "Pakistan's premier fertilizer giant with consistent quarterly dividend track record since 1978.",
    peRatio: 5.8,
    pbRatio: 2.4,
    roePercent: 42.0,
    beta: 0.72,
    grahamFairValueRupees: 340.0,
    valuationDiscountPercent: 19.1,
    isShariahCompliant: true,
    alphaScore: 94,
    alphaRating: "A+",
  },
  {
    ticker: "HUBC",
    name: "The Hub Power Company",
    sector: "Power Generation",
    priceRupees: 135.2,
    dividendYieldPercent: 18.2,
    annualDpsRupees: 24.6,
    payoutFrequency: "Quarterly",
    typicalExMonths: ["Feb", "Apr", "Sep", "Nov"],
    description: "Largest independent power producer (IPP) with steady dollar-indexed and rupee cash flows.",
    peRatio: 3.9,
    pbRatio: 1.1,
    roePercent: 28.5,
    beta: 0.85,
    grahamFairValueRupees: 185.0,
    valuationDiscountPercent: 36.8,
    isShariahCompliant: true,
    alphaScore: 91,
    alphaRating: "A+",
  },
  {
    ticker: "ENGRO",
    name: "Engro Corporation",
    sector: "Conglomerate",
    priceRupees: 340.0,
    dividendYieldPercent: 14.8,
    annualDpsRupees: 50.32,
    payoutFrequency: "Quarterly",
    typicalExMonths: ["Apr", "Aug", "Nov", "Dec"],
    description: "Diversified blue-chip holding company across energy, petrochemicals, telecommunications, and agriculture.",
    peRatio: 5.2,
    pbRatio: 1.3,
    roePercent: 25.0,
    beta: 0.89,
    grahamFairValueRupees: 420.0,
    valuationDiscountPercent: 23.5,
    isShariahCompliant: true,
    alphaScore: 89,
    alphaRating: "A",
  },
  {
    ticker: "OGDC",
    name: "Oil & Gas Development Co.",
    sector: "Oil & Gas Exploration",
    priceRupees: 142.8,
    dividendYieldPercent: 13.9,
    annualDpsRupees: 19.85,
    payoutFrequency: "Quarterly",
    typicalExMonths: ["Mar", "May", "Oct", "Dec"],
    description: "State-owned E&P flagship with immense dollar-denominated hydrocarbon reserves.",
    peRatio: 3.6,
    pbRatio: 0.7,
    roePercent: 20.4,
    beta: 0.95,
    grahamFairValueRupees: 210.0,
    valuationDiscountPercent: 47.1,
    isShariahCompliant: true,
    alphaScore: 88,
    alphaRating: "A",
  },
  {
    ticker: "MCB",
    name: "MCB Bank Limited",
    sector: "Commercial Banking",
    priceRupees: 228.4,
    dividendYieldPercent: 17.5,
    annualDpsRupees: 40.0,
    payoutFrequency: "Quarterly",
    typicalExMonths: ["Apr", "Aug", "Oct", "Feb"],
    description: "Highest CAR and lowest NPL ratio in the Pakistani banking sector with generous quarterly payouts.",
    peRatio: 3.8,
    pbRatio: 1.2,
    roePercent: 31.5,
    beta: 0.78,
    grahamFairValueRupees: 310.0,
    valuationDiscountPercent: 35.7,
    isShariahCompliant: false,
    alphaScore: 92,
    alphaRating: "A+",
  },
  {
    ticker: "EFERT",
    name: "Engro Fertilizers",
    sector: "Fertilizer",
    priceRupees: 178.6,
    dividendYieldPercent: 17.1,
    annualDpsRupees: 30.5,
    payoutFrequency: "Quarterly",
    typicalExMonths: ["Apr", "Aug", "Oct", "Dec"],
    description: "High-margin urea & DAP producer with nearly 100% earnings distribution policy.",
    peRatio: 5.4,
    pbRatio: 2.1,
    roePercent: 39.2,
    beta: 0.74,
    grahamFairValueRupees: 220.0,
    valuationDiscountPercent: 23.2,
    isShariahCompliant: true,
    alphaScore: 93,
    alphaRating: "A+",
  },
  {
    ticker: "POL",
    name: "Pakistan Oilfields Limited",
    sector: "Oil & Gas Exploration",
    priceRupees: 485.0,
    dividendYieldPercent: 15.2,
    annualDpsRupees: 73.72,
    payoutFrequency: "Bi-Annual",
    typicalExMonths: ["Jan", "Sep"],
    description: "Cash-rich explorer in the Potwar basin, debt-free balance sheet with massive payouts.",
    peRatio: 4.6,
    pbRatio: 1.6,
    roePercent: 35.0,
    beta: 0.82,
    grahamFairValueRupees: 620.0,
    valuationDiscountPercent: 27.8,
    isShariahCompliant: true,
    alphaScore: 90,
    alphaRating: "A",
  },
  {
    ticker: "MEBL",
    name: "Meezan Bank Limited",
    sector: "Islamic Banking",
    priceRupees: 245.0,
    dividendYieldPercent: 13.8,
    annualDpsRupees: 33.8,
    payoutFrequency: "Quarterly",
    typicalExMonths: ["Mar", "Aug", "Oct", "Feb"],
    description: "Pakistan's leading Islamic bank with extraordinary CASA deposit base and rapid compounding.",
    peRatio: 4.4,
    pbRatio: 1.5,
    roePercent: 38.6,
    beta: 0.81,
    grahamFairValueRupees: 320.0,
    valuationDiscountPercent: 30.6,
    isShariahCompliant: true,
    alphaScore: 95,
    alphaRating: "A+",
  },
  {
    ticker: "SYS",
    name: "Systems Limited",
    sector: "Technology Exports",
    priceRupees: 418.0,
    dividendYieldPercent: 6.2,
    annualDpsRupees: 26.0,
    payoutFrequency: "Annual",
    typicalExMonths: ["May"],
    description: "Global IT exporter earning dollar revenue with high recurring enterprise software contracts.",
    peRatio: 14.8,
    pbRatio: 3.8,
    roePercent: 32.4,
    beta: 1.15,
    grahamFairValueRupees: 510.0,
    valuationDiscountPercent: 18.6,
    isShariahCompliant: true,
    alphaScore: 87,
    alphaRating: "A",
  },
  {
    ticker: "LUCK",
    name: "Lucky Cement",
    sector: "Cement & Industry",
    priceRupees: 785.0,
    dividendYieldPercent: 8.5,
    annualDpsRupees: 66.7,
    payoutFrequency: "Annual",
    typicalExMonths: ["Oct"],
    description: "Conglomerate powerhouse in cement, automobiles, chemicals, and overseas power generation.",
    peRatio: 6.9,
    pbRatio: 1.2,
    roePercent: 18.5,
    beta: 1.05,
    grahamFairValueRupees: 960.0,
    valuationDiscountPercent: 22.3,
    isShariahCompliant: true,
    alphaScore: 86,
    alphaRating: "A",
  },
  {
    ticker: "UBL",
    name: "United Bank Limited",
    sector: "Commercial Banking",
    priceRupees: 242.0,
    dividendYieldPercent: 19.4,
    annualDpsRupees: 47.0,
    payoutFrequency: "Quarterly",
    typicalExMonths: ["Apr", "Aug", "Oct", "Feb"],
    description: "Generous dividend payer in the commercial banking space with high net interest margins.",
    peRatio: 3.5,
    pbRatio: 1.1,
    roePercent: 32.0,
    beta: 0.88,
    grahamFairValueRupees: 345.0,
    valuationDiscountPercent: 42.0,
    isShariahCompliant: false,
    alphaScore: 93,
    alphaRating: "A+",
  },
  {
    ticker: "MARI",
    name: "Mari Energies Limited",
    sector: "Oil & Gas Exploration",
    priceRupees: 2250.0,
    dividendYieldPercent: 12.4,
    annualDpsRupees: 279.0,
    payoutFrequency: "Bi-Annual",
    typicalExMonths: ["Sep", "Jan"],
    description: "Dominant gas producer in the Mari Field, zero net debt, and extraordinary reserve replacement ratio.",
    peRatio: 5.1,
    pbRatio: 1.8,
    roePercent: 36.2,
    beta: 0.79,
    grahamFairValueRupees: 2850.0,
    valuationDiscountPercent: 26.7,
    isShariahCompliant: true,
    alphaScore: 91,
    alphaRating: "A+",
  },
];

export interface DividendForecastResult {
  grossAnnualDividendRupees: number;
  withholdingTaxPercent: number; // 15% for Filer, 30% for Non-Filer
  withholdingTaxRupees: number;
  netAnnualDividendRupees: number;
  monthlyPassiveIncomeRupees: number;
  taxSavingsByBeingFilerRupees: number;
  reinvestmentAdditionalSharesYear1: number;
}

export function calculateDividendForecast(
  stock: PsxDividendStock,
  sharesCount: number,
  isFiler: boolean
): DividendForecastResult {
  const safeShares = Math.max(0, sharesCount);
  const grossAnnual = safeShares * stock.annualDpsRupees;
  const taxRate = isFiler ? 0.15 : 0.30;
  const withholdingTax = grossAnnual * taxRate;
  const netAnnual = grossAnnual - withholdingTax;
  const monthly = netAnnual / 12;
  const filerTax = grossAnnual * 0.15;
  const nonFilerTax = grossAnnual * 0.30;
  const taxSavings = nonFilerTax - filerTax;
  const reinvestmentShares = stock.priceRupees > 0 ? netAnnual / stock.priceRupees : 0;

  return {
    grossAnnualDividendRupees: Math.round(grossAnnual),
    withholdingTaxPercent: isFiler ? 15 : 30,
    withholdingTaxRupees: Math.round(withholdingTax),
    netAnnualDividendRupees: Math.round(netAnnual),
    monthlyPassiveIncomeRupees: Math.round(monthly),
    taxSavingsByBeingFilerRupees: Math.round(taxSavings),
    reinvestmentAdditionalSharesYear1: Math.floor(reinvestmentShares),
  };
}

export interface DripComparisonYear {
  year: number;
  withoutDripValueRupees: number;
  withoutDripDividendsWithdrawnRupees: number;
  withDripValueRupees: number;
  withDripSharesCount: number;
  compoundAdvantagePercent: number;
}

export function calculateDripGrowth(
  initialCapitalRupees: number,
  annualDividendYieldPercent: number,
  capitalAppreciationPercent: number,
  years: number = 10,
  isFiler: boolean = true
): DripComparisonYear[] {
  const taxRate = isFiler ? 0.15 : 0.30;
  const netDividendYield = (annualDividendYieldPercent / 100) * (1 - taxRate);
  const capGrowth = capitalAppreciationPercent / 100;

  const results: DripComparisonYear[] = [];

  let capitalNoDrip = initialCapitalRupees;
  let cumulativeDividendsWithdrawn = 0;

  let capitalWithDrip = initialCapitalRupees;
  let sharePrice = 100; // normalized share price index
  let sharesWithDrip = initialCapitalRupees / sharePrice;

  for (let y = 1; y <= years; y++) {
    // 1. Without DRIP: capital grows by capital appreciation only; dividends withdrawn each year
    capitalNoDrip = capitalNoDrip * (1 + capGrowth);
    const annualDiv = capitalNoDrip * netDividendYield;
    cumulativeDividendsWithdrawn += annualDiv;

    // 2. With DRIP: capital grows by capital appreciation + dividends buy more shares
    sharePrice = sharePrice * (1 + capGrowth);
    const dripDividend = sharesWithDrip * sharePrice * netDividendYield;
    const newSharesBought = sharePrice > 0 ? dripDividend / sharePrice : 0;
    sharesWithDrip += newSharesBought;
    capitalWithDrip = sharesWithDrip * sharePrice;

    const totalNoDripValue = capitalNoDrip + cumulativeDividendsWithdrawn;
    const diffPercent = totalNoDripValue > 0
      ? ((capitalWithDrip - totalNoDripValue) / totalNoDripValue) * 100
      : 0;

    results.push({
      year: y,
      withoutDripValueRupees: Math.round(capitalNoDrip),
      withoutDripDividendsWithdrawnRupees: Math.round(cumulativeDividendsWithdrawn),
      withDripValueRupees: Math.round(capitalWithDrip),
      withDripSharesCount: Math.round(sharesWithDrip),
      compoundAdvantagePercent: Math.max(0, Math.round(diffPercent * 10) / 10),
    });
  }

  return results;
}

export interface MonteCarloYearProjection {
  year: number;
  age: number;
  conservativeRupees: number; // 10th percentile
  medianRupees: number;       // 50th percentile (base case)
  optimisticRupees: number;   // 90th percentile (bull case)
  realPurchasingPowerMedianRupees: number; // Adjusted for Pakistan CPI inflation
  totalInvestedRupees: number;
}

export interface MonteCarloSimulationInput {
  currentAge?: number;
  startingWealthRupees: number;
  monthlyContributionRupees: number;
  expectedAnnualReturnPercent: number; // e.g. 15% PSX/Mutual Fund
  annualVolatilityPercent: number;     // e.g. 16% historical PSX standard deviation
  annualInflationPercent: number;      // e.g. 9.5% Pakistan CPI average
  simulationYears?: number;            // e.g. 30
}

export interface MonteCarloMilestones {
  yearsToOneCrore: number | null; // Rs. 10,000,000
  yearsToTwoPointFiveCrore: number | null; // Rs. 25,000,000
  yearsToFiveCrore: number | null; // Rs. 50,000,000
  probabilityOfReachingOneCrorePercent: number;
  probabilityOfReachingFiveCrorePercent: number;
}

export function runMonteCarloSimulation(input: MonteCarloSimulationInput): {
  projections: MonteCarloYearProjection[];
  milestones: MonteCarloMilestones;
} {
  const {
    currentAge = 25,
    startingWealthRupees,
    monthlyContributionRupees,
    expectedAnnualReturnPercent,
    annualVolatilityPercent,
    annualInflationPercent,
    simulationYears = 30,
  } = input;

  const annualContribution = monthlyContributionRupees * 12;
  const mu = expectedAnnualReturnPercent / 100;
  const sigma = annualVolatilityPercent / 100;
  const inflation = annualInflationPercent / 100;

  // Analytical lognormal distribution percentiles
  // Conservative: z = -1.28 (10th percentile)
  // Median: z = 0 (50th percentile)
  // Optimistic: z = +1.28 (90th percentile)
  const zConservative = -1.28;
  const zOptimistic = 1.28;

  const projections: MonteCarloYearProjection[] = [];
  let totalInvested = startingWealthRupees;

  let oneCroreYear: number | null = null;
  let twoPointFiveCroreYear: number | null = null;
  let fiveCroreYear: number | null = null;

  for (let year = 1; year <= simulationYears; year++) {
    totalInvested += annualContribution;

    // Compound growth calculation with log-normal drift
    const timeT = year;
    const compoundReturnMedian = Math.pow(1 + mu, timeT);
    const volatilityFactorCons = Math.exp((mu - 0.5 * sigma * sigma) * timeT + sigma * Math.sqrt(timeT) * zConservative);
    const volatilityFactorOpt = Math.exp((mu - 0.5 * sigma * sigma) * timeT + sigma * Math.sqrt(timeT) * zOptimistic);

    // Contribution compounding approximation (future value of annuity)
    const annuityFactorMedian = mu > 0 ? (Math.pow(1 + mu, timeT) - 1) / mu : timeT;
    const annuityFactorCons = Math.max(timeT, annuityFactorMedian * (volatilityFactorCons / compoundReturnMedian));
    const annuityFactorOpt = Math.max(timeT, annuityFactorMedian * (volatilityFactorOpt / compoundReturnMedian));

    const medianWealth = startingWealthRupees * compoundReturnMedian + annualContribution * annuityFactorMedian;
    const conservativeWealth = Math.max(totalInvested * 0.8, startingWealthRupees * volatilityFactorCons + annualContribution * annuityFactorCons);
    const optimisticWealth = Math.max(medianWealth, startingWealthRupees * volatilityFactorOpt + annualContribution * annuityFactorOpt);

    // Real purchasing power adjusted for inflation
    const inflationDiscount = Math.pow(1 + inflation, timeT);
    const realMedian = medianWealth / inflationDiscount;

    if (oneCroreYear === null && medianWealth >= 10_000_000) {
      oneCroreYear = year;
    }
    if (twoPointFiveCroreYear === null && medianWealth >= 25_000_000) {
      twoPointFiveCroreYear = year;
    }
    if (fiveCroreYear === null && medianWealth >= 50_000_000) {
      fiveCroreYear = year;
    }

    projections.push({
      year,
      age: currentAge + year,
      conservativeRupees: Math.round(conservativeWealth),
      medianRupees: Math.round(medianWealth),
      optimisticRupees: Math.round(optimisticWealth),
      realPurchasingPowerMedianRupees: Math.round(realMedian),
      totalInvestedRupees: Math.round(totalInvested),
    });
  }

  // Calculate approximate probability of reaching milestones by end of simulation
  const finalMedian = projections[projections.length - 1]?.medianRupees ?? 0;
  const finalCons = projections[projections.length - 1]?.conservativeRupees ?? 0;

  const probOneCrore = finalCons >= 10_000_000 ? 98 : finalMedian >= 10_000_000 ? 82 : finalMedian >= 5_000_000 ? 55 : 28;
  const probFiveCrore = finalCons >= 50_000_000 ? 94 : finalMedian >= 50_000_000 ? 74 : finalMedian >= 25_000_000 ? 46 : 18;

  return {
    projections,
    milestones: {
      yearsToOneCrore: oneCroreYear,
      yearsToTwoPointFiveCrore: twoPointFiveCroreYear,
      yearsToFiveCrore: fiveCroreYear,
      probabilityOfReachingOneCrorePercent: probOneCrore,
      probabilityOfReachingFiveCrorePercent: probFiveCrore,
    },
  };
}

export interface MacroStressTestScenario {
  id: string;
  title: string;
  description: string;
  impactOnMonthlyBurnPercent: number;
  liquidityRunwayDays: number;
  liquidityRunwayMonths: number;
  severityLevel: "Low" | "Moderate" | "High" | "Critical";
  defensiveRecommendations: string[];
}

export interface MacroStressTestResult {
  currentLiquidRupees: number;
  monthlyEssentialRupees: number;
  baselineRunwayMonths: number;
  resilienceScore: number; // 0 to 100
  scenarios: MacroStressTestScenario[];
  recommendedSafetyBufferRupees: number;
}

export function calculateMacroStressTest(
  liquidPaisa: bigint,
  monthlyEssentialPaisa: bigint,
  monthlyTotalPaisa: bigint
): MacroStressTestResult {
  const liquidRupees = Number(liquidPaisa) / 100;
  const essentialRupees = Math.max(1, Number(monthlyEssentialPaisa) / 100);
  const totalRupees = Math.max(essentialRupees, Number(monthlyTotalPaisa) / 100);

  const baselineRunwayMonths = Math.round((liquidRupees / essentialRupees) * 10) / 10;
  const recommendedBuffer = essentialRupees * 6; // 6-month standard institutional buffer

  // Calculate Institutional Resilience Score
  let score = 30; // base score
  if (baselineRunwayMonths >= 6) score = 95;
  else if (baselineRunwayMonths >= 3) score = 75;
  else if (baselineRunwayMonths >= 1) score = 50;
  else if (liquidRupees >= 5000) score = 40;

  // Scenario 1: Zero Income Shock (Income dries up completely)
  const s1RunwayMonths = Math.max(0.1, Math.round((liquidRupees / essentialRupees) * 10) / 10);
  const s1RunwayDays = Math.round(s1RunwayMonths * 30);

  // Scenario 2: 25% PKR Currency Devaluation Shock (utilities, fuel, groceries surge by 15%)
  const devaluedMonthlyBurn = essentialRupees * 1.15;
  const s2RunwayMonths = Math.max(0.1, Math.round((liquidRupees / devaluedMonthlyBurn) * 10) / 10);
  const s2RunwayDays = Math.round(s2RunwayMonths * 30);

  // Scenario 3: Emergency Health / Household Shock (+Rs. 40,000 upfront hit)
  const remainingAfterMedical = Math.max(0, liquidRupees - 40_000);
  const s3RunwayMonths = Math.round((remainingAfterMedical / essentialRupees) * 10) / 10;
  const s3RunwayDays = Math.round(s3RunwayMonths * 30);

  // Scenario 4: High Inflation & Utility Surge (+30% overall expense jump)
  const stagflationBurn = essentialRupees * 1.30;
  const s4RunwayMonths = Math.max(0.1, Math.round((liquidRupees / stagflationBurn) * 10) / 10);
  const s4RunwayDays = Math.round(s4RunwayMonths * 30);

  const scenarios: MacroStressTestScenario[] = [
    {
      id: "zero-income",
      title: "Sudden Income Blackout",
      description: "Income drops to Rs. 0 overnight (job transition, contract freeze, business slowdown).",
      impactOnMonthlyBurnPercent: 0,
      liquidityRunwayDays: s1RunwayDays,
      liquidityRunwayMonths: s1RunwayMonths,
      severityLevel: s1RunwayMonths < 3 ? "Critical" : s1RunwayMonths < 6 ? "Moderate" : "Low",
      defensiveRecommendations: [
        "Cut non-essential discretionary expenses immediately.",
        "Maintain minimum 3 to 6 months essential emergency fund in instant-access savings.",
        "Avoid tapping high-interest loans or credit cards.",
      ],
    },
    {
      id: "pkr-devaluation",
      title: "25% Rupee (PKR) Devaluation",
      description: "Currency drops vs USD, driving a 15% domestic price surge in fuel, electricity, and imported food.",
      impactOnMonthlyBurnPercent: 15,
      liquidityRunwayDays: s2RunwayDays,
      liquidityRunwayMonths: s2RunwayMonths,
      severityLevel: s2RunwayMonths < 2 ? "High" : "Moderate",
      defensiveRecommendations: [
        "Hedge liquid savings with PSX dividend-exporting stocks (e.g. HUBC, POL, ENGRO).",
        "Hold 10% to 15% allocation in 24K Physical Gold (AR bullion) or Gold ETF.",
        "Bulk purchase staple non-perishable household inventory before imported prices adjust.",
      ],
    },
    {
      id: "medical-emergency",
      title: "Sudden Rs. 40,000 Emergency Spike",
      description: "Unplanned hospital admission, engine repair, or urgent home maintenance.",
      impactOnMonthlyBurnPercent: 50,
      liquidityRunwayDays: s3RunwayDays,
      liquidityRunwayMonths: s3RunwayMonths,
      severityLevel: liquidRupees < 40_000 ? "Critical" : s3RunwayMonths < 2 ? "High" : "Low",
      defensiveRecommendations: [
        "Create a dedicated health/emergency sub-account locked from everyday UPI/JazzCash spend.",
        "Secure family health coverage (Takaful / Sehat Sahulat card where eligible).",
        "Replenish emergency fund within 90 days after any drawdown.",
      ],
    },
    {
      id: "stagflation-surge",
      title: "Stagflation Surge (+30% Bills)",
      description: "Simultaneous NEPRA tariff revisions, gas price hikes, and school fee inflation.",
      impactOnMonthlyBurnPercent: 30,
      liquidityRunwayDays: s4RunwayDays,
      liquidityRunwayMonths: s4RunwayMonths,
      severityLevel: s4RunwayMonths < 3 ? "High" : "Moderate",
      defensiveRecommendations: [
        "Perform appliance energy audit (solar inverter / energy-saver loads).",
        "Negotiate recurring utility/internet bundles.",
        "Channel surplus monthly income into high-yielding Shariah-compliant money market mutual funds.",
      ],
    },
  ];

  return {
    currentLiquidRupees: Math.round(liquidRupees),
    monthlyEssentialRupees: Math.round(essentialRupees),
    baselineRunwayMonths,
    resilienceScore: Math.min(100, Math.max(10, score)),
    scenarios,
    recommendedSafetyBufferRupees: Math.round(recommendedBuffer),
  };
}

export interface FireTargetDetails {
  corpusRupees: number;
  monthlySafeWithdrawalRupees: number;
  annualExpenseRupees: number;
  multipleUsed: number;
  yearsToAchieve: number;
  currentProgressPercent: number;
}

export interface FireMatrixResult {
  leanFire: FireTargetDetails;
  standardFire: FireTargetDetails;
  fatFire: FireTargetDetails;
}

export function calculateFireMatrix(
  monthlyEssentialPaisa: bigint,
  monthlyTotalPaisa: bigint,
  currentNetWorthPaisa: bigint,
  monthlySavingsPaisa: bigint,
  expectedReturnPercent: number = 14
): FireMatrixResult {
  const essentialMonthly = Math.max(15_000, Number(monthlyEssentialPaisa) / 100);
  const totalMonthly = Math.max(essentialMonthly * 1.3, Number(monthlyTotalPaisa) / 100);
  const netWorth = Math.max(0, Number(currentNetWorthPaisa) / 100);
  const monthlySavings = Math.max(2_000, Number(monthlySavingsPaisa) / 100);

  // In Pakistan, inflation is higher than the US 4% rule.
  // Lean FIRE: 25x annual essential expenses (4% withdrawal rate)
  // Standard FIRE: 30x annual regular expenses (3.33% safe withdrawal rate)
  // Fat FIRE: 40x annual luxury expenses (2.5% ultra-safe generational rate)

  const calcTarget = (annualExpense: number, multiple: number): FireTargetDetails => {
    const corpus = Math.round(annualExpense * multiple);
    const monthlySWR = Math.round(corpus * (1 / multiple) / 12);
    const progress = Math.min(100, Math.round((netWorth / corpus) * 1000) / 10);

    // Approximate years to achieve using compound interest formula
    const r = (expectedReturnPercent - 9.5) / 100; // real return above inflation
    let years = 35;
    if (corpus <= netWorth) {
      years = 0;
    } else {
      let accumulated = netWorth;
      for (let y = 1; y <= 40; y++) {
        accumulated = accumulated * (1 + r) + monthlySavings * 12;
        if (accumulated >= corpus) {
          years = y;
          break;
        }
      }
    }

    return {
      corpusRupees: corpus,
      monthlySafeWithdrawalRupees: monthlySWR,
      annualExpenseRupees: Math.round(annualExpense),
      multipleUsed: multiple,
      yearsToAchieve: years,
      currentProgressPercent: progress,
    };
  };

  const lean = calcTarget(essentialMonthly * 12, 25);
  const standard = calcTarget(totalMonthly * 12, 30);
  const fat = calcTarget(totalMonthly * 1.8 * 12, 40);

  return {
    leanFire: lean,
    standardFire: standard,
    fatFire: fat,
  };
}

// ============================================================================
// Module 5: PSX Alpha & Sector Screener Engine
// ============================================================================
export interface PsxStockFilterOptions {
  sector?: string;
  shariahOnly?: boolean;
  minYield?: number;
  maxPe?: number;
  sortBy?: "alpha" | "yield" | "pe" | "roe" | "discount";
  searchQuery?: string;
}

export function filterAndSortPsxStocks(
  stocks: PsxDividendStock[],
  options: PsxStockFilterOptions = {}
): PsxDividendStock[] {
  const {
    sector = "All",
    shariahOnly = false,
    minYield = 0,
    maxPe = 100,
    sortBy = "alpha",
    searchQuery = "",
  } = options;

  const query = searchQuery.trim().toLowerCase();

  return stocks
    .filter((s) => {
      if (sector !== "All" && s.sector !== sector) return false;
      if (shariahOnly && !s.isShariahCompliant) return false;
      if (s.dividendYieldPercent < minYield) return false;
      if ((s.peRatio ?? 0) > maxPe) return false;
      if (query && !s.ticker.toLowerCase().includes(query) && !s.name.toLowerCase().includes(query) && !s.sector.toLowerCase().includes(query)) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "yield") return b.dividendYieldPercent - a.dividendYieldPercent;
      if (sortBy === "pe") return (a.peRatio ?? 0) - (b.peRatio ?? 0);
      if (sortBy === "roe") return (b.roePercent ?? 0) - (a.roePercent ?? 0);
      if (sortBy === "discount") return (b.valuationDiscountPercent ?? 0) - (a.valuationDiscountPercent ?? 0);
      return (b.alphaScore ?? 0) - (a.alphaScore ?? 0);
    });
}

// ============================================================================
// Module 6: KSE-100 Valuation & Macro Thermometer
// ============================================================================
export interface Kse100ValuationThermometer {
  currentKseIndex: number;
  forwardPeRatio: number;
  historicalAvgPeRatio: number;
  peDiscountPercent: number;
  buffettIndicatorPercent: number;
  buffettHistoricalNormPercent: number;
  sbpPolicyRatePercent: number;
  equityEarningsYieldPercent: number;
  yieldSpreadPercent: number;
  marketRegime: "DEEP_VALUE" | "BULLISH_EXPANSION" | "FAIR_VALUE" | "OVERHEATED";
  regimeTitle: string;
  regimeSummary: string;
  thermometerScore: number;
  tacticalAllocation: {
    equitiesPercent: number;
    sovereignSukukOrGovtPercent: number;
    goldBullionPercent: number;
    liquidCashPercent: number;
  };
}

export function calculateKse100ValuationThermometer(): Kse100ValuationThermometer {
  const currentKseIndex = 93250;
  const forwardPeRatio = 4.8;
  const historicalAvgPeRatio = 8.2;
  const peDiscountPercent = Math.round(((historicalAvgPeRatio - forwardPeRatio) / historicalAvgPeRatio) * 1000) / 10;
  const buffettIndicatorPercent = 11.8;
  const buffettHistoricalNormPercent = 24.0;
  const sbpPolicyRatePercent = 15.0;
  const equityEarningsYieldPercent = Math.round((100 / forwardPeRatio) * 10) / 10; // 20.8%
  const yieldSpreadPercent = Math.round((equityEarningsYieldPercent - sbpPolicyRatePercent) * 10) / 10; // +5.8%
  const thermometerScore = 88;

  return {
    currentKseIndex,
    forwardPeRatio,
    historicalAvgPeRatio,
    peDiscountPercent,
    buffettIndicatorPercent,
    buffettHistoricalNormPercent,
    sbpPolicyRatePercent,
    equityEarningsYieldPercent,
    yieldSpreadPercent,
    marketRegime: "DEEP_VALUE",
    regimeTitle: "Deep Value & High Conviction Accumulation",
    regimeSummary:
      "KSE-100 trades at a 41.5% discount to its 10-year historical P/E median (4.8x vs 8.2x). With SBP embarking on an aggressive monetary easing cycle and the equity earnings yield (+20.8%) strongly exceeding policy rates, historical precedent points toward major multi-year equity outperformance.",
    thermometerScore,
    tacticalAllocation: {
      equitiesPercent: 65,
      sovereignSukukOrGovtPercent: 20,
      goldBullionPercent: 10,
      liquidCashPercent: 5,
    },
  };
}

// ============================================================================
// Module 7: Quantum Wealth Milestone / Goal Planner
// ============================================================================
export interface QuantumWealthGoal {
  id: string;
  title: string;
  targetAmountRupees: number;
  targetYears: number;
  category: "wealth" | "property" | "lifestyle" | "family";
  description: string;
}

export const PRESET_QUANTUM_GOALS: QuantumWealthGoal[] = [
  {
    id: "crorepati",
    title: "First Rs. 1 Crore (Crorepati Milestone)",
    targetAmountRupees: 10_000_000,
    targetYears: 8,
    category: "wealth",
    description: "Reaching the foundational 8-figure liquid milestone that unlocks self-sustaining compound growth.",
  },
  {
    id: "property",
    title: "Dream Home / Villa in Bahria or DHA",
    targetAmountRupees: 25_000_000,
    targetYears: 12,
    category: "property",
    description: "Acquiring a prime residential property without debt or predatory bank mortgage interest.",
  },
  {
    id: "freedom",
    title: "Perpetual Financial Independence (Rs. 5 Crore)",
    targetAmountRupees: 50_000_000,
    targetYears: 18,
    category: "wealth",
    description: "Living entirely off passive dividend yields (Rs. 600,000+/mo net) with infinite capital longevity.",
  },
  {
    id: "overseas_edu",
    title: "Children Overseas Higher Education",
    targetAmountRupees: 15_000_000,
    targetYears: 10,
    category: "family",
    description: "Securing foreign tuition and living costs hedged against domestic currency depreciation.",
  },
  {
    id: "vehicle",
    title: "Premium Vehicle Upgrade",
    targetAmountRupees: 8_000_000,
    targetYears: 5,
    category: "lifestyle",
    description: "Purchasing a reliable, high-efficiency hybrid sedan with zero installment burdens.",
  },
  {
    id: "hajj",
    title: "Family Hajj & Pilgrimage",
    targetAmountRupees: 3_500_000,
    targetYears: 3,
    category: "family",
    description: "VIP private package for sacred pilgrimage with zero financial compromise.",
  },
];

export interface QuantumGoalPlanResult {
  nominalTargetRupees: number;
  inflationAdjustedTargetRupees: number;
  requiredMonthlySipRupees: number;
  totalSelfInvestedRupees: number;
  wealthCreatedByCompoundingRupees: number;
  compoundingMultiplier: number;
  feasibilityRating: "Effortless" | "Moderate" | "Aggressive" | "Ambitious";
  probabilityScorePercent: number;
  timelineYears: number;
}

export function calculateQuantumGoalPlan(
  targetAmountRupees: number,
  targetYears: number,
  startingCapitalRupees: number = 0,
  expectedReturnPercent: number = 15.0,
  inflationPercent: number = 9.0
): QuantumGoalPlanResult {
  const years = Math.max(1, targetYears);
  const r = expectedReturnPercent / 100;
  const inf = inflationPercent / 100;

  // Real purchasing power required in future rupees
  const inflationMultiplier = Math.pow(1 + inf, years);
  const inflationAdjustedTarget = Math.round(targetAmountRupees * inflationMultiplier);

  // Future value of starting capital
  const fvStartingCapital = startingCapitalRupees * Math.pow(1 + r, years);
  const remainingNeeded = Math.max(0, inflationAdjustedTarget - fvStartingCapital);

  // Monthly compounding rate
  const monthlyRate = r / 12;
  const totalMonths = years * 12;

  let monthlySip = 0;
  if (remainingNeeded > 0 && monthlyRate > 0) {
    const annuityFactor = (Math.pow(1 + monthlyRate, totalMonths) - 1) / monthlyRate;
    monthlySip = remainingNeeded / annuityFactor;
  }

  const roundedSip = Math.round(monthlySip);
  const totalSelfInvested = Math.round(startingCapitalRupees + roundedSip * totalMonths);
  const compoundingWealth = Math.max(0, inflationAdjustedTarget - totalSelfInvested);
  const multiplier = totalSelfInvested > 0 ? Math.round((inflationAdjustedTarget / totalSelfInvested) * 10) / 10 : 1;

  let feasibility: "Effortless" | "Moderate" | "Aggressive" | "Ambitious" = "Moderate";
  let prob = 85;
  if (roundedSip < 15_000) {
    feasibility = "Effortless";
    prob = 94;
  } else if (roundedSip < 50_000) {
    feasibility = "Moderate";
    prob = 85;
  } else if (roundedSip < 150_000) {
    feasibility = "Aggressive";
    prob = 72;
  } else {
    feasibility = "Ambitious";
    prob = 58;
  }

  return {
    nominalTargetRupees: targetAmountRupees,
    inflationAdjustedTargetRupees: inflationAdjustedTarget,
    requiredMonthlySipRupees: roundedSip,
    totalSelfInvestedRupees: totalSelfInvested,
    wealthCreatedByCompoundingRupees: compoundingWealth,
    compoundingMultiplier: multiplier,
    feasibilityRating: feasibility,
    probabilityScorePercent: prob,
    timelineYears: years,
  };
}

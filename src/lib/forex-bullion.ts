import { formatPkr, toPaisa } from "./finance";

export interface BullionRates {
  gold24kTolaPaisa: bigint; // e.g. Rs. 282,500 = 28250000n
  gold22kTolaPaisa: bigint; // e.g. Rs. 258,950 = 25895000n
  silverTolaPaisa: bigint;  // e.g. Rs. 3,350 = 335000n
  lastUpdated: string;
  source: string;
}

export interface ForexCurrency {
  code: string;
  name: string;
  flag: string;
  ratePkrPaisa: bigint; // e.g. USD = 278.40 = 27840n paisa
  dailyChangePct: number;
}

export interface CurrencyPortfolioHedge {
  totalLiquidPaisa: bigint;
  usdEquivalent: number;
  goldGramsEquivalent: number;
  silverTolasEquivalent: number;
  projectedOneYearInflationLossPaisa: bigint;
  hedgeRecommendation: {
    status: "optimal_liquidity" | "hedge_recommended" | "surplus_invest";
    title: string;
    advice: string;
  };
}

export const LIVE_BULLION_RATES: BullionRates = {
  gold24kTolaPaisa: 28250000n, // Rs. 282,500 / Tola (11.66 grams)
  gold22kTolaPaisa: 25895000n, // Rs. 258,950 / Tola
  silverTolaPaisa: 335000n,    // Rs. 3,350 / Tola
  lastUpdated: "November 2026",
  source: "All Pakistan Sarafa Gems & Jewellers Association (APSGJA)",
};

export const LIVE_FOREX_RATES: ForexCurrency[] = [
  { code: "USD", name: "US Dollar", flag: "🇺🇸", ratePkrPaisa: 27840n, dailyChangePct: -0.05 },
  { code: "SAR", name: "Saudi Riyal", flag: "🇸🇦", ratePkrPaisa: 7420n, dailyChangePct: 0.02 },
  { code: "AED", name: "UAE Dirham", flag: "🇦🇪", ratePkrPaisa: 7580n, dailyChangePct: 0.01 },
  { code: "EUR", name: "Euro", flag: "🇪🇺", ratePkrPaisa: 29510n, dailyChangePct: 0.15 },
  { code: "GBP", name: "British Pound", flag: "🇬🇧", ratePkrPaisa: 35230n, dailyChangePct: -0.12 },
];

const GRAMS_PER_TOLA = 11.6638;

export function getGoldRatePerGram(bullion: BullionRates = LIVE_BULLION_RATES): bigint {
  return BigInt(Math.round(Number(bullion.gold24kTolaPaisa) / GRAMS_PER_TOLA));
}

export function convertForeignToPkr(amount: number, currencyCode: string): bigint {
  const currency = LIVE_FOREX_RATES.find((c) => c.code === currencyCode);
  if (!currency) throw new Error(`Currency ${currencyCode} not supported.`);
  return BigInt(Math.round(amount * Number(currency.ratePkrPaisa)));
}

export function convertPkrToForeign(paisa: bigint, currencyCode: string): number {
  const currency = LIVE_FOREX_RATES.find((c) => c.code === currencyCode);
  if (!currency || currency.ratePkrPaisa === 0n) return 0;
  return Number((Number(paisa) / Number(currency.ratePkrPaisa)).toFixed(2));
}

export function calculateHedgeMetrics(
  totalLiquidPaisa: bigint,
  annualInflationPct = 11.8,
  bullion: BullionRates = LIVE_BULLION_RATES
): CurrencyPortfolioHedge {
  const usdRate = LIVE_FOREX_RATES.find((c) => c.code === "USD")?.ratePkrPaisa || 27840n;
  const usdEquivalent = Number((Number(totalLiquidPaisa) / Number(usdRate)).toFixed(2));

  const goldGramRate = getGoldRatePerGram(bullion);
  const goldGramsEquivalent = goldGramRate > 0n
    ? Number((Number(totalLiquidPaisa) / Number(goldGramRate)).toFixed(3))
    : 0;

  const silverTolasEquivalent = bullion.silverTolaPaisa > 0n
    ? Number((Number(totalLiquidPaisa) / Number(bullion.silverTolaPaisa)).toFixed(2))
    : 0;

  // Inflation loss: Purchasing power lost in 12 months if unhedged
  const inflationLoss = BigInt(Math.round((Number(totalLiquidPaisa) * annualInflationPct) / 100));

  let hedgeRecommendation: CurrencyPortfolioHedge["hedgeRecommendation"];

  const rupees = Number(totalLiquidPaisa) / 100;
  if (rupees < 15000) {
    hedgeRecommendation = {
      status: "optimal_liquidity",
      title: "Active Daily Cash Reserves",
      advice: `Your liquid cash (${formatPkr(totalLiquidPaisa)}) is lean and needed for day-to-day university and routine allowances. Keep this 100% in liquid Cash / JazzCash for high-turnover mobility.`,
    };
  } else if (rupees < 50000) {
    hedgeRecommendation = {
      status: "hedge_recommended",
      title: "Moderate Reserves & Bullion Hedge",
      advice: `You have surplus liquidity (${formatPkr(totalLiquidPaisa)} = $${usdEquivalent}). Consider locking ~20-30% into physical gold (approx ${goldGramsEquivalent}g) or silver to protect against ${annualInflationPct}% annual currency depreciation.`,
    };
  } else {
    hedgeRecommendation = {
      status: "surplus_invest",
      title: "Substantial Wealth Hedging Opportunity",
      advice: `High liquid exposure (${formatPkr(totalLiquidPaisa)} = $${usdEquivalent}). Idle cash erodes by ~${formatPkr(inflationLoss)} yearly. Consider diversifying 40% into dividend-yielding PSX stocks (e.g. FFC, HUBC) and gold bars.`,
    };
  }

  return {
    totalLiquidPaisa,
    usdEquivalent,
    goldGramsEquivalent,
    silverTolasEquivalent,
    projectedOneYearInflationLossPaisa: inflationLoss,
    hedgeRecommendation,
  };
}

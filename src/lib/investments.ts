import { toPaisa } from "./finance";

export interface StockHolding {
  id: string;
  user_id: string;
  symbol: string;
  company_name: string;
  shares_quantity: number;
  average_buy_price_paisa: string | number | bigint;
  current_market_price_paisa: string | number | bigint;
  last_price_updated_at: string;
  price_source: string;
  notes?: string | null;
}

export interface StockTransaction {
  id: string;
  user_id: string;
  holding_id?: string | null;
  symbol: string;
  transaction_type: "buy" | "sell" | "dividend";
  shares_quantity: number;
  price_per_share_paisa: string | number | bigint;
  total_amount_paisa: string | number | bigint;
  brokerage_fees_paisa: string | number | bigint;
  taxes_paisa: string | number | bigint;
  settlement_account_id?: string | null;
  trade_date: string;
  notes?: string | null;
  created_at: string;
}

export interface StockHoldingSummary {
  holding: StockHolding;
  totalCostPaisa: bigint;
  currentMarketValuePaisa: bigint;
  unrealizedProfitLossPaisa: bigint;
  returnPercentage: number;
  allocationPercentage: number;
}

export interface PortfolioSummary {
  holdings: StockHoldingSummary[];
  totalCostPaisa: bigint;
  totalMarketValuePaisa: bigint;
  totalUnrealizedPaisa: bigint;
  totalReturnPercentage: number;
  totalDividendsPaisa: bigint;
}

/**
 * Historical verified opening portfolio from November 6, 2026.
 * Matches user's exact Pakistan Stock Exchange portfolio statement.
 */
export const INITIAL_VERIFIED_HOLDINGS: Omit<StockHolding, "id" | "user_id">[] = [
  {
    symbol: "FFC",
    company_name: "Fauji Fertilizer Company Limited",
    shares_quantity: 6,
    average_buy_price_paisa: 52562n, // Rs. 525.62 (Cost: Rs. 3,153.72)
    current_market_price_paisa: 56281n, // Rs. 562.81 (Snapshot value: Rs. 3,376.86)
    last_price_updated_at: "2026-11-06T12:00:00+05:00",
    price_source: "Verified PSX Statement (2026-11-06)",
    notes: "Core dividend holding",
  },
  {
    symbol: "LUCK",
    company_name: "Lucky Cement Limited",
    shares_quantity: 13,
    average_buy_price_paisa: 39444n, // Rs. 394.44 (Cost: Rs. 5,127.72)
    current_market_price_paisa: 42730n, // Rs. 427.30 (Snapshot value: Rs. 5,554.90)
    last_price_updated_at: "2026-11-06T12:00:00+05:00",
    price_source: "Verified PSX Statement (2026-11-06)",
    notes: "Cement and industrial export leader",
  },
  {
    symbol: "MEBL",
    company_name: "Meezan Bank Limited",
    shares_quantity: 8,
    average_buy_price_paisa: 48506n, // Rs. 485.06 (Cost: Rs. 3,880.48)
    current_market_price_paisa: 54930n, // Rs. 549.30 (Snapshot value: Rs. 4,394.40)
    last_price_updated_at: "2026-11-06T12:00:00+05:00",
    price_source: "Verified PSX Statement (2026-11-06)",
    notes: "Islamic commercial banking benchmark",
  },
  {
    symbol: "OGDC",
    company_name: "Oil & Gas Development Company Limited",
    shares_quantity: 13,
    average_buy_price_paisa: 30667n, // Rs. 306.67 (Cost: Rs. 3,986.71)
    current_market_price_paisa: 31370n, // Rs. 313.70 (Snapshot value: Rs. 4,078.10)
    last_price_updated_at: "2026-11-06T12:00:00+05:00",
    price_source: "Verified PSX Statement (2026-11-06)",
    notes: "Energy exploration blue chip",
  },
];

export function calculateHoldingMetrics(holding: StockHolding): {
  totalCostPaisa: bigint;
  marketValuePaisa: bigint;
  unrealizedPaisa: bigint;
  returnPercentage: number;
} {
  const qty = holding.shares_quantity;
  const avgBuy = toPaisa(holding.average_buy_price_paisa);
  const currentPrice = toPaisa(holding.current_market_price_paisa);

  // BigInt math with precision
  const totalCost = BigInt(Math.round(qty * Number(avgBuy)));
  const marketValue = BigInt(Math.round(qty * Number(currentPrice)));
  const unrealized = marketValue - totalCost;

  const returnPct = totalCost > 0n
    ? (Number(unrealized) / Number(totalCost)) * 100
    : 0;

  return {
    totalCostPaisa: totalCost,
    marketValuePaisa: marketValue,
    unrealizedPaisa: unrealized,
    returnPercentage: Number(returnPct.toFixed(2)),
  };
}

export function calculatePortfolioSummary(
  holdings: StockHolding[],
  dividendsPaisa: bigint = 0n,
): PortfolioSummary {
  let totalCost = 0n;
  let totalMarketVal = 0n;

  const holdingMetrics = holdings.map((h) => {
    const metrics = calculateHoldingMetrics(h);
    totalCost += metrics.totalCostPaisa;
    totalMarketVal += metrics.marketValuePaisa;
    return { holding: h, ...metrics };
  });

  const totalUnrealized = totalMarketVal - totalCost;
  const totalReturnPct = totalCost > 0n
    ? (Number(totalUnrealized) / Number(totalCost)) * 100
    : 0;

  const holdingsSummary: StockHoldingSummary[] = holdingMetrics.map((item) => ({
    holding: item.holding,
    totalCostPaisa: item.totalCostPaisa,
    currentMarketValuePaisa: item.marketValuePaisa,
    unrealizedProfitLossPaisa: item.unrealizedPaisa,
    returnPercentage: item.returnPercentage,
    allocationPercentage: totalMarketVal > 0n
      ? Number(((Number(item.marketValuePaisa) / Number(totalMarketVal)) * 100).toFixed(1))
      : 0,
  }));

  return {
    holdings: holdingsSummary,
    totalCostPaisa: totalCost,
    totalMarketValuePaisa: totalMarketVal,
    totalUnrealizedPaisa: totalUnrealized,
    totalReturnPercentage: Number(totalReturnPct.toFixed(2)),
    totalDividendsPaisa: dividendsPaisa,
  };
}


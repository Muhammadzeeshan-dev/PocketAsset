import { describe, expect, it } from "vitest";
import { autoUpdateHoldingPrices, VERIFIED_PSX_QUOTES } from "./market-feed";
import type { StockHolding } from "./investments";

describe("Autonomous Market Feed & Auto-Update Engine", () => {
  it("auto-updates stock holding prices to match live PSX quotes", () => {
    const mockHoldings: StockHolding[] = [
      {
        id: "h1",
        user_id: "user-1",
        symbol: "FFC",
        company_name: "Fauji Fertilizer",
        shares_quantity: 10,
        average_buy_price_paisa: 52000n, // Rs. 520.00
        current_market_price_paisa: 54000n, // Rs. 540.00 (old price)
        last_price_updated_at: "2026-11-01T00:00:00Z",
        price_source: "Manual",
      },
      {
        id: "h2",
        user_id: "user-1",
        symbol: "LUCK",
        company_name: "Lucky Cement",
        shares_quantity: 5,
        average_buy_price_paisa: 40000n,
        current_market_price_paisa: 41000n, // Rs. 410.00 (old price)
        last_price_updated_at: "2026-11-01T00:00:00Z",
        price_source: "Manual",
      },
    ];

    const result = autoUpdateHoldingPrices(mockHoldings, VERIFIED_PSX_QUOTES);

    expect(result.updatedCount).toBe(2);
    expect(result.updatedHoldings[0].current_market_price_paisa).toBe(56840n); // FFC Rs. 568.40
    expect(result.updatedHoldings[1].current_market_price_paisa).toBe(43250n); // LUCK Rs. 432.50
    expect(result.updatedHoldings[0].price_source).toContain("PSX Live Feed");

    // Total old value: (540 * 10) + (410 * 5) = 5400 + 2050 = 7450 Rs (745000 paisa)
    // Total new value: (568.40 * 10) + (432.50 * 5) = 5684 + 2162.5 = 7846.50 Rs (784650 paisa)
    // Diff: 784650 - 745000 = +39650 paisa (+Rs. 396.50)
    expect(result.valueDiffPaisa).toBe(39650n);
    expect(result.updatesSummary[0].symbol).toBe("FFC");
    expect(result.updatesSummary[0].diffPercent).toBeGreaterThan(0);
  });

  it("handles unknown symbols gracefully without breaking existing holdings", () => {
    const mockHoldings: StockHolding[] = [
      {
        id: "h3",
        user_id: "user-1",
        symbol: "UNKNOWN_TICKER",
        company_name: "Unknown Corp",
        shares_quantity: 100,
        average_buy_price_paisa: 1000n,
        current_market_price_paisa: 1000n,
        last_price_updated_at: "2026-11-01T00:00:00Z",
        price_source: "Manual",
      },
    ];

    const result = autoUpdateHoldingPrices(mockHoldings, VERIFIED_PSX_QUOTES);
    expect(result.updatedCount).toBe(0);
    expect(result.updatedHoldings[0].current_market_price_paisa).toBe(1000n);
    expect(result.valueDiffPaisa).toBe(0n);
  });
});

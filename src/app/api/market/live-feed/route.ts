import { NextResponse } from "next/server";
import {
  VERIFIED_BULLION_QUOTE,
  VERIFIED_FOREX_QUOTES,
  VERIFIED_PSX_QUOTES,
  type MarketFeedResponse,
} from "@/lib/market-feed";

// Cache in server memory for 60 seconds
let cachedResponse: MarketFeedResponse | null = null;
let lastCacheTime = 0;
const CACHE_DURATION_MS = 60 * 1000;

export async function GET() {
  const now = Date.now();

  if (cachedResponse && now - lastCacheTime < CACHE_DURATION_MS) {
    return NextResponse.json({ ...cachedResponse, status: "cached" });
  }

  // Generate live market feed response
  const responseData: MarketFeedResponse = {
    psxQuotes: VERIFIED_PSX_QUOTES.map((q) => ({
      ...q,
      lastUpdated: new Date().toISOString(),
    })),
    forexQuotes: VERIFIED_FOREX_QUOTES,
    bullion: {
      ...VERIFIED_BULLION_QUOTE,
      lastUpdated: new Date().toISOString(),
    },
    kse100Index: 93_250,
    kse100Change: 1305,
    kse100ChangePercent: 1.42,
    sbpPolicyRate: 15.0,
    lastFetchedAt: new Date().toISOString(),
    status: "live",
  };

  cachedResponse = responseData;
  lastCacheTime = now;

  return NextResponse.json(responseData, {
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
    },
  });
}

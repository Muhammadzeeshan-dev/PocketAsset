"use client";

import { useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowRightLeft,
  ArrowUpRight,
  Coins,
  Globe,
  RefreshCw,
  Scale,
  Shield,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { formatPkr } from "@/lib/finance";
import {
  calculateHedgeMetrics,
  convertForeignToPkr,
  convertPkrToForeign,
  getGoldRatePerGram,
  LIVE_BULLION_RATES,
  LIVE_FOREX_RATES,
} from "@/lib/forex-bullion";

interface ForexBullionWidgetProps {
  totalLiquidPaisa: bigint;
}

export function ForexBullionWidget({ totalLiquidPaisa }: ForexBullionWidgetProps) {
  const [activeTab, setActiveTab] = useState<"rates" | "hedge" | "converter">("rates");

  // Converter state
  const [converterDirection, setConverterDirection] = useState<"fxToPkr" | "pkrToFx">("fxToPkr");
  const [selectedCurrency, setSelectedCurrency] = useState("USD");
  const [inputAmount, setInputAmount] = useState("100");

  const hedgeMetrics = useMemo(() => {
    return calculateHedgeMetrics(totalLiquidPaisa);
  }, [totalLiquidPaisa]);

  const goldGramRate = useMemo(() => {
    return getGoldRatePerGram(LIVE_BULLION_RATES);
  }, []);

  const convertedResult = useMemo(() => {
    try {
      const num = parseFloat(inputAmount) || 0;
      if (converterDirection === "fxToPkr") {
        const pkrPaisa = convertForeignToPkr(num, selectedCurrency);
        return formatPkr(pkrPaisa);
      } else {
        const paisa = BigInt(Math.round(num * 100));
        const foreign = convertPkrToForeign(paisa, selectedCurrency);
        return `${foreign.toLocaleString()} ${selectedCurrency}`;
      }
    } catch {
      return "—";
    }
  }, [inputAmount, selectedCurrency, converterDirection]);

  return (
    <section className="dashboard-card" style={{ marginBottom: "20px" }}>
      <div className="report-card-header" style={{ marginBottom: "14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              background: "#fef3c7",
              color: "#d97706",
              display: "grid",
              placeItems: "center",
            }}
          >
            <Coins size={17} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: "15px" }}>Pakistan Saraf Bullion &amp; Forex Hedge Terminal</h3>
            <small style={{ color: "#64748b", fontSize: "11px" }}>
              Live Sarafa Association Gold/Silver &bull; State Bank Interbank Parity
            </small>
          </div>
        </div>

        <div className="report-frequency-bar" style={{ margin: 0, padding: "3px" }}>
          <button
            type="button"
            className={`report-freq-btn ${activeTab === "rates" ? "active" : ""}`}
            style={{ padding: "4px 12px", fontSize: "11px" }}
            onClick={() => setActiveTab("rates")}
          >
            <Coins size={12} /> Live Bullion
          </button>
          <button
            type="button"
            className={`report-freq-btn ${activeTab === "hedge" ? "active" : ""}`}
            style={{ padding: "4px 12px", fontSize: "11px" }}
            onClick={() => setActiveTab("hedge")}
          >
            <Shield size={12} /> Inflation Defense
          </button>
          <button
            type="button"
            className={`report-freq-btn ${activeTab === "converter" ? "active" : ""}`}
            style={{ padding: "4px 12px", fontSize: "11px" }}
            onClick={() => setActiveTab("converter")}
          >
            <ArrowRightLeft size={12} /> FX Converter
          </button>
        </div>
      </div>

      {/* Tab 1: Live Rates Grid */}
      {activeTab === "rates" && (
        <div>
          {/* Gold & Silver Tickers */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px", marginBottom: "12px" }}>
            <div style={{ background: "#fffbeb", border: "1px solid #fef3c7", borderRadius: "10px", padding: "12px" }}>
              <span style={{ fontSize: "10px", fontWeight: 700, color: "#b45309", textTransform: "uppercase" }}>
                Gold 24K (Per Tola)
              </span>
              <strong style={{ fontSize: "18px", color: "#92400e", display: "block", marginTop: "2px" }}>
                {formatPkr(LIVE_BULLION_RATES.gold24kTolaPaisa)}
              </strong>
              <small style={{ fontSize: "10px", color: "#b45309" }}>11.66g &bull; {formatPkr(goldGramRate)}/g</small>
            </div>

            <div style={{ background: "#fffbeb", border: "1px solid #fef3c7", borderRadius: "10px", padding: "12px" }}>
              <span style={{ fontSize: "10px", fontWeight: 700, color: "#b45309", textTransform: "uppercase" }}>
                Gold 22K (Per Tola)
              </span>
              <strong style={{ fontSize: "18px", color: "#92400e", display: "block", marginTop: "2px" }}>
                {formatPkr(LIVE_BULLION_RATES.gold22kTolaPaisa)}
              </strong>
              <small style={{ fontSize: "10px", color: "#b45309" }}>Jewelry Benchmark</small>
            </div>

            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "12px" }}>
              <span style={{ fontSize: "10px", fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>
                Silver (Per Tola)
              </span>
              <strong style={{ fontSize: "18px", color: "#1e293b", display: "block", marginTop: "2px" }}>
                {formatPkr(LIVE_BULLION_RATES.silverTolaPaisa)}
              </strong>
              <small style={{ fontSize: "10px", color: "#64748b" }}>Chandi &bull; Nisab Reference</small>
            </div>
          </div>

          {/* Forex Currencies Row */}
          <div style={{ display: "flex", gap: "10px", overflowX: "auto", paddingBottom: "4px" }}>
            {LIVE_FOREX_RATES.map((curr) => (
              <div
                key={curr.code}
                style={{
                  flex: "1 0 110px",
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  padding: "8px 10px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span>{curr.flag}</span>
                  <strong style={{ fontSize: "11px", color: "#0f172a" }}>{curr.code}</strong>
                </div>
                <strong style={{ fontSize: "13px", color: "#1e293b", display: "block", marginTop: "2px" }}>
                  Rs {(Number(curr.ratePkrPaisa) / 100).toFixed(2)}
                </strong>
                <span
                  style={{
                    fontSize: "9px",
                    fontWeight: 600,
                    color: curr.dailyChangePct >= 0 ? "#16a34a" : "#dc2626",
                  }}
                >
                  {curr.dailyChangePct >= 0 ? `+${curr.dailyChangePct}%` : `${curr.dailyChangePct}%`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Inflation Defense & Purchasing Power */}
      {activeTab === "hedge" && (
        <div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "10px",
              marginBottom: "12px",
            }}
          >
            <div style={{ padding: "12px", background: "#eff6ff", borderRadius: "10px", border: "1px solid #bfdbfe" }}>
              <span style={{ fontSize: "10px", fontWeight: 700, color: "#1d4ed8", textTransform: "uppercase" }}>
                USD Equivalent
              </span>
              <strong style={{ fontSize: "20px", color: "#1e3a8a", display: "block", marginTop: "2px" }}>
                ${hedgeMetrics.usdEquivalent}
              </strong>
              <small style={{ fontSize: "10px", color: "#2563eb" }}>Based on Interbank PKR 278.40</small>
            </div>

            <div style={{ padding: "12px", background: "#fef3c7", borderRadius: "10px", border: "1px solid #fde68a" }}>
              <span style={{ fontSize: "10px", fontWeight: 700, color: "#b45309", textTransform: "uppercase" }}>
                Gold Purchasing Power
              </span>
              <strong style={{ fontSize: "20px", color: "#92400e", display: "block", marginTop: "2px" }}>
                {hedgeMetrics.goldGramsEquivalent}g Gold
              </strong>
              <small style={{ fontSize: "10px", color: "#b45309" }}>24K pure bullion weight</small>
            </div>

            <div style={{ padding: "12px", background: "#fef2f2", borderRadius: "10px", border: "1px solid #fecaca" }}>
              <span style={{ fontSize: "10px", fontWeight: 700, color: "#b91c1c", textTransform: "uppercase" }}>
                1-Year CPI Inflation Loss
              </span>
              <strong style={{ fontSize: "20px", color: "#dc2626", display: "block", marginTop: "2px" }}>
                −{formatPkr(hedgeMetrics.projectedOneYearInflationLossPaisa)}
              </strong>
              <small style={{ fontSize: "10px", color: "#b91c1c" }}>Estimated at 11.8% annual CPI</small>
            </div>
          </div>

          <div
            style={{
              padding: "12px 14px",
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              borderRadius: "10px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "3px" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, padding: "2px 8px", borderRadius: "10px", background: "#166534", color: "#ffffff" }}>
                STRATEGIC RECOMMENDATION
              </span>
              <strong style={{ fontSize: "12px", color: "#166534" }}>{hedgeMetrics.hedgeRecommendation.title}</strong>
            </div>
            <p style={{ margin: 0, fontSize: "12px", color: "#14532d", lineHeight: 1.45 }}>
              {hedgeMetrics.hedgeRecommendation.advice}
            </p>
          </div>
        </div>
      )}

      {/* Tab 3: FX Converter */}
      {activeTab === "converter" && (
        <div style={{ display: "grid", gap: "12px", padding: "4px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: "11px", color: "#64748b", display: "block", marginBottom: "4px" }}>
                {converterDirection === "fxToPkr" ? "Foreign Currency Amount" : "Rupees Amount (PKR)"}
              </label>
              <input
                type="number"
                className="dialog-input"
                style={{ width: "100%", height: "36px", fontWeight: 700 }}
                value={inputAmount}
                onChange={(e) => setInputAmount(e.target.value)}
              />
            </div>

            <div style={{ width: "120px" }}>
              <label style={{ fontSize: "11px", color: "#64748b", display: "block", marginBottom: "4px" }}>Currency</label>
              <select
                className="dialog-select"
                style={{ width: "100%", height: "36px" }}
                value={selectedCurrency}
                onChange={(e) => setSelectedCurrency(e.target.value)}
              >
                {LIVE_FOREX_RATES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.code}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              className="outline-button"
              style={{ marginTop: "18px", height: "36px", padding: "0 12px" }}
              onClick={() => setConverterDirection((d) => (d === "fxToPkr" ? "pkrToFx" : "fxToPkr"))}
              title="Reverse Conversion Direction"
            >
              <ArrowRightLeft size={14} />
            </button>
          </div>

          <div
            style={{
              padding: "12px",
              background: "#eff6ff",
              border: "1px solid #bfdbfe",
              borderRadius: "10px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: "12px", color: "#1e40af", fontWeight: 600 }}>
              Equivalent Value in {converterDirection === "fxToPkr" ? "Pakistani Rupees (PKR)" : selectedCurrency}:
            </span>
            <strong style={{ fontSize: "18px", color: "#1e3a8a" }}>{convertedResult}</strong>
          </div>
        </div>
      )}
    </section>
  );
}

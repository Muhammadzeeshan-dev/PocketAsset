"use client";

import { useState } from "react";
import {
  Compass,
  Flame,
  Globe2,
  LineChart as LineChartIcon,
  Maximize2,
  Minimize2,
  Sparkles,
} from "lucide-react";
import { ForexBullionWidget } from "@/components/forex-bullion-widget";
import { PredictiveForecastWidget } from "@/components/predictive-forecast";
import { FireCalculatorWidget } from "@/components/fire-calculator-widget";
import type { FinanceAccount, FinanceTransaction } from "@/lib/finance";

interface IntelligenceHubProps {
  accounts: FinanceAccount[];
  transactions: FinanceTransaction[];
  selectedDate: string;
  totalLiquidPaisa: bigint;
  annualExpensesPaisa: bigint;
}

export function IntelligenceHub({
  accounts,
  transactions,
  selectedDate,
  totalLiquidPaisa,
  annualExpensesPaisa,
}: IntelligenceHubProps) {
  const [activeTab, setActiveTab] = useState<"fire" | "forecast" | "bullion">("fire");
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: "16px",
        overflow: "hidden",
        boxShadow: "0 4px 20px -4px rgba(15, 23, 42, 0.05)",
        marginBottom: "20px",
        transition: "all 0.2s ease",
      }}
    >
      {/* Top Segmented Navigation Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "10px",
          padding: "12px 18px",
          background: "#f8fafc",
          borderBottom: isCollapsed ? "none" : "1px solid #e2e8f0",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "7px",
              background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
              display: "grid",
              placeItems: "center",
              color: "#ffffff",
            }}
          >
            <Sparkles size={15} />
          </div>
          <div>
            <span style={{ fontSize: "13px", fontWeight: "700", color: "#0f172a", display: "block" }}>
              Financial Intelligence &amp; Forecast Hub
            </span>
          </div>
        </div>

        {/* Tab Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
          <div
            style={{
              display: "inline-flex",
              background: "#e2e8f0",
              padding: "3px",
              borderRadius: "9px",
              gap: "2px",
            }}
          >
            <button
              type="button"
              onClick={() => {
                setActiveTab("fire");
                setIsCollapsed(false);
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                padding: "5px 12px",
                borderRadius: "7px",
                border: "none",
                fontSize: "11px",
                fontWeight: "600",
                cursor: "pointer",
                background: activeTab === "fire" ? "#ffffff" : "transparent",
                color: activeTab === "fire" ? "#0f172a" : "#64748b",
                boxShadow: activeTab === "fire" ? "0 1px 3px rgba(0, 0, 0, 0.08)" : "none",
                transition: "all 0.15s ease",
              }}
            >
              <Flame size={13} color={activeTab === "fire" ? "#f59e0b" : "#94a3b8"} />
              FIRE &amp; Compound
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("forecast");
                setIsCollapsed(false);
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                padding: "5px 12px",
                borderRadius: "7px",
                border: "none",
                fontSize: "11px",
                fontWeight: "600",
                cursor: "pointer",
                background: activeTab === "forecast" ? "#ffffff" : "transparent",
                color: activeTab === "forecast" ? "#0f172a" : "#64748b",
                boxShadow: activeTab === "forecast" ? "0 1px 3px rgba(0, 0, 0, 0.08)" : "none",
                transition: "all 0.15s ease",
              }}
            >
              <LineChartIcon size={13} color={activeTab === "forecast" ? "#2563eb" : "#94a3b8"} />
              Cash Flow Forecast
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("bullion");
                setIsCollapsed(false);
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                padding: "5px 12px",
                borderRadius: "7px",
                border: "none",
                fontSize: "11px",
                fontWeight: "600",
                cursor: "pointer",
                background: activeTab === "bullion" ? "#ffffff" : "transparent",
                color: activeTab === "bullion" ? "#0f172a" : "#64748b",
                boxShadow: activeTab === "bullion" ? "0 1px 3px rgba(0, 0, 0, 0.08)" : "none",
                transition: "all 0.15s ease",
              }}
            >
              <Globe2 size={13} color={activeTab === "bullion" ? "#059669" : "#94a3b8"} />
              Saraf Gold &amp; FX
            </button>
          </div>

          <button
            type="button"
            className="icon-button"
            style={{ width: "28px", height: "28px" }}
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? "Expand Hub" : "Collapse Hub"}
          >
            {isCollapsed ? <Maximize2 size={13} /> : <Minimize2 size={13} />}
          </button>
        </div>
      </div>

      {/* Active Tab Content */}
      {!isCollapsed && (
        <div style={{ padding: "16px 18px 4px" }}>
          {activeTab === "fire" && (
            <FireCalculatorWidget
              currentNetWorthPaisa={totalLiquidPaisa + 1740426n}
              defaultMonthlySavingsPaisa={500000n}
              annualExpensesPaisa={annualExpensesPaisa}
            />
          )}

          {activeTab === "forecast" && (
            <PredictiveForecastWidget
              accounts={accounts}
              transactions={transactions}
              selectedDate={selectedDate}
            />
          )}

          {activeTab === "bullion" && (
            <ForexBullionWidget totalLiquidPaisa={totalLiquidPaisa} />
          )}
        </div>
      )}
    </div>
  );
}

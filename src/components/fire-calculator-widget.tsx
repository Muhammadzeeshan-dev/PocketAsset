"use client";

import { useMemo, useState } from "react";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Compass,
  Flame,
  Info,
  Rocket,
  Sliders,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { formatPkr } from "@/lib/finance";
import {
  simulateWealthMilestones,
  type FireSimulationResult,
} from "@/lib/fire-calculator";

interface FireCalculatorWidgetProps {
  currentNetWorthPaisa: bigint;
  defaultMonthlySavingsPaisa?: bigint;
  annualExpensesPaisa?: bigint;
}

export function FireCalculatorWidget({
  currentNetWorthPaisa,
  defaultMonthlySavingsPaisa = 500000n, // Rs. 5,000 default
  annualExpensesPaisa = 0n,
}: FireCalculatorWidgetProps) {
  // Monthly savings in rupees slider (from 1,000 to 100,000)
  const [monthlySavingsRs, setMonthlySavingsRs] = useState<number>(
    defaultMonthlySavingsPaisa > 0n ? Number(defaultMonthlySavingsPaisa / 100n) : 5000
  );
  const [returnRatePct, setReturnRatePct] = useState<number>(14.5); // PSX Benchmark

  const simulation: FireSimulationResult = useMemo(() => {
    const savingsPaisa = BigInt(monthlySavingsRs) * 100n;
    return simulateWealthMilestones(
      currentNetWorthPaisa,
      savingsPaisa,
      annualExpensesPaisa,
      returnRatePct
    );
  }, [currentNetWorthPaisa, monthlySavingsRs, annualExpensesPaisa, returnRatePct]);

  return (
    <div
      style={{
        background: "linear-gradient(135deg, #091322 0%, #0d1e38 50%, #081120 100%)",
        border: "1px solid rgba(59, 130, 246, 0.28)",
        borderRadius: "18px",
        padding: "24px",
        color: "#ffffff",
        boxShadow: "0 12px 36px -10px rgba(15, 23, 42, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05)",
        marginBottom: "24px",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "16px",
          marginBottom: "20px",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          paddingBottom: "16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
              display: "grid",
              placeItems: "center",
              boxShadow: "0 0 18px rgba(245, 158, 11, 0.35)",
            }}
          >
            <Flame size={24} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "1px", color: "#fbbf24" }}>
                Compound Wealth Simulator
              </span>
              <span style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "999px", background: "rgba(251, 191, 36, 0.15)", color: "#fbbf24", fontWeight: "700" }}>
                FIRE &bull; PSX 14.5% Benchmark
              </span>
            </div>
            <h2 style={{ margin: "2px 0 0", fontSize: "18px", fontWeight: "800", color: "#f8fafc" }}>
              Milestone Wealth Forecaster &bull; Journey to Your 1st Crore
            </h2>
          </div>
        </div>

        {/* Interactive Monthly Savings Slider */}
        <div
          style={{
            background: "rgba(255, 255, 255, 0.05)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: "12px",
            padding: "10px 16px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            minWidth: "260px",
            maxWidth: "100%",
            flex: "1 1 auto",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "10px", color: "#94a3b8", textTransform: "uppercase", fontWeight: "700" }}>
              Simulate Monthly Savings
            </span>
            <span style={{ fontSize: "15px", fontWeight: "800", color: "#38bdf8" }}>
              Rs. {monthlySavingsRs.toLocaleString("en-PK")}/mo
            </span>
          </div>
          <input
            type="range"
            min="1000"
            max="50000"
            step="1000"
            value={monthlySavingsRs}
            onChange={(e) => setMonthlySavingsRs(Number(e.target.value))}
            className="pro-range"
            style={{ width: "100%", accentColor: "#38bdf8", cursor: "pointer", margin: "4px 0" }}
          />
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {[2000, 5000, 10000, 20000, 50000].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setMonthlySavingsRs(preset)}
                style={{
                  padding: "3px 8px",
                  borderRadius: "6px",
                  fontSize: "10px",
                  fontWeight: 650,
                  border: monthlySavingsRs === preset ? "1px solid #38bdf8" : "1px solid rgba(255, 255, 255, 0.15)",
                  background: monthlySavingsRs === preset ? "rgba(56, 189, 248, 0.2)" : "rgba(255, 255, 255, 0.05)",
                  color: monthlySavingsRs === preset ? "#38bdf8" : "#cbd5e1",
                  cursor: "pointer",
                }}
              >
                Rs. {preset >= 1000 ? `${preset / 1000}k` : preset}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 4 Milestones Progress Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
          gap: "14px",
          marginBottom: "20px",
        }}
      >
        {simulation.milestones.map((m) => (
          <div
            key={m.id}
            style={{
              background: m.isAchieved ? "rgba(16, 185, 129, 0.08)" : "rgba(255, 255, 255, 0.03)",
              border: m.isAchieved ? "1px solid rgba(16, 185, 129, 0.3)" : "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "12px",
              padding: "14px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              transition: "transform 0.15s ease",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                <span style={{ fontSize: "12px", fontWeight: "700", color: m.isAchieved ? "#34d399" : "#f1f5f9" }}>
                  {m.title}
                </span>
                {m.isAchieved ? (
                  <CheckCircle2 size={16} color="#34d399" />
                ) : (
                  <span style={{ fontSize: "10px", color: "#38bdf8", fontWeight: "700", fontFamily: "var(--font-mono, monospace)" }}>
                    {m.currentProgressPct}%
                  </span>
                )}
              </div>

              {/* Progress Bar */}
              <div
                style={{
                  width: "100%",
                  height: "6px",
                  borderRadius: "999px",
                  background: "rgba(255, 255, 255, 0.1)",
                  overflow: "hidden",
                  marginBottom: "8px",
                }}
              >
                <div
                  style={{
                    width: `${m.currentProgressPct}%`,
                    height: "100%",
                    borderRadius: "999px",
                    background: m.isAchieved
                      ? "linear-gradient(90deg, #10b981, #34d399)"
                      : "linear-gradient(90deg, #3b82f6, #38bdf8)",
                    transition: "width 0.4s ease",
                  }}
                />
              </div>

              <div style={{ fontSize: "11px", color: "#94a3b8", lineHeight: "1.4" }}>
                {m.description}
              </div>
            </div>

            <div style={{ marginTop: "12px", paddingTop: "8px", borderTop: "1px solid rgba(255, 255, 255, 0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "10px", color: "#64748b", textTransform: "uppercase", fontWeight: "600" }}>
                Estimated Date:
              </span>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: "700",
                  color: m.isAchieved ? "#34d399" : "#fbbf24",
                  fontFamily: "var(--font-mono, monospace)",
                }}
              >
                {m.targetDateStr}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* 5-Year & 10-Year Compounding Telemetry Strip */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "12px",
          paddingTop: "16px",
          borderTop: "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >
        <div style={{ background: "rgba(255, 255, 255, 0.03)", padding: "10px 14px", borderRadius: "10px" }}>
          <span style={{ fontSize: "10px", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            5-Year Compounded Projection
          </span>
          <div style={{ fontSize: "15px", fontWeight: "800", color: "#f8fafc", marginTop: "2px" }}>
            {formatPkr(simulation.compoundedBalance5YearsPaisa)}
          </div>
          <span style={{ fontSize: "10px", color: "#34d399" }}>
            At Rs. {monthlySavingsRs.toLocaleString("en-PK")}/mo reinvested
          </span>
        </div>

        <div style={{ background: "rgba(255, 255, 255, 0.03)", padding: "10px 14px", borderRadius: "10px" }}>
          <span style={{ fontSize: "10px", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            10-Year Compounded Projection
          </span>
          <div style={{ fontSize: "15px", fontWeight: "800", color: "#38bdf8", marginTop: "2px" }}>
            {formatPkr(simulation.compoundedBalance10YearsPaisa)}
          </div>
          <span style={{ fontSize: "10px", color: "#38bdf8" }}>
            Exponential growth kicks in 🚀
          </span>
        </div>

        <div style={{ background: "rgba(255, 255, 255, 0.03)", padding: "10px 14px", borderRadius: "10px" }}>
          <span style={{ fontSize: "10px", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            FIRE Target (4% Rule)
          </span>
          <div style={{ fontSize: "15px", fontWeight: "800", color: "#fbbf24", marginTop: "2px" }}>
            {formatPkr(simulation.fireNumberPaisa)}
          </div>
          <span style={{ fontSize: "10px", color: "#fbbf24" }}>
            Generates ~{formatPkr(simulation.fireNumberPaisa / 25n)}/yr passive
          </span>
        </div>
      </div>
    </div>
  );
}

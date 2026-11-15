"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  Layers,
  LineChart as LineChartIcon,
  ShieldCheck,
  TrendingDown,
  Wallet,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatPkr, paisaToChartNumber, type FinanceAccount, type FinanceTransaction } from "@/lib/finance";
import { generateCashFlowForecast, type CashFlowForecast } from "@/lib/predictive-cashflow";

interface PredictiveForecastProps {
  accounts: FinanceAccount[];
  transactions: FinanceTransaction[];
  selectedDate: string;
}

export function PredictiveForecastWidget({
  accounts,
  transactions,
  selectedDate,
}: PredictiveForecastProps) {
  const [forecastHorizon, setForecastHorizon] = useState<14 | 30>(30);

  const forecast: CashFlowForecast = useMemo(() => {
    return generateCashFlowForecast(accounts, transactions, selectedDate, forecastHorizon);
  }, [accounts, transactions, selectedDate, forecastHorizon]);

  const chartData = useMemo(() => {
    return forecast.projectedDays.map((d) => ({
      date: d.dateKey.slice(5), // MM-DD
      day: d.dayName,
      totalLiquid: paisaToChartNumber(d.projectedLiquidBalancePaisa),
      cashInHand: paisaToChartNumber(d.projectedCashPaisa),
      wallets: paisaToChartNumber(d.projectedWalletPaisa),
      zone: d.zone,
    }));
  }, [forecast]);

  return (
    <section className="dashboard-card" style={{ marginBottom: "20px" }}>
      <div className="report-card-header" style={{ marginBottom: "14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              background: "#eff6ff",
              color: "#2563eb",
              display: "grid",
              placeItems: "center",
            }}
          >
            <LineChartIcon size={17} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: "15px" }}>30-Day Forward Cash Flow &amp; Burn Forecaster</h3>
            <small style={{ color: "#64748b", fontSize: "11px" }}>
              Predictive daily runway simulation based on routine velocity
            </small>
          </div>
        </div>

        <div className="report-frequency-bar" style={{ margin: 0, padding: "3px" }}>
          <button
            type="button"
            className={`report-freq-btn ${forecastHorizon === 14 ? "active" : ""}`}
            style={{ padding: "4px 12px", fontSize: "11px" }}
            onClick={() => setForecastHorizon(14)}
          >
            14-Day Outlook
          </button>
          <button
            type="button"
            className={`report-freq-btn ${forecastHorizon === 30 ? "active" : ""}`}
            style={{ padding: "4px 12px", fontSize: "11px" }}
            onClick={() => setForecastHorizon(30)}
          >
            30-Day Outlook
          </button>
        </div>
      </div>

      {/* KPI Prediction Row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
          gap: "10px",
          marginBottom: "14px",
        }}
      >
        <div style={{ padding: "12px", background: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
          <span style={{ fontSize: "10px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
            Estimated Daily Velocity
          </span>
          <strong style={{ fontSize: "18px", color: "#0f172a", display: "block", marginTop: "2px" }}>
            {formatPkr(forecast.dailyBurnPaisa)} / day
          </strong>
          <small style={{ fontSize: "10px", color: "#64748b" }}>Routine student spending burn</small>
        </div>

        <div style={{ padding: "12px", background: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
          <span style={{ fontSize: "10px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
            Pocket Cash Depletion
          </span>
          <strong
            style={{
              fontSize: "18px",
              color: forecast.daysUntilCashExhaustion <= 10 ? "#dc2626" : "#2563eb",
              display: "block",
              marginTop: "2px",
            }}
          >
            ~{forecast.daysUntilCashExhaustion} Days Left
          </strong>
          <small style={{ fontSize: "10px", color: "#64748b" }}>Before Cash in hand drops to zero</small>
        </div>

        <div style={{ padding: "12px", background: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
          <span style={{ fontSize: "10px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
            Projected Day {forecastHorizon} Balance
          </span>
          <strong
            style={{
              fontSize: "18px",
              color: forecast.projectedBalanceDay30Paisa > 0n ? "#16a34a" : "#dc2626",
              display: "block",
              marginTop: "2px",
            }}
          >
            {formatPkr(forecast.projectedBalanceDay30Paisa)}
          </strong>
          <small style={{ fontSize: "10px", color: "#64748b" }}>Cumulative forward buffer</small>
        </div>
      </div>

      {/* Predictive Area Chart */}
      <div style={{ width: "100%", height: 210, marginBottom: "14px" }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 8, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="liquidGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="cashGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
            <YAxis stroke="#64748b" fontSize={10} tickLine={false} tickFormatter={(v) => `Rs ${v}`} />
            <Tooltip
              formatter={(value: unknown, name: unknown) => [
                `Rs ${Number(value).toLocaleString()}`,
                name === "totalLiquid" ? "Total Liquid" : name === "cashInHand" ? "Cash in Hand" : "Wallets",
              ]}
              labelFormatter={(label) => `Projected Date: ${label}`}
              contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "12px" }}
            />
            <Area
              type="monotone"
              dataKey="totalLiquid"
              name="totalLiquid"
              stroke="#2563eb"
              fillOpacity={1}
              fill="url(#liquidGrad)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="cashInHand"
              name="cashInHand"
              stroke="#10b981"
              fillOpacity={1}
              fill="url(#cashGrad)"
              strokeWidth={1.5}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Smart Rebalance Recommendation Banner */}
      {forecast.rebalanceAdvice.needed ? (
        <div
          style={{
            padding: "12px 14px",
            background: "#fffbeb",
            border: "1px solid #fef3c7",
            borderRadius: "10px",
            display: "flex",
            alignItems: "flex-start",
            gap: "10px",
          }}
        >
          <AlertTriangle size={18} color="#d97706" style={{ flex: "0 0 18px", marginTop: "2px" }} />
          <div style={{ flex: 1 }}>
            <strong style={{ fontSize: "12px", color: "#92400e", display: "block", marginBottom: "2px" }}>
              Suggested Cash Rebalancing Action
            </strong>
            <p style={{ margin: 0, fontSize: "11px", color: "#b45309", lineHeight: 1.45 }}>
              {forecast.rebalanceAdvice.message}
            </p>
          </div>
        </div>
      ) : (
        <div
          style={{
            padding: "10px 14px",
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderRadius: "10px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <ShieldCheck size={16} color="#16a34a" />
          <span style={{ fontSize: "12px", color: "#166534", fontWeight: 600 }}>
            {forecast.rebalanceAdvice.message}
          </span>
        </div>
      )}
    </section>
  );
}

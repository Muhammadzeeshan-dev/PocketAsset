"use client";

import { useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  BarChart as BarIcon,
  Calendar,
  Download,
  FileSpreadsheet,
  Printer,
  RefreshCw,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  formatPkr,
  getDaySummary,
  getMonthlySummary,
  getPakistanDateKey,
  getWeeklySummary,
  paisaToChartNumber,
  toPaisa,
  type FinanceAccount,
  type FinanceTransaction,
} from "@/lib/finance";
import { generateCsvExport, getYearlySummary } from "@/lib/reports";

interface ReportsPageProps {
  accounts: FinanceAccount[];
  transactions: FinanceTransaction[];
  selectedDate: string;
  dataAvailable: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onToast: (msg: string) => void;
}

const CATEGORY_COLORS = ["#2563eb", "#059669", "#d97706", "#7c3aed", "#e11d48", "#0891b2", "#64748b"];

export function ReportsPage({
  accounts,
  transactions,
  selectedDate,
  dataAvailable,
  refreshing,
  onRefresh,
  onToast,
}: ReportsPageProps) {
  const [reportType, setReportType] = useState<"daily" | "weekly" | "monthly" | "yearly">("monthly");
  const [targetMonth, setTargetMonth] = useState(() => selectedDate.slice(0, 7));
  const [targetYear, setTargetYear] = useState(() => selectedDate.slice(0, 4));

  const daySummary = useMemo(() => {
    return getDaySummary(selectedDate, accounts, transactions);
  }, [selectedDate, accounts, transactions]);

  const weeklySummary = useMemo(() => {
    return getWeeklySummary(selectedDate, accounts, transactions);
  }, [selectedDate, accounts, transactions]);

  const monthlySummary = useMemo(() => {
    return getMonthlySummary(targetMonth, transactions);
  }, [targetMonth, transactions]);

  const yearlySummary = useMemo(() => {
    return getYearlySummary(targetYear, transactions);
  }, [targetYear, transactions]);

  // Zero-income days and highest expense day this week
  const zeroIncomeDays = useMemo(() => {
    return weeklySummary.filter((d) => d.received === 0n).map((d) => d.weekday);
  }, [weeklySummary]);

  const highestExpenseDay = useMemo(() => {
    return [...weeklySummary].sort((a, b) => (b.expenses > a.expenses ? 1 : -1))[0];
  }, [weeklySummary]);

  function handleExportCsv() {
    try {
      const csvContent = generateCsvExport(transactions, accounts);
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `PocketAsset_Ledger_${getPakistanDateKey(new Date())}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      onToast("Ledger exported as CSV.");
    } catch {
      alert("Failed to export CSV.");
    }
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div className="reports-analytics-page">
      <section className="page-heading">
        <div>
          <p className="eyebrow">Financial intelligence & statements</p>
          <h1>Reports & Analytics<span className="heading-period">.</span></h1>
          <p className="page-subtitle">
            Comprehensive audit reports across daily cash flow, weekly university routines, monthly savings, and yearly trends.
          </p>
        </div>
        <div className="heading-actions">
          <button type="button" className="outline-button refresh-button" onClick={onRefresh} disabled={refreshing}>
            <RefreshCw size={15} className={refreshing ? "spin" : ""} /> Refresh
          </button>
          <button type="button" className="outline-button" onClick={handleExportCsv}>
            <FileSpreadsheet size={15} /> Export CSV
          </button>
          <button type="button" className="primary-button" onClick={handlePrint}>
            <Printer size={15} /> Print Report
          </button>
        </div>
      </section>

      {/* Report Frequency Selector */}
      <div style={{ display: "flex", gap: "0.5rem", borderBottom: "1px solid #e2e8f0", marginBottom: "1.5rem" }}>
        {(["daily", "weekly", "monthly", "yearly"] as const).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setReportType(type)}
            style={{
              padding: "0.5rem 1rem",
              fontWeight: 600,
              textTransform: "capitalize",
              borderBottom: reportType === type ? "2px solid #2563eb" : "none",
              color: reportType === type ? "#2563eb" : "#64748b",
              background: "none",
              border: "none",
              cursor: "pointer",
            }}
          >
            {type} Report
          </button>
        ))}
      </div>

      {/* DAILY REPORT */}
      {reportType === "daily" && (
        <div>
          <div className="kpi-grid">
            <div className="kpi-card">
              <span className="kpi-label">Opening Balance</span>
              <strong className="kpi-value">{formatPkr(daySummary.openingBalance)}</strong>
              <small className="kpi-sub">Carried from previous day</small>
            </div>
            <div className="kpi-card">
              <span className="kpi-label">Money Received</span>
              <strong className="kpi-value" style={{ color: "#16a34a" }}>
                +{formatPkr(daySummary.received + daySummary.otherInflows)}
              </strong>
              <small className="kpi-sub">Confirmed inflows</small>
            </div>
            <div className="kpi-card">
              <span className="kpi-label">Spending & Purchases</span>
              <strong className="kpi-value" style={{ color: "#dc2626" }}>
                −{formatPkr(daySummary.expenses + daySummary.investmentPurchases)}
              </strong>
              <small className="kpi-sub">{daySummary.transactionCount} transactions</small>
            </div>
            <div className="kpi-card">
              <span className="kpi-label">Closing Balance</span>
              <strong className="kpi-value">{formatPkr(daySummary.closingBalance)}</strong>
              <small className="kpi-sub">Available for tomorrow</small>
            </div>
          </div>
        </div>
      )}

      {/* WEEKLY REPORT */}
      {reportType === "weekly" && (
        <div>
          <div className="kpi-grid">
            <div className="kpi-card">
              <span className="kpi-label">Weekly Inflows</span>
              <strong className="kpi-value" style={{ color: "#16a34a" }}>
                +{formatPkr(weeklySummary.reduce((acc, d) => acc + d.received + d.otherInflows, 0n))}
              </strong>
              <small className="kpi-sub">Allowances & other income</small>
            </div>
            <div className="kpi-card">
              <span className="kpi-label">Weekly Spending</span>
              <strong className="kpi-value" style={{ color: "#dc2626" }}>
                −{formatPkr(weeklySummary.reduce((acc, d) => acc + d.expenses, 0n))}
              </strong>
              <small className="kpi-sub">Highest: {highestExpenseDay?.weekday} ({formatPkr(highestExpenseDay?.expenses || 0n)})</small>
            </div>
            <div className="kpi-card">
              <span className="kpi-label">Zero-Income Days</span>
              <strong className="kpi-value">{zeroIncomeDays.length} days</strong>
              <small className="kpi-sub">{zeroIncomeDays.join(", ") || "None"}</small>
            </div>
          </div>

          <section className="dashboard-card" style={{ marginTop: "1.5rem" }}>
            <h3>Day-by-Day Financial Summary (Mon–Sun)</h3>
            <div className="ledger-table-wrap" style={{ marginTop: "1rem" }}>
              <table className="ledger-table">
                <thead>
                  <tr>
                    <th>Day & Date</th>
                    <th>Opening</th>
                    <th>Received</th>
                    <th>Spent</th>
                    <th>Closing Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {weeklySummary.map((d) => (
                    <tr key={d.date}>
                      <td>
                        <strong>{d.weekday}</strong> <small style={{ color: "#64748b" }}>({d.date})</small>
                      </td>
                      <td>{formatPkr(d.openingBalance)}</td>
                      <td style={{ color: d.received > 0n ? "#16a34a" : "#64748b" }}>
                        {d.received > 0n ? `+${formatPkr(d.received)}` : "—"}
                      </td>
                      <td style={{ color: d.expenses > 0n ? "#dc2626" : "#64748b" }}>
                        {d.expenses > 0n ? `−${formatPkr(d.expenses)}` : "—"}
                      </td>
                      <td>
                        <strong>{formatPkr(d.closingBalance)}</strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* MONTHLY REPORT */}
      {reportType === "monthly" && (
        <div>
          <div className="kpi-grid">
            <div className="kpi-card">
              <span className="kpi-label">Monthly Confirmed Income</span>
              <strong className="kpi-value" style={{ color: "#16a34a" }}>
                +{formatPkr(monthlySummary.income)}
              </strong>
              <small className="kpi-sub">Month: {targetMonth}</small>
            </div>
            <div className="kpi-card">
              <span className="kpi-label">Monthly Expenses</span>
              <strong className="kpi-value" style={{ color: "#dc2626" }}>
                −{formatPkr(monthlySummary.expenses)}
              </strong>
              <small className="kpi-sub">{monthlySummary.expenseCategories.length} active categories</small>
            </div>
            <div className="kpi-card">
              <span className="kpi-label">Monthly Net Savings</span>
              <strong className="kpi-value" style={{ color: monthlySummary.savings >= 0n ? "#2563eb" : "#dc2626" }}>
                {formatPkr(monthlySummary.savings)}
              </strong>
              <small className="kpi-sub">
                {monthlySummary.income > 0n
                  ? `${((Number(monthlySummary.savings) / Number(monthlySummary.income)) * 100).toFixed(1)}% savings rate`
                  : "0%"}
              </small>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "1.5rem", marginTop: "1.5rem" }}>
            <section className="dashboard-card">
              <h3>Expense Categories Breakdown</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "1rem" }}>
                {monthlySummary.expenseCategories.map((c, i) => {
                  const pct = monthlySummary.expenses > 0n
                    ? Math.round((Number(c.amount) / Number(monthlySummary.expenses)) * 100)
                    : 0;
                  return (
                    <div key={c.category}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                        <strong>{c.category}</strong>
                        <span>{formatPkr(c.amount)} ({pct}%)</span>
                      </div>
                      <div style={{ height: "6px", backgroundColor: "#f1f5f9", borderRadius: "3px", overflow: "hidden", marginTop: "4px" }}>
                        <div style={{ height: "100%", width: `${pct}%`, backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        </div>
      )}

      {/* YEARLY REPORT */}
      {reportType === "yearly" && (
        <div>
          <div className="kpi-grid">
            <div className="kpi-card">
              <span className="kpi-label">Yearly Income</span>
              <strong className="kpi-value" style={{ color: "#16a34a" }}>
                +{formatPkr(yearlySummary.totalIncomePaisa)}
              </strong>
              <small className="kpi-sub">Full year {targetYear}</small>
            </div>
            <div className="kpi-card">
              <span className="kpi-label">Yearly Expenses</span>
              <strong className="kpi-value" style={{ color: "#dc2626" }}>
                −{formatPkr(yearlySummary.totalExpensesPaisa)}
              </strong>
              <small className="kpi-sub">All living & study costs</small>
            </div>
            <div className="kpi-card">
              <span className="kpi-label">Annual Wealth Saved</span>
              <strong className="kpi-value" style={{ color: "#2563eb" }}>
                {formatPkr(yearlySummary.totalSavingsPaisa)}
              </strong>
              <small className="kpi-sub">Retained wealth</small>
            </div>
          </div>

          <section className="dashboard-card" style={{ marginTop: "1.5rem" }}>
            <h3>Annual 12-Month Performance</h3>
            <div className="ledger-table-wrap" style={{ marginTop: "1rem" }}>
              <table className="ledger-table">
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Income</th>
                    <th>Expenses</th>
                    <th>Savings</th>
                  </tr>
                </thead>
                <tbody>
                  {yearlySummary.monthlyBreakdown.map((m) => (
                    <tr key={m.month}>
                      <td><strong>{m.monthName} {targetYear}</strong></td>
                      <td style={{ color: m.incomePaisa > 0n ? "#16a34a" : "#64748b" }}>
                        {formatPkr(m.incomePaisa)}
                      </td>
                      <td style={{ color: m.expensesPaisa > 0n ? "#dc2626" : "#64748b" }}>
                        {formatPkr(m.expensesPaisa)}
                      </td>
                      <td style={{ fontWeight: 600, color: m.savingsPaisa >= 0n ? "#0f172a" : "#dc2626" }}>
                        {formatPkr(m.savingsPaisa)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}


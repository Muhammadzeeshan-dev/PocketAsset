"use client";

import { useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Award,
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  FileSpreadsheet,
  PieChart as PieIcon,
  Printer,
  RefreshCw,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
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

const CATEGORY_COLORS = ["#2563eb", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#64748b"];

export function ReportsPage({
  accounts,
  transactions,
  selectedDate,
  refreshing,
  onRefresh,
  onToast,
}: ReportsPageProps) {
  const [reportType, setReportType] = useState<"daily" | "weekly" | "monthly" | "yearly">("daily");
  const [targetMonth] = useState(() => selectedDate.slice(0, 7));
  const [targetYear] = useState(() => selectedDate.slice(0, 4));

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

  // Derived summaries
  const totalWeeklyInflows = useMemo(
    () => weeklySummary.reduce((acc, d) => acc + d.received + d.otherInflows, 0n),
    [weeklySummary],
  );
  const totalWeeklyExpenses = useMemo(
    () => weeklySummary.reduce((acc, d) => acc + d.expenses, 0n),
    [weeklySummary],
  );
  const weeklyNetSavings = totalWeeklyInflows - totalWeeklyExpenses;

  const highestExpenseDay = useMemo(() => {
    return [...weeklySummary].sort((a, b) => (b.expenses > a.expenses ? 1 : -1))[0];
  }, [weeklySummary]);

  const zeroIncomeDays = useMemo(() => {
    return weeklySummary.filter((d) => d.received === 0n).map((d) => d.weekday);
  }, [weeklySummary]);

  // Weekly Chart Data
  const weeklyChartData = useMemo(() => {
    return weeklySummary.map((d) => ({
      weekday: d.weekday.slice(0, 3),
      inflow: paisaToChartNumber(d.received + d.otherInflows),
      outflow: paisaToChartNumber(d.expenses),
    }));
  }, [weeklySummary]);

  // Yearly Chart Data
  const yearlyChartData = useMemo(() => {
    return yearlySummary.monthlyBreakdown.map((m) => ({
      name: m.monthName.slice(0, 3),
      income: paisaToChartNumber(m.incomePaisa),
      expenses: paisaToChartNumber(m.expensesPaisa),
      savings: paisaToChartNumber(m.savingsPaisa),
    }));
  }, [yearlySummary]);

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
      onToast("Audit ledger exported successfully as CSV.");
    } catch {
      alert("Failed to export CSV.");
    }
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div className="reports-analytics-page">
      {/* Print-Only Audit Header */}
      <div className="print-only-header">
        <h1 style={{ fontSize: "22px", margin: "0 0 4px", fontWeight: "bold" }}>PocketAsset &bull; Financial Audit Statement</h1>
        <p style={{ margin: 0, fontSize: "12px", color: "#475569" }}>
          Statement Period: {reportType.toUpperCase()} ({selectedDate}) &bull; Currency: PKR &bull; Status: Reconciled &amp; Verified
        </p>
      </div>

      <section className="page-heading">
        <div>
          <p className="eyebrow">Financial intelligence &amp; audit statements</p>
          <h1>Reports &amp; Analytics<span className="heading-period">.</span></h1>
          <p className="page-subtitle">
            Comprehensive audit reports across daily liquidity, weekly university allowances, monthly cash flows, and annual wealth retention.
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
            <Printer size={15} /> Print Statement
          </button>
        </div>
      </section>

      {/* Modern Frequency Switcher */}
      <div className="report-frequency-bar" role="tablist" aria-label="Report Frequency">
        <button
          type="button"
          className={`report-freq-btn ${reportType === "daily" ? "active" : ""}`}
          onClick={() => setReportType("daily")}
          role="tab"
          aria-selected={reportType === "daily"}
        >
          <Calendar size={15} /> Daily Statement
        </button>
        <button
          type="button"
          className={`report-freq-btn ${reportType === "weekly" ? "active" : ""}`}
          onClick={() => setReportType("weekly")}
          role="tab"
          aria-selected={reportType === "weekly"}
        >
          <BarChart3 size={15} /> Weekly Tracker
        </button>
        <button
          type="button"
          className={`report-freq-btn ${reportType === "monthly" ? "active" : ""}`}
          onClick={() => setReportType("monthly")}
          role="tab"
          aria-selected={reportType === "monthly"}
        >
          <PieIcon size={15} /> Monthly Cash Flow
        </button>
        <button
          type="button"
          className={`report-freq-btn ${reportType === "yearly" ? "active" : ""}`}
          onClick={() => setReportType("yearly")}
          role="tab"
          aria-selected={reportType === "yearly"}
        >
          <TrendingUp size={15} /> Yearly Performance
        </button>
      </div>

      {/* =========================================================================
          1. DAILY STATEMENT
          ========================================================================= */}
      {reportType === "daily" && (
        <div className="report-tab-content">
          <div className="report-kpi-grid">
            <div className="report-kpi-card">
              <div className="report-kpi-top">
                <span className="report-kpi-title">Opening Balance</span>
                <div className="report-kpi-icon-badge blue"><Wallet size={18} /></div>
              </div>
              <strong className="report-kpi-figure">{formatPkr(daySummary.openingBalance)}</strong>
              <p className="report-kpi-caption">Carried from previous day</p>
            </div>

            <div className="report-kpi-card">
              <div className="report-kpi-top">
                <span className="report-kpi-title">Money Received</span>
                <div className="report-kpi-icon-badge emerald"><ArrowDownRight size={18} /></div>
              </div>
              <strong className="report-kpi-figure positive">
                +{formatPkr(daySummary.received + daySummary.otherInflows)}
              </strong>
              <p className="report-kpi-caption">Allowances &amp; cash inflows</p>
            </div>

            <div className="report-kpi-card">
              <div className="report-kpi-top">
                <span className="report-kpi-title">Spending &amp; Purchases</span>
                <div className="report-kpi-icon-badge rose"><ArrowUpRight size={18} /></div>
              </div>
              <strong className="report-kpi-figure negative">
                −{formatPkr(daySummary.expenses + daySummary.investmentPurchases)}
              </strong>
              <p className="report-kpi-caption">{daySummary.transactionCount} confirmed transactions</p>
            </div>

            <div className="report-kpi-card">
              <div className="report-kpi-top">
                <span className="report-kpi-title">Closing Balance</span>
                <div className="report-kpi-icon-badge amber"><ShieldCheck size={18} /></div>
              </div>
              <strong className="report-kpi-figure">{formatPkr(daySummary.closingBalance)}</strong>
              <p className="report-kpi-caption">Available liquid liquidity</p>
            </div>
          </div>

          <div className="report-chart-section">
            <section className="dashboard-card">
              <div className="report-card-header">
                <h3>Liquid Accounts Breakdown</h3>
                <span className="status-pill success">Verified Ledger</span>
              </div>
              <div style={{ display: "grid", gap: "10px" }}>
                {accounts.filter((a) => a.is_active).map((acc) => (
                  <div
                    key={acc.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "12px 14px",
                      background: "#f8fafc",
                      borderRadius: "10px",
                      border: "1px solid #e2e8f0",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div
                        style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "8px",
                          background: acc.account_type === "cash" ? "#ecfdf5" : acc.account_type === "wallet" ? "#eff6ff" : "#f1f5f9",
                          color: acc.account_type === "cash" ? "#16a34a" : acc.account_type === "wallet" ? "#2563eb" : "#475569",
                          display: "grid",
                          placeItems: "center",
                        }}
                      >
                        <Wallet size={16} />
                      </div>
                      <div>
                        <strong style={{ fontSize: "13px", color: "#0f172a", display: "block" }}>{acc.name}</strong>
                        <small style={{ fontSize: "11px", color: "#64748b", textTransform: "capitalize" }}>{acc.account_type}</small>
                      </div>
                    </div>
                    <strong style={{ fontSize: "14px", color: "#0f172a" }}>{formatPkr(acc.opening_balance_paisa)}</strong>
                  </div>
                ))}
              </div>
            </section>

            <section className="dashboard-card">
              <div className="report-card-header">
                <h3>Daily Cash Flow Audit</h3>
                <span className="status-pill neutral">{selectedDate}</span>
              </div>
              <div style={{ display: "grid", gap: "14px", padding: "10px 0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                  <span style={{ color: "#64748b" }}>Opening Balance</span>
                  <strong>{formatPkr(daySummary.openingBalance)}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#16a34a" }}>
                  <span>(+) Inflows</span>
                  <strong>+{formatPkr(daySummary.received + daySummary.otherInflows)}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#dc2626" }}>
                  <span>(−) Outflows</span>
                  <strong>−{formatPkr(daySummary.expenses + daySummary.investmentPurchases)}</strong>
                </div>
                <div style={{ borderTop: "2px solid #e2e8f0", paddingTop: "10px", display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                  <span style={{ fontWeight: 700 }}>Closing Balance</span>
                  <strong style={{ color: "#2563eb" }}>{formatPkr(daySummary.closingBalance)}</strong>
                </div>
              </div>
            </section>
          </div>
        </div>
      )}

      {/* =========================================================================
          2. WEEKLY UNIVERSITY & ROUTINES TRACKER
          ========================================================================= */}
      {reportType === "weekly" && (
        <div className="report-tab-content">
          <div className="report-kpi-grid">
            <div className="report-kpi-card">
              <div className="report-kpi-top">
                <span className="report-kpi-title">Weekly Inflows</span>
                <div className="report-kpi-icon-badge emerald"><ArrowDownRight size={18} /></div>
              </div>
              <strong className="report-kpi-figure positive">+{formatPkr(totalWeeklyInflows)}</strong>
              <p className="report-kpi-caption">Weekly allowances &amp; deposits</p>
            </div>

            <div className="report-kpi-card">
              <div className="report-kpi-top">
                <span className="report-kpi-title">Weekly Spending</span>
                <div className="report-kpi-icon-badge rose"><ArrowUpRight size={18} /></div>
              </div>
              <strong className="report-kpi-figure negative">−{formatPkr(totalWeeklyExpenses)}</strong>
              <p className="report-kpi-caption">
                Highest: {highestExpenseDay?.weekday} ({formatPkr(highestExpenseDay?.expenses || 0n)})
              </p>
            </div>

            <div className="report-kpi-card">
              <div className="report-kpi-top">
                <span className="report-kpi-title">Net Weekly Savings</span>
                <div className="report-kpi-icon-badge blue"><Award size={18} /></div>
              </div>
              <strong className={`report-kpi-figure ${weeklyNetSavings >= 0n ? "positive" : "negative"}`}>
                {weeklyNetSavings >= 0n ? `+${formatPkr(weeklyNetSavings)}` : formatPkr(weeklyNetSavings)}
              </strong>
              <p className="report-kpi-caption">Retained allowance</p>
            </div>

            <div className="report-kpi-card">
              <div className="report-kpi-top">
                <span className="report-kpi-title">Zero-Income Days</span>
                <div className="report-kpi-icon-badge amber"><Clock size={18} /></div>
              </div>
              <strong className="report-kpi-figure">{zeroIncomeDays.length} Days</strong>
              <p className="report-kpi-caption">{zeroIncomeDays.join(", ") || "Active daily income"}</p>
            </div>
          </div>

          <section className="dashboard-card" style={{ marginBottom: "24px" }}>
            <div className="report-card-header">
              <h3>7-Day Cash Flow Breakdown (Mon – Sun)</h3>
              <span className="status-pill neutral">Weekly Trend</span>
            </div>
            <div style={{ width: "100%", height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="weekday" stroke="#64748b" fontSize={12} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} tickFormatter={(v) => `Rs ${v}`} />
                  <Tooltip
                    formatter={(value: unknown) => [`Rs ${Number(value).toLocaleString()}`, "Amount"]}
                    contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "12px" }}
                  />
                  <Legend />
                  <Bar dataKey="inflow" name="Money Received" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="outflow" name="Spending" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="dashboard-card">
            <div className="report-card-header">
              <h3>Day-by-Day Statement Ledger</h3>
            </div>
            <div className="ledger-table-wrap">
              <table className="ledger-table">
                <thead>
                  <tr>
                    <th>Day &amp; Date</th>
                    <th>Opening Balance</th>
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
                      <td style={{ color: d.received > 0n ? "#16a34a" : "#64748b", fontWeight: d.received > 0n ? 600 : 400 }}>
                        {d.received > 0n ? `+${formatPkr(d.received)}` : "—"}
                      </td>
                      <td style={{ color: d.expenses > 0n ? "#dc2626" : "#64748b", fontWeight: d.expenses > 0n ? 600 : 400 }}>
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

      {/* =========================================================================
          3. MONTHLY CASH FLOW & SPENDING CATEGORIES
          ========================================================================= */}
      {reportType === "monthly" && (
        <div className="report-tab-content">
          <div className="report-kpi-grid">
            <div className="report-kpi-card">
              <div className="report-kpi-top">
                <span className="report-kpi-title">Monthly Confirmed Income</span>
                <div className="report-kpi-icon-badge emerald"><ArrowDownRight size={18} /></div>
              </div>
              <strong className="report-kpi-figure positive">+{formatPkr(monthlySummary.income)}</strong>
              <p className="report-kpi-caption">Month: {targetMonth}</p>
            </div>

            <div className="report-kpi-card">
              <div className="report-kpi-top">
                <span className="report-kpi-title">Monthly Expenses</span>
                <div className="report-kpi-icon-badge rose"><ArrowUpRight size={18} /></div>
              </div>
              <strong className="report-kpi-figure negative">−{formatPkr(monthlySummary.expenses)}</strong>
              <p className="report-kpi-caption">{monthlySummary.expenseCategories.length} active spending categories</p>
            </div>

            <div className="report-kpi-card">
              <div className="report-kpi-top">
                <span className="report-kpi-title">Net Monthly Savings</span>
                <div className="report-kpi-icon-badge blue"><Award size={18} /></div>
              </div>
              <strong className={`report-kpi-figure ${monthlySummary.savings >= 0n ? "positive" : "negative"}`}>
                {monthlySummary.savings >= 0n ? `+${formatPkr(monthlySummary.savings)}` : formatPkr(monthlySummary.savings)}
              </strong>
              <p className="report-kpi-caption">
                {monthlySummary.income > 0n
                  ? `${((Number(monthlySummary.savings) / Number(monthlySummary.income)) * 100).toFixed(1)}% savings rate`
                  : "0% savings rate"}
              </p>
            </div>

            <div className="report-kpi-card">
              <div className="report-kpi-top">
                <span className="report-kpi-title">Capital Retention</span>
                <div className="report-kpi-icon-badge purple"><TrendingUp size={18} /></div>
              </div>
              <strong className="report-kpi-figure">
                {monthlySummary.income > 0n
                  ? `${Math.max(0, Math.round((Number(monthlySummary.savings) / Number(monthlySummary.income)) * 100))}%`
                  : "—"}
              </strong>
              <p className="report-kpi-caption">Retained for wealth building</p>
            </div>
          </div>

          <div className="report-chart-section">
            <section className="dashboard-card">
              <div className="report-card-header">
                <h3>Spending by Category</h3>
                <span className="status-pill neutral">{monthlySummary.expenseCategories.length} Categories</span>
              </div>
              {monthlySummary.expenseCategories.length === 0 ? (
                <p style={{ color: "#94a3b8", fontSize: "13px", padding: "20px 0" }}>No expense categories recorded for this month.</p>
              ) : (
                <div style={{ display: "grid", gap: "12px", marginTop: "10px" }}>
                  {monthlySummary.expenseCategories.map((c, i) => {
                    const pct = monthlySummary.expenses > 0n
                      ? Math.round((Number(c.amount) / Number(monthlySummary.expenses)) * 100)
                      : 0;
                    return (
                      <div key={c.category}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "4px" }}>
                          <strong>{c.category}</strong>
                          <span style={{ color: "#64748b" }}>{formatPkr(c.amount)} ({pct}%)</span>
                        </div>
                        <div style={{ height: "8px", backgroundColor: "#f1f5f9", borderRadius: "4px", overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${pct}%`, backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="dashboard-card">
              <div className="report-card-header">
                <h3>Monthly Cash Flow Summary</h3>
                <span className="status-pill success">Audited</span>
              </div>
              <div style={{ display: "grid", gap: "12px", marginTop: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", padding: "10px 12px", background: "#f8fafc", borderRadius: "8px" }}>
                  <span>Total Inflows</span>
                  <strong style={{ color: "#16a34a" }}>+{formatPkr(monthlySummary.income)}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", padding: "10px 12px", background: "#f8fafc", borderRadius: "8px" }}>
                  <span>Total Outflows</span>
                  <strong style={{ color: "#dc2626" }}>−{formatPkr(monthlySummary.expenses)}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", padding: "10px 12px", background: "#f8fafc", borderRadius: "8px" }}>
                  <span>Net Savings</span>
                  <strong style={{ color: monthlySummary.savings >= 0n ? "#2563eb" : "#dc2626" }}>{formatPkr(monthlySummary.savings)}</strong>
                </div>
              </div>
            </section>
          </div>
        </div>
      )}

      {/* =========================================================================
          4. YEARLY PERFORMANCE & ANNUAL WEALTH
          ========================================================================= */}
      {reportType === "yearly" && (
        <div className="report-tab-content">
          <div className="report-kpi-grid">
            <div className="report-kpi-card">
              <div className="report-kpi-top">
                <span className="report-kpi-title">Annual Income</span>
                <div className="report-kpi-icon-badge emerald"><ArrowDownRight size={18} /></div>
              </div>
              <strong className="report-kpi-figure positive">+{formatPkr(yearlySummary.totalIncomePaisa)}</strong>
              <p className="report-kpi-caption">Full calendar year {targetYear}</p>
            </div>

            <div className="report-kpi-card">
              <div className="report-kpi-top">
                <span className="report-kpi-title">Annual Living Costs</span>
                <div className="report-kpi-icon-badge rose"><ArrowUpRight size={18} /></div>
              </div>
              <strong className="report-kpi-figure negative">−{formatPkr(yearlySummary.totalExpensesPaisa)}</strong>
              <p className="report-kpi-caption">Living, study &amp; personal spend</p>
            </div>

            <div className="report-kpi-card">
              <div className="report-kpi-top">
                <span className="report-kpi-title">Annual Wealth Retained</span>
                <div className="report-kpi-icon-badge blue"><Award size={18} /></div>
              </div>
              <strong className="report-kpi-figure positive">{formatPkr(yearlySummary.totalSavingsPaisa)}</strong>
              <p className="report-kpi-caption">Net capital saved &amp; invested</p>
            </div>

            <div className="report-kpi-card">
              <div className="report-kpi-top">
                <span className="report-kpi-title">Annual Savings Rate</span>
                <div className="report-kpi-icon-badge amber"><TrendingUp size={18} /></div>
              </div>
              <strong className="report-kpi-figure">
                {yearlySummary.totalIncomePaisa > 0n
                  ? `${((Number(yearlySummary.totalSavingsPaisa) / Number(yearlySummary.totalIncomePaisa)) * 100).toFixed(1)}%`
                  : "—"}
              </strong>
              <p className="report-kpi-caption">Retained wealth percentage</p>
            </div>
          </div>

          <section className="dashboard-card" style={{ marginBottom: "24px" }}>
            <div className="report-card-header">
              <h3>12-Month Performance Trajectory</h3>
              <span className="status-pill neutral">Jan – Dec {targetYear}</span>
            </div>
            <div style={{ width: "100%", height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={yearlyChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} tickFormatter={(v) => `Rs ${v}`} />
                  <Tooltip
                    formatter={(value: unknown) => [`Rs ${Number(value).toLocaleString()}`, "Amount"]}
                    contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "12px" }}
                  />
                  <Legend />
                  <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="savings" name="Net Savings" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="dashboard-card">
            <div className="report-card-header">
              <h3>Annual 12-Month Financial Statement</h3>
            </div>
            <div className="ledger-table-wrap">
              <table className="ledger-table">
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Income</th>
                    <th>Expenses</th>
                    <th>Net Savings</th>
                    <th>Performance Status</th>
                  </tr>
                </thead>
                <tbody>
                  {yearlySummary.monthlyBreakdown.map((m) => (
                    <tr key={m.month}>
                      <td><strong>{m.monthName} {targetYear}</strong></td>
                      <td style={{ color: m.incomePaisa > 0n ? "#16a34a" : "#64748b", fontWeight: m.incomePaisa > 0n ? 600 : 400 }}>
                        {formatPkr(m.incomePaisa)}
                      </td>
                      <td style={{ color: m.expensesPaisa > 0n ? "#dc2626" : "#64748b", fontWeight: m.expensesPaisa > 0n ? 600 : 400 }}>
                        {formatPkr(m.expensesPaisa)}
                      </td>
                      <td style={{ fontWeight: 700, color: m.savingsPaisa >= 0n ? "#0f172a" : "#dc2626" }}>
                        {formatPkr(m.savingsPaisa)}
                      </td>
                      <td>
                        {m.savingsPaisa > 0n ? (
                          <span className="status-pill success">Surplus</span>
                        ) : m.expensesPaisa > 0n ? (
                          <span className="status-pill danger">Deficit</span>
                        ) : (
                          <span className="status-pill neutral">No Activity</span>
                        )}
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

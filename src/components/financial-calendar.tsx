"use client";

import { useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ArrowDownRight,
  ArrowUpRight,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  Edit2,
  Plus,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  Trash2,
  Wallet,
} from "lucide-react";
import {
  formatPkr,
  getDaySummary,
  getPakistanDateKey,
  type FinanceAccount,
  type FinanceTransaction,
} from "@/lib/finance";
import { getMonthCalendarData, type CalendarDayCell } from "@/lib/calendar";

interface FinancialCalendarProps {
  userId: string;
  supabase: SupabaseClient;
  accounts: FinanceAccount[];
  transactions: FinanceTransaction[];
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  dataAvailable: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onAdd: (kind: "income" | "expense" | "transfer") => void;
  onEdit: (tx: FinanceTransaction) => void;
  onDelete: (tx: FinanceTransaction) => void;
  onToast: (msg: string) => void;
}

export function FinancialCalendar({
  userId,
  supabase,
  accounts,
  transactions,
  selectedDate,
  setSelectedDate,
  dataAvailable,
  refreshing,
  onRefresh,
  onAdd,
  onEdit,
  onDelete,
  onToast,
}: FinancialCalendarProps) {
  const [currentMonthKey, setCurrentMonthKey] = useState<string>(() => selectedDate.slice(0, 7) || "2026-11");
  const [viewMode, setViewMode] = useState<"month" | "week">("month");

  const calendarData = useMemo(() => {
    return getMonthCalendarData(currentMonthKey, accounts, transactions, "2026-11-06");
  }, [currentMonthKey, accounts, transactions]);

  const selectedDaySummary = useMemo(() => {
    return getDaySummary(selectedDate, accounts, transactions);
  }, [selectedDate, accounts, transactions]);

  const selectedDayTransactions = useMemo(() => {
    return transactions
      .filter((tx) => !tx.deleted_at && tx.occurred_at.slice(0, 10) === selectedDate)
      .sort((a, b) => b.occurred_at.localeCompare(a.occurred_at));
  }, [transactions, selectedDate]);

  function handlePrevMonth() {
    const [y, m] = currentMonthKey.split("-").map(Number);
    const prevDate = new Date(Date.UTC(y, m - 2, 1));
    const nextKey = `${prevDate.getUTCFullYear()}-${String(prevDate.getUTCMonth() + 1).padStart(2, "0")}`;
    setCurrentMonthKey(nextKey);
  }

  function handleNextMonth() {
    const [y, m] = currentMonthKey.split("-").map(Number);
    const nextDate = new Date(Date.UTC(y, m, 1));
    const nextKey = `${nextDate.getUTCFullYear()}-${String(nextDate.getUTCMonth() + 1).padStart(2, "0")}`;
    setCurrentMonthKey(nextKey);
  }

  function handleJumpToday() {
    const today = "2026-11-06";
    setCurrentMonthKey("2026-11");
    setSelectedDate(today);
  }

  return (
    <div className="financial-calendar-page">
      <section className="page-heading">
        <div>
          <p className="eyebrow">Monthly Financial Matrix</p>
          <h1>Financial Calendar<span className="heading-period">.</span></h1>
          <p className="page-subtitle">
            Inspect daily cash flow, income receipts, and purchase spending across every date of the month.
          </p>
        </div>
        <div className="heading-actions">
          <button type="button" className="outline-button refresh-button" onClick={onRefresh} disabled={refreshing}>
            <RefreshCw size={15} className={refreshing ? "spin" : ""} /> Refresh
          </button>
          <button type="button" className="outline-button" onClick={() => onAdd("income")}>
            <ArrowDownRight size={15} /> Add Income
          </button>
          <button type="button" className="primary-button" onClick={() => onAdd("expense")}>
            <Plus size={17} /> Add Expense
          </button>
        </div>
      </section>

      {/* Calendar Controls Bar */}
      <div
        className="dashboard-card"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
          marginBottom: "1rem",
          padding: "0.85rem 1.25rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <button
            type="button"
            className="icon-button"
            onClick={handlePrevMonth}
            aria-label="Previous month"
            style={{ width: "32px", height: "32px" }}
          >
            <ChevronLeft size={18} />
          </button>
          <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, color: "#0f172a", minWidth: "180px" }}>
            {calendarData.monthName}
          </h2>
          <button
            type="button"
            className="icon-button"
            onClick={handleNextMonth}
            aria-label="Next month"
            style={{ width: "32px", height: "32px" }}
          >
            <ChevronRight size={18} />
          </button>
          <button type="button" className="filter-hint" onClick={handleJumpToday}>
            Today (Nov 6)
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
          <div style={{ fontSize: "0.85rem" }}>
            <span style={{ color: "#64748b", marginRight: "6px" }}>Month Inflows:</span>
            <strong style={{ color: "#16a34a" }}>+{formatPkr(calendarData.monthlyIncomePaisa)}</strong>
          </div>
          <div style={{ fontSize: "0.85rem" }}>
            <span style={{ color: "#64748b", marginRight: "6px" }}>Month Expenses:</span>
            <strong style={{ color: "#dc2626" }}>−{formatPkr(calendarData.monthlyExpensesPaisa)}</strong>
          </div>
          <div style={{ fontSize: "0.85rem" }}>
            <span style={{ color: "#64748b", marginRight: "6px" }}>Net Savings:</span>
            <strong style={{ color: calendarData.monthlySavingsPaisa >= 0n ? "#2563eb" : "#dc2626" }}>
              {formatPkr(calendarData.monthlySavingsPaisa)}
            </strong>
          </div>
        </div>
      </div>

      {/* Monthly Grid */}
      <section className="dashboard-card" style={{ padding: "1rem", overflowX: "auto" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, minmax(130px, 1fr))",
            gap: "6px",
            minWidth: "900px",
          }}
        >
          {/* Weekday headers */}
          {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((dayName, idx) => (
            <div
              key={dayName}
              style={{
                textAlign: "center",
                fontWeight: 700,
                fontSize: "0.75rem",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                padding: "8px 4px",
                color: idx >= 5 ? "#94a3b8" : "#475569",
                backgroundColor: "#f8fafc",
                borderRadius: "4px",
              }}
            >
              {dayName} {idx >= 5 ? "(Holiday)" : ""}
            </div>
          ))}

          {/* Day Cells */}
          {calendarData.days.map((cell) => {
            const isSelected = cell.date === selectedDate;
            const totalRec = cell.summary.received + cell.summary.otherInflows;
            const totalExp = cell.summary.expenses + cell.summary.investmentPurchases;

            return (
              <div
                key={cell.date}
                onClick={() => setSelectedDate(cell.date)}
                style={{
                  border: isSelected ? "2px solid #2563eb" : "1px solid #e2e8f0",
                  borderRadius: "8px",
                  padding: "8px",
                  backgroundColor: !cell.isCurrentMonth
                    ? "#fafafa"
                    : isSelected
                    ? "#f0f7ff"
                    : cell.isToday
                    ? "#fffbeb"
                    : "#fff",
                  cursor: "pointer",
                  minHeight: "105px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  opacity: cell.isCurrentMonth ? 1 : 0.45,
                  transition: "all 0.15s ease",
                }}
              >
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: "0.85rem",
                        color: cell.isToday ? "#d97706" : cell.isHoliday ? "#94a3b8" : "#0f172a",
                      }}
                    >
                      {cell.dayNumber}
                      {cell.isToday && <span style={{ fontSize: "0.65rem", marginLeft: "4px", color: "#d97706" }}>Today</span>}
                    </span>

                    {cell.summary.transactionCount > 0 && (
                      <span
                        style={{
                          fontSize: "0.65rem",
                          fontWeight: 600,
                          backgroundColor: "#f1f5f9",
                          padding: "1px 5px",
                          borderRadius: "4px",
                          color: "#475569",
                        }}
                      >
                        {cell.summary.transactionCount} tx
                      </span>
                    )}
                  </div>

                  {/* Income Badge */}
                  {totalRec > 0n && (
                    <div
                      style={{
                        fontSize: "0.72rem",
                        fontWeight: 600,
                        color: "#16a34a",
                        backgroundColor: "#ecfdf5",
                        padding: "2px 4px",
                        borderRadius: "3px",
                        marginTop: "4px",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      +{formatPkr(totalRec)}
                    </div>
                  )}

                  {/* Expense Badge */}
                  {totalExp > 0n && (
                    <div
                      style={{
                        fontSize: "0.72rem",
                        fontWeight: 600,
                        color: "#dc2626",
                        backgroundColor: "#fef2f2",
                        padding: "2px 4px",
                        borderRadius: "3px",
                        marginTop: "3px",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      −{formatPkr(totalExp)}
                    </div>
                  )}

                  {/* Zero Income Day Indicator */}
                  {cell.isZeroIncomeDay && totalExp === 0n && (
                    <div style={{ fontSize: "0.65rem", color: "#94a3b8", marginTop: "4px" }}>
                      Zero activity
                    </div>
                  )}
                </div>

                {/* Closing Balance at footer of date */}
                <div
                  style={{
                    fontSize: "0.7rem",
                    fontWeight: 600,
                    color: "#475569",
                    borderTop: "1px dashed #e2e8f0",
                    paddingTop: "4px",
                    marginTop: "4px",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  Bal: {formatPkr(cell.summary.closingBalance)}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Selected Date Detail View */}
      <section className="dashboard-card" style={{ marginTop: "1.5rem" }}>
        <div className="card-header">
          <div>
            <h3>
              Daily Record: {selectedDaySummary.dayName}, {selectedDate}
            </h3>
            <p className="card-caption">
              Detailed daily cash flow breakdown & carry-forward calculation for the selected calendar date.
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              type="button"
              className="outline-button"
              style={{ fontSize: "0.8rem", padding: "6px 12px" }}
              onClick={() => onAdd("income")}
            >
              <ArrowDownRight size={14} /> Add Money to {selectedDate}
            </button>
            <button
              type="button"
              className="primary-button"
              style={{ fontSize: "0.8rem", padding: "6px 12px" }}
              onClick={() => onAdd("expense")}
            >
              <Plus size={14} /> Add Expense to {selectedDate}
            </button>
          </div>
        </div>

        {/* Daily Equation Formula Banner */}
        <div
          style={{
            backgroundColor: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: "8px",
            padding: "1rem",
            marginTop: "1rem",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: "1rem",
          }}
        >
          <div>
            <span style={{ fontSize: "0.75rem", color: "#64748b", display: "block" }}>1. Opening Balance</span>
            <strong style={{ fontSize: "1.1rem" }}>{formatPkr(selectedDaySummary.openingBalance)}</strong>
            <small style={{ color: "#94a3b8", display: "block" }}>Carried from yesterday</small>
          </div>

          <div>
            <span style={{ fontSize: "0.75rem", color: "#64748b", display: "block" }}>2. Money Received</span>
            <strong style={{ fontSize: "1.1rem", color: "#16a34a" }}>
              +{formatPkr(selectedDaySummary.received + selectedDaySummary.otherInflows)}
            </strong>
            <small style={{ color: "#94a3b8", display: "block" }}>Actual confirmed income</small>
          </div>

          <div>
            <span style={{ fontSize: "0.75rem", color: "#64748b", display: "block" }}>3. Total Spending</span>
            <strong style={{ fontSize: "1.1rem", color: "#dc2626" }}>
              −{formatPkr(selectedDaySummary.expenses + selectedDaySummary.investmentPurchases)}
            </strong>
            <small style={{ color: "#94a3b8", display: "block" }}>Purchases & expenses</small>
          </div>

          <div>
            <span style={{ fontSize: "0.75rem", color: "#64748b", display: "block" }}>4. Closing Balance</span>
            <strong style={{ fontSize: "1.2rem", color: "#2563eb" }}>
              {formatPkr(selectedDaySummary.closingBalance)}
            </strong>
            <small style={{ color: "#94a3b8", display: "block" }}>Available for next day</small>
          </div>

          <div>
            <span style={{ fontSize: "0.75rem", color: "#64748b", display: "block" }}>5. Daily Savings</span>
            <strong
              style={{
                fontSize: "1.1rem",
                color: selectedDaySummary.dailySavings >= 0n ? "#16a34a" : "#dc2626",
              }}
            >
              {formatPkr(selectedDaySummary.dailySavings)}
            </strong>
            <small style={{ color: "#94a3b8", display: "block" }}>Received − Spent</small>
          </div>
        </div>

        {/* Transactions occurred on this selected date */}
        <div style={{ marginTop: "1.5rem" }}>
          <h4 style={{ margin: "0 0 0.75rem 0", fontSize: "0.95rem" }}>
            Transactions Recorded on {selectedDate} ({selectedDayTransactions.length})
          </h4>

          {selectedDayTransactions.length === 0 ? (
            <div style={{ textAlign: "center", padding: "2rem", backgroundColor: "#fafafa", borderRadius: "8px", color: "#64748b" }}>
              No transactions recorded on this date.
              <div style={{ marginTop: "0.5rem", fontSize: "0.85rem" }}>
                Opening balance of {formatPkr(selectedDaySummary.openingBalance)} safely carried forward.
              </div>
            </div>
          ) : (
            <div className="ledger-table-wrap">
              <table className="ledger-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Type</th>
                    <th>Description & Item</th>
                    <th>Category</th>
                    <th>Account</th>
                    <th>Amount</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedDayTransactions.map((tx) => (
                    <tr key={tx.id}>
                      <td>{tx.occurred_at.slice(11, 16) || "12:00"}</td>
                      <td>
                        <span className={`transaction-badge ${tx.transaction_type}`}>
                          {tx.transaction_type}
                        </span>
                      </td>
                      <td>
                        <strong>{tx.description}</strong>
                        {tx.notes && <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{tx.notes}</div>}
                      </td>
                      <td style={{ textTransform: "capitalize", color: "#475569" }}>{tx.category || "General"}</td>
                      <td>
                        {accounts.find((a) => a.id === tx.account_id)?.name || "Account"}
                        {tx.transfer_to_account_id && (
                          <span style={{ color: "#2563eb" }}>
                            {" → "}
                            {accounts.find((a) => a.id === tx.transfer_to_account_id)?.name || "Wallet"}
                          </span>
                        )}
                      </td>
                      <td>
                        <strong
                          style={{
                            color:
                              tx.transaction_type === "income"
                                ? "#16a34a"
                                : tx.transaction_type === "expense"
                                ? "#dc2626"
                                : "#0f172a",
                          }}
                        >
                          {tx.transaction_type === "income" ? "+" : tx.transaction_type === "expense" ? "−" : ""}
                          {formatPkr(tx.amount_paisa)}
                        </strong>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: "0.25rem" }}>
                          <button
                            type="button"
                            className="icon-button subtle"
                            title="Edit entry"
                            onClick={() => onEdit(tx)}
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            type="button"
                            className="icon-button subtle danger"
                            title="Delete entry"
                            onClick={() => onDelete(tx)}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}


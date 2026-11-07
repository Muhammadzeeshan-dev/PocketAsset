"use client";

import { useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Layers,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Sliders,
  Sparkles,
  TrendingUp,
  X,
} from "lucide-react";
import { formatPkr, parseRupeesToPaisa, toPaisa, type FinanceTransaction } from "@/lib/finance";
import {
  calculateWeeklyBudgetBreakdown,
  evaluateBudgetStatus,
  type Budget,
  type BudgetType,
} from "@/lib/budgets";

interface BudgetPlannerProps {
  userId: string;
  supabase: SupabaseClient;
  transactions: FinanceTransaction[];
  selectedDate: string;
  dataAvailable: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onToast: (msg: string) => void;
}

export function BudgetPlanner({
  userId,
  supabase,
  transactions,
  selectedDate,
  dataAvailable,
  refreshing,
  onRefresh,
  onToast,
}: BudgetPlannerProps) {
  // Local default budgets if none in database yet
  const [budgets, setBudgets] = useState<Budget[]>([
    {
      id: "b-uni",
      user_id: userId,
      name: "University Weekly Expenses",
      budget_type: "university",
      category: null,
      amount_paisa: 400000n, // Rs. 4,000 / week (Rs 800 x 5 days)
      start_date: "2026-11-01",
      end_date: "2026-11-30",
      warning_thresholds: [50, 75, 90, 100],
      is_paused: false,
      notes: "Bus fare + daily lunch and tea",
    },
    {
      id: "b-food",
      user_id: userId,
      name: "Food & Snacks Monthly",
      budget_type: "category",
      category: "Food",
      amount_paisa: 1200000n, // Rs. 12,000 / month
      start_date: "2026-11-01",
      end_date: "2026-11-30",
      warning_thresholds: [50, 75, 90, 100],
      is_paused: false,
    },
    {
      id: "b-household",
      user_id: userId,
      name: "Household Utilities & Supplies",
      budget_type: "household",
      category: null,
      amount_paisa: 800000n, // Rs. 8,000 / month
      start_date: "2026-11-01",
      end_date: "2026-11-30",
      warning_thresholds: [50, 75, 90, 100],
      is_paused: false,
    },
  ]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);

  // Form states
  const [budgetName, setBudgetName] = useState("");
  const [budgetType, setBudgetType] = useState<BudgetType>("monthly");
  const [category, setCategory] = useState("");
  const [amountRupees, setAmountRupees] = useState("");
  const [startDate, setStartDate] = useState(selectedDate);
  const [endDate, setEndDate] = useState("");
  const [formError, setFormError] = useState("");

  const budgetStatuses = useMemo(() => {
    return budgets.map((b) => evaluateBudgetStatus(b, transactions));
  }, [budgets, transactions]);

  const weeklyBreakdown = useMemo(() => {
    // Break down the primary university/weekly budget across Mon-Sun
    const targetBudget = budgets.find((b) => b.budget_type === "university" || b.budget_type === "weekly") || budgets[0];
    const amount = targetBudget ? toPaisa(targetBudget.amount_paisa) : 400000n;
    return calculateWeeklyBudgetBreakdown(amount, "2026-11-02", transactions);
  }, [budgets, transactions]);

  function handleOpenCreate() {
    setEditingBudget(null);
    setBudgetName("");
    setBudgetType("monthly");
    setCategory("");
    setAmountRupees("");
    setStartDate(selectedDate);
    setEndDate("");
    setFormError("");
    setDialogOpen(true);
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");

    if (!budgetName.trim()) {
      setFormError("Budget name is required.");
      return;
    }

    let paisa: bigint;
    try {
      paisa = parseRupeesToPaisa(amountRupees);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Enter a valid amount.");
      return;
    }

    if (editingBudget) {
      setBudgets((prev) =>
        prev.map((b) =>
          b.id === editingBudget.id
            ? {
                ...b,
                name: budgetName.trim(),
                budget_type: budgetType,
                category: budgetType === "category" ? category.trim() || null : null,
                amount_paisa: paisa,
                start_date: startDate,
                end_date: endDate || null,
              }
            : b
        )
      );
      onToast("Budget updated successfully.");
    } else {
      const newBudget: Budget = {
        id: crypto.randomUUID(),
        user_id: userId,
        name: budgetName.trim(),
        budget_type: budgetType,
        category: budgetType === "category" ? category.trim() || null : null,
        amount_paisa: paisa,
        start_date: startDate,
        end_date: endDate || null,
        warning_thresholds: [50, 75, 90, 100],
        is_paused: false,
      };
      setBudgets((prev) => [newBudget, ...prev]);
      onToast("New budget created successfully.");
    }

    setDialogOpen(false);
  }

  function togglePause(id: string) {
    setBudgets((prev) =>
      prev.map((b) => (b.id === id ? { ...b, is_paused: !b.is_paused } : b))
    );
    onToast("Budget status updated.");
  }

  return (
    <div className="budget-manager-page">
      <section className="page-heading">
        <div>
          <p className="eyebrow">Financial limits & discipline</p>
          <h1>Budget Planner<span className="heading-period">.</span></h1>
          <p className="page-subtitle">
            Plan daily university expenses, monthly categories, and stay ahead of overspending.
          </p>
        </div>
        <div className="heading-actions">
          <button
            type="button"
            className="outline-button refresh-button"
            onClick={onRefresh}
            disabled={refreshing}
          >
            <RefreshCw size={15} className={refreshing ? "spin" : ""} /> Refresh
          </button>
          <button type="button" className="primary-button" onClick={handleOpenCreate}>
            <Plus size={17} /> Create budget
          </button>
        </div>
      </section>

      {/* Overview Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon-wrap" style={{ backgroundColor: "#eff6ff", color: "#2563eb" }}>
            <Layers size={20} />
          </div>
          <div className="kpi-body">
            <span className="kpi-label">Active Budgets</span>
            <strong className="kpi-value">{budgets.filter((b) => !b.is_paused).length}</strong>
            <small className="kpi-sub">Across categories & university</small>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrap" style={{ backgroundColor: "#ecfdf5", color: "#10b981" }}>
            <CheckCircle2 size={20} />
          </div>
          <div className="kpi-body">
            <span className="kpi-label">Within Limits</span>
            <strong className="kpi-value">
              {budgetStatuses.filter((s) => !s.isOverspent).length}
            </strong>
            <small className="kpi-sub">Controlled spending</small>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrap" style={{ backgroundColor: "#fef2f2", color: "#ef4444" }}>
            <AlertTriangle size={20} />
          </div>
          <div className="kpi-body">
            <span className="kpi-label">Exceeded / Alerts</span>
            <strong className="kpi-value">
              {budgetStatuses.filter((s) => s.isOverspent || (s.activeAlertThreshold && s.activeAlertThreshold >= 90)).length}
            </strong>
            <small className="kpi-sub">Immediate attention</small>
          </div>
        </div>
      </div>

      {/* Weekly Planned vs Actual Grid */}
      <section className="dashboard-card" style={{ marginTop: "1.5rem" }}>
        <div className="card-header">
          <div>
            <h3>Weekly Day-by-Day Budget vs Actual</h3>
            <p className="card-caption">
              University week (Monday to Sunday). Unspent money remains in accounts and is never counted as income.
            </p>
          </div>
        </div>
        <div className="weekly-budget-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "0.75rem", marginTop: "1rem" }}>
          {weeklyBreakdown.map((day) => (
            <div
              key={day.date}
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                padding: "0.75rem",
                backgroundColor: day.isOverspent ? "#fff5f5" : "#fafafa",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <strong>{day.dayLabel}</strong>
                <small style={{ color: "#64748b" }}>{day.date.slice(5)}</small>
              </div>
              <div style={{ marginTop: "0.5rem", fontSize: "0.85rem" }}>
                <div style={{ color: "#64748b" }}>Planned: {formatPkr(day.plannedPaisa)}</div>
                <div style={{ fontWeight: 600, color: day.isOverspent ? "#dc2626" : "#0f172a" }}>
                  Spent: {formatPkr(day.spentPaisa)}
                </div>
                <div style={{ fontSize: "0.75rem", marginTop: "0.25rem", color: day.isOverspent ? "#dc2626" : "#16a34a" }}>
                  {day.isOverspent ? `Over: ${formatPkr(day.spentPaisa - day.plannedPaisa)}` : `Left: ${formatPkr(day.remainingPaisa)}`}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Active Budgets List */}
      <section className="dashboard-card" style={{ marginTop: "1.5rem" }}>
        <div className="card-header">
          <div>
            <h3>Configured Budgets</h3>
            <p className="card-caption">Limits tracked against your live transaction ledger</p>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1rem" }}>
          {budgetStatuses.map(({ budget, spentPaisa, remainingPaisa, percentUsed, isOverspent, activeAlertThreshold }) => (
            <div
              key={budget.id}
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                padding: "1rem",
                backgroundColor: "#fff",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.5rem" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <h4 style={{ margin: 0, fontSize: "1rem" }}>{budget.name}</h4>
                    {budget.is_paused && (
                      <span style={{ fontSize: "0.7rem", backgroundColor: "#f1f5f9", padding: "2px 6px", borderRadius: "4px" }}>
                        Paused
                      </span>
                    )}
                    {activeAlertThreshold && (
                      <span
                        style={{
                          fontSize: "0.7rem",
                          fontWeight: 600,
                          padding: "2px 6px",
                          borderRadius: "4px",
                          backgroundColor: isOverspent ? "#fee2e2" : activeAlertThreshold >= 90 ? "#ffedd5" : "#fef9c3",
                          color: isOverspent ? "#991b1b" : activeAlertThreshold >= 90 ? "#9a3412" : "#854d0e",
                        }}
                      >
                        {isOverspent ? "Exceeded!" : `${activeAlertThreshold}% Consumed`}
                      </span>
                    )}
                  </div>
                  <small style={{ color: "#64748b", textTransform: "capitalize" }}>
                    Type: {budget.budget_type} {budget.category ? `• Category: ${budget.category}` : ""}
                  </small>
                </div>

                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 600 }}>{formatPkr(spentPaisa)} / {formatPkr(budget.amount_paisa)}</div>
                  <small style={{ color: isOverspent ? "#dc2626" : "#16a34a" }}>
                    {isOverspent ? `Overspent by ${formatPkr(-remainingPaisa)}` : `${formatPkr(remainingPaisa)} remaining`}
                  </small>
                </div>
              </div>

              {/* Progress bar */}
              <div
                style={{
                  height: "8px",
                  borderRadius: "4px",
                  backgroundColor: "#f1f5f9",
                  overflow: "hidden",
                  marginTop: "0.75rem",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${Math.min(percentUsed, 100)}%`,
                    backgroundColor: isOverspent ? "#ef4444" : percentUsed >= 90 ? "#f97316" : percentUsed >= 75 ? "#eab308" : "#2563eb",
                    transition: "width 0.3s ease",
                  }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.75rem", fontSize: "0.8rem", color: "#64748b" }}>
                <span>{percentUsed}% spent</span>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    type="button"
                    className="outline-button"
                    style={{ padding: "3px 8px", fontSize: "0.75rem" }}
                    onClick={() => togglePause(budget.id)}
                  >
                    {budget.is_paused ? <Play size={12} /> : <Pause size={12} />} {budget.is_paused ? "Resume" : "Pause"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Modal Dialog */}
      {dialogOpen && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <h3>{editingBudget ? "Edit Budget" : "Create New Budget"}</h3>
              <button type="button" className="icon-button subtle" onClick={() => setDialogOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="entry-form">
              {formError && <div className="form-error-banner">{formError}</div>}

              <div className="form-group">
                <label>Budget Name</label>
                <input
                  type="text"
                  placeholder="e.g. University Daily Travel, Food, Household"
                  value={budgetName}
                  onChange={(e) => setBudgetName(e.target.value)}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Budget Type</label>
                  <select value={budgetType} onChange={(e) => setBudgetType(e.target.value as BudgetType)}>
                    <option value="monthly">Monthly</option>
                    <option value="weekly">Weekly</option>
                    <option value="daily">Daily</option>
                    <option value="category">Category Specific</option>
                    <option value="university">University Routine</option>
                    <option value="household">Household Routine</option>
                    <option value="shopping">Personal Shopping</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Amount (PKR)</label>
                  <input
                    type="text"
                    placeholder="e.g. 5000"
                    value={amountRupees}
                    onChange={(e) => setAmountRupees(e.target.value)}
                    required
                  />
                </div>
              </div>

              {budgetType === "category" && (
                <div className="form-group">
                  <label>Target Category</label>
                  <input
                    type="text"
                    placeholder="e.g. Food, Transport, Clothes"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  />
                </div>
              )}

              <div className="form-row">
                <div className="form-group">
                  <label>Start Date</label>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>End Date (Optional)</label>
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="outline-button" onClick={() => setDialogOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="primary-button">
                  Save Budget
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


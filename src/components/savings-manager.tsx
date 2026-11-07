"use client";

import { useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle,
  FolderLock,
  Layers,
  Pause,
  PiggyBank,
  Play,
  Plus,
  RefreshCw,
  ShieldCheck,
  Target,
  X,
} from "lucide-react";
import { formatPkr, parseRupeesToPaisa, toPaisa, type FinanceAccount, type FinanceTransaction } from "@/lib/finance";
import {
  calculateGoalProgress,
  calculateTotalAllocatedSavings,
  calculateUnallocatedLiquidMoney,
  getEmergencyFundMilestones,
  type SavingsGoal,
  type SavingsGoalCategory,
} from "@/lib/savings";

interface SavingsManagerProps {
  userId: string;
  supabase: SupabaseClient;
  accounts: FinanceAccount[];
  transactions: FinanceTransaction[];
  dataAvailable: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onToast: (msg: string) => void;
}

export function SavingsManager({
  userId,
  supabase,
  accounts,
  transactions,
  dataAvailable,
  refreshing,
  onRefresh,
  onToast,
}: SavingsManagerProps) {
  // Realistic initial goals
  const [goals, setGoals] = useState<SavingsGoal[]>([
    {
      id: "goal-emergency",
      user_id: userId,
      name: "Emergency Reserve Fund",
      target_amount_paisa: 2500000n, // Rs. 25,000
      current_saved_paisa: 1000000n, // Rs. 10,000
      target_date: "2026-12-31",
      priority: "high",
      status: "active",
      category: "emergency_fund",
      notes: "Cushion for unexpected emergencies",
    },
    {
      id: "goal-laptop",
      user_id: userId,
      name: "Development Workstation / Laptop",
      target_amount_paisa: 8000000n, // Rs. 80,000
      current_saved_paisa: 2000000n, // Rs. 20,000
      target_date: "2027-03-31",
      priority: "medium",
      status: "active",
      category: "laptop",
      notes: "Upgrading machine for high-performance computing",
    },
    {
      id: "goal-uni",
      user_id: userId,
      name: "Semester Project & Books Reserve",
      target_amount_paisa: 1500000n, // Rs. 15,000
      current_saved_paisa: 1500000n, // Rs. 15,000 (Completed)
      target_date: "2026-11-30",
      priority: "high",
      status: "completed",
      category: "university",
      notes: "Hardware components and books",
    },
  ]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [allocateDialogOpen, setAllocateDialogOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<SavingsGoal | null>(null);
  const [allocateMode, setAllocateMode] = useState<"deposit" | "withdraw">("deposit");
  const [allocateAmount, setAllocateAmount] = useState("");
  const [selectedAccount, setSelectedAccount] = useState<string>(accounts[0]?.id || "");

  // Create form states
  const [goalName, setGoalName] = useState("");
  const [goalTarget, setGoalTarget] = useState("");
  const [goalCategory, setGoalCategory] = useState<SavingsGoalCategory>("emergency_fund");
  const [goalDate, setGoalDate] = useState("");
  const [goalPriority, setGoalPriority] = useState<"low" | "medium" | "high">("medium");

  const totalLiquid = useMemo(() => {
    return accounts.reduce((acc, a) => acc + toPaisa(a.opening_balance_paisa), 0n);
  }, [accounts]);

  const totalAllocated = useMemo(() => calculateTotalAllocatedSavings(goals), [goals]);
  const unallocatedLiquid = useMemo(
    () => calculateUnallocatedLiquidMoney(totalLiquid, goals),
    [totalLiquid, goals]
  );

  const emergencyMilestones = useMemo(() => {
    return getEmergencyFundMilestones(2500000n);
  }, []);

  function handleOpenAllocate(goal: SavingsGoal, mode: "deposit" | "withdraw") {
    setSelectedGoal(goal);
    setAllocateMode(mode);
    setAllocateAmount("");
    setAllocateDialogOpen(true);
  }

  function handleConfirmAllocation(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedGoal) return;

    let paisa: bigint;
    try {
      paisa = parseRupeesToPaisa(allocateAmount);
    } catch {
      alert("Please enter a valid amount.");
      return;
    }

    const current = toPaisa(selectedGoal.current_saved_paisa);
    let newSaved: bigint;

    if (allocateMode === "deposit") {
      newSaved = current + paisa;
      onToast(`Allocated ${formatPkr(paisa)} to "${selectedGoal.name}".`);
    } else {
      if (paisa > current) {
        alert("Cannot withdraw more than current saved amount.");
        return;
      }
      newSaved = current - paisa;
      onToast(`Withdrew ${formatPkr(paisa)} from "${selectedGoal.name}".`);
    }

    const target = toPaisa(selectedGoal.target_amount_paisa);
    const newStatus = newSaved >= target && target > 0n ? "completed" : "active";

    setGoals((prev) =>
      prev.map((g) =>
        g.id === selectedGoal.id
          ? { ...g, current_saved_paisa: newSaved, status: newStatus }
          : g
      )
    );

    setAllocateDialogOpen(false);
  }

  function handleCreateGoal(e: React.FormEvent) {
    e.preventDefault();
    if (!goalName.trim()) return;

    let targetPaisa: bigint;
    try {
      targetPaisa = parseRupeesToPaisa(goalTarget);
    } catch {
      alert("Please enter a valid target amount.");
      return;
    }

    const newGoal: SavingsGoal = {
      id: crypto.randomUUID(),
      user_id: userId,
      name: goalName.trim(),
      target_amount_paisa: targetPaisa,
      current_saved_paisa: 0n,
      target_date: goalDate || null,
      priority: goalPriority,
      status: "active",
      category: goalCategory,
    };

    setGoals((prev) => [newGoal, ...prev]);
    onToast(`Savings goal "${newGoal.name}" created.`);
    setDialogOpen(false);
  }

  return (
    <div className="savings-manager-page">
      <section className="page-heading">
        <div>
          <p className="eyebrow">Wealth protection & milestones</p>
          <h1>Savings & Emergency Fund<span className="heading-period">.</span></h1>
          <p className="page-subtitle">
            Segregate funds for peace of mind. Earmarking money for goals does not duplicate balances.
          </p>
        </div>
        <div className="heading-actions">
          <button type="button" className="outline-button refresh-button" onClick={onRefresh} disabled={refreshing}>
            <RefreshCw size={15} className={refreshing ? "spin" : ""} /> Refresh
          </button>
          <button type="button" className="primary-button" onClick={() => setDialogOpen(true)}>
            <Plus size={17} /> New goal
          </button>
        </div>
      </section>

      {/* KPI Cards: Earmarked vs Unallocated */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon-wrap" style={{ backgroundColor: "#eff6ff", color: "#2563eb" }}>
            <PiggyBank size={20} />
          </div>
          <div className="kpi-body">
            <span className="kpi-label">Total Allocated to Goals</span>
            <strong className="kpi-value">{formatPkr(totalAllocated)}</strong>
            <small className="kpi-sub">Earmarked in savings</small>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrap" style={{ backgroundColor: "#ecfdf5", color: "#10b981" }}>
            <ShieldCheck size={20} />
          </div>
          <div className="kpi-body">
            <span className="kpi-label">Emergency Cushion</span>
            <strong className="kpi-value">
              {formatPkr(goals.find((g) => g.category === "emergency_fund")?.current_saved_paisa || 0n)}
            </strong>
            <small className="kpi-sub">First line of defense</small>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrap" style={{ backgroundColor: "#f8fafc", color: "#475569" }}>
            <FolderLock size={20} />
          </div>
          <div className="kpi-body">
            <span className="kpi-label">Active / Completed</span>
            <strong className="kpi-value">
              {goals.filter((g) => g.status === "active").length} / {goals.filter((g) => g.status === "completed").length}
            </strong>
            <small className="kpi-sub">Goals tracked</small>
          </div>
        </div>
      </div>

      {/* Emergency Fund Milestones Roadmap */}
      <section className="dashboard-card" style={{ marginTop: "1.5rem" }}>
        <div className="card-header">
          <div>
            <h3>Emergency Fund Roadmap</h3>
            <p className="card-caption">
              Recommended step-by-step milestones to protect against university disruptions or income shocks.
            </p>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.75rem", marginTop: "1rem" }}>
          {emergencyMilestones.map((m, idx) => (
            <div
              key={m.title}
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                padding: "0.75rem 1rem",
                backgroundColor: "#fff",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.75rem", color: "#2563eb", fontWeight: 700 }}>Step {idx + 1}</span>
                <ShieldCheck size={16} color="#94a3b8" />
              </div>
              <strong style={{ display: "block", marginTop: "0.25rem", fontSize: "0.95rem" }}>{m.title}</strong>
              <div style={{ fontSize: "1rem", fontWeight: 700, color: "#0f172a", marginTop: "0.25rem" }}>
                {formatPkr(m.targetPaisa)}
              </div>
              <small style={{ color: "#64748b", display: "block", marginTop: "0.25rem", fontSize: "0.75rem" }}>
                {m.description}
              </small>
            </div>
          ))}
        </div>
      </section>

      {/* Goals Cards List */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1rem", marginTop: "1.5rem" }}>
        {goals.map((goal) => {
          const progress = calculateGoalProgress(goal);
          return (
            <div
              key={goal.id}
              className="dashboard-card"
              style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}
            >
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: "1.1rem" }}>{goal.name}</h4>
                    <small style={{ color: "#64748b", textTransform: "capitalize" }}>
                      Priority: {goal.priority} {goal.target_date ? `• Target: ${goal.target_date}` : ""}
                    </small>
                  </div>
                  {progress.isCompleted ? (
                    <span style={{ backgroundColor: "#ecfdf5", color: "#065f46", fontSize: "0.75rem", fontWeight: 600, padding: "2px 8px", borderRadius: "4px" }}>
                      Completed
                    </span>
                  ) : (
                    <span style={{ backgroundColor: "#eff6ff", color: "#1e40af", fontSize: "0.75rem", fontWeight: 600, padding: "2px 8px", borderRadius: "4px" }}>
                      Active
                    </span>
                  )}
                </div>

                <div style={{ marginTop: "1.25rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <span style={{ fontSize: "1.3rem", fontWeight: 700, color: "#0f172a" }}>
                      {formatPkr(progress.savedPaisa)}
                    </span>
                    <span style={{ fontSize: "0.85rem", color: "#64748b" }}>
                      of {formatPkr(progress.targetPaisa)}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div style={{ height: "8px", borderRadius: "4px", backgroundColor: "#f1f5f9", overflow: "hidden", marginTop: "0.5rem" }}>
                    <div
                      style={{
                        height: "100%",
                        width: `${progress.percent}%`,
                        backgroundColor: progress.isCompleted ? "#10b981" : "#2563eb",
                        transition: "width 0.3s ease",
                      }}
                    />
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.5rem", fontSize: "0.8rem", color: "#64748b" }}>
                    <span>{progress.percent}% reached</span>
                    <span>{progress.isCompleted ? "Goal achieved!" : `${formatPkr(progress.remainingPaisa)} needed`}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "1.25rem", borderTop: "1px solid #f1f5f9", paddingTop: "0.75rem" }}>
                <button
                  type="button"
                  className="outline-button"
                  style={{ flex: 1, fontSize: "0.8rem", padding: "6px" }}
                  onClick={() => handleOpenAllocate(goal, "deposit")}
                >
                  <ArrowDownLeft size={14} /> Add Funds
                </button>
                <button
                  type="button"
                  className="outline-button"
                  style={{ flex: 1, fontSize: "0.8rem", padding: "6px" }}
                  onClick={() => handleOpenAllocate(goal, "withdraw")}
                  disabled={progress.savedPaisa <= 0n}
                >
                  <ArrowUpRight size={14} /> Withdraw
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Allocate / Withdraw Dialog */}
      {allocateDialogOpen && selectedGoal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <h3>
                {allocateMode === "deposit" ? "Add Money to" : "Withdraw Money from"}: {selectedGoal.name}
              </h3>
              <button type="button" className="icon-button subtle" onClick={() => setAllocateDialogOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmAllocation} className="entry-form">
              <div style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", padding: "0.75rem", borderRadius: "6px", fontSize: "0.85rem", color: "#475569" }}>
                <strong>Accounting Rule:</strong> Goal allocations earmark your existing liquid funds. They do not alter your net worth or count as income.
              </div>

              <div className="form-group" style={{ marginTop: "1rem" }}>
                <label>Amount (PKR)</label>
                <input
                  type="text"
                  placeholder="e.g. 2000"
                  value={allocateAmount}
                  onChange={(e) => setAllocateAmount(e.target.value)}
                  required
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="outline-button" onClick={() => setAllocateDialogOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="primary-button">
                  Confirm {allocateMode === "deposit" ? "Allocation" : "Withdrawal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Goal Dialog */}
      {dialogOpen && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <h3>Create Savings Goal</h3>
              <button type="button" className="icon-button subtle" onClick={() => setDialogOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateGoal} className="entry-form">
              <div className="form-group">
                <label>Goal Name</label>
                <input
                  type="text"
                  placeholder="e.g. Emergency Fund, Laptop, Medical Shield"
                  value={goalName}
                  onChange={(e) => setGoalName(e.target.value)}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Category</label>
                  <select
                    value={goalCategory}
                    onChange={(e) => setGoalCategory(e.target.value as SavingsGoalCategory)}
                  >
                    <option value="emergency_fund">Emergency Fund</option>
                    <option value="university">University Expenses</option>
                    <option value="laptop">Laptop / Device</option>
                    <option value="education">Education</option>
                    <option value="personal">Personal</option>
                    <option value="investments">Future Investments</option>
                    <option value="custom">Custom Goal</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Target Amount (PKR)</label>
                  <input
                    type="text"
                    placeholder="e.g. 25000"
                    value={goalTarget}
                    onChange={(e) => setGoalTarget(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Target Date (Optional)</label>
                  <input type="date" value={goalDate} onChange={(e) => setGoalDate(e.target.value)} />
                </div>

                <div className="form-group">
                  <label>Priority</label>
                  <select
                    value={goalPriority}
                    onChange={(e) => setGoalPriority(e.target.value as "low" | "medium" | "high")}
                  >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="outline-button" onClick={() => setDialogOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="primary-button">
                  Save Goal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


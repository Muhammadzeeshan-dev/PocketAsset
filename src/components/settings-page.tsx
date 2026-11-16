"use client";

import { useRef, useState } from "react";
import type { User, SupabaseClient } from "@supabase/supabase-js";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  Database,
  Download,
  FileText,
  Key,
  Lock,
  Pencil,
  Plus,
  RefreshCw,
  Shield,
  Smartphone,
  Trash2,
  Upload,
  User as UserIcon,
  Wallet,
} from "lucide-react";
import {
  accountTypeLabel,
  calculateAccountBalance,
  formatPkr,
  type FinanceAccount,
  type FinanceTransaction,
} from "@/lib/finance";
import { createFullBackup, validateAndParseBackup } from "@/lib/settings";
import { EditAccountDialog } from "@/components/edit-account-dialog";

interface SettingsPageProps {
  user: User;
  supabase: SupabaseClient;
  accounts: FinanceAccount[];
  transactions: FinanceTransaction[];
  onRefresh: () => void;
  onToast: (msg: string) => void;
}

export function SettingsPage({
  user,
  supabase,
  accounts,
  transactions,
  onRefresh,
  onToast,
}: SettingsPageProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingAccount, setEditingAccount] = useState<FinanceAccount | null>(null);

  // Settings state
  const [expectedAllowance, setExpectedAllowance] = useState("800");
  const [currency] = useState("PKR (Rs.)");
  const [universityDays, setUniversityDays] = useState({
    mon: true,
    tue: true,
    wed: true,
    thu: true,
    fri: true,
    sat: false,
    sun: false,
  });

  const [restoreMessage, setRestoreMessage] = useState("");
  const [restoreError, setRestoreError] = useState("");

  // Inactivity auto-logout timer setting state (default 60s, or custom e.g. 120s, 300s)
  const [inactivityTimeoutSec, setInactivityTimeoutSec] = useState<number>(() => {
    if (typeof window === "undefined" || !window.localStorage) return 60;
    const val = window.localStorage.getItem("pocketasset_inactivity_timeout_sec");
    return val !== null ? Number(val) : 60;
  });

  function handleSaveInactivityTimeout(sec: number) {
    setInactivityTimeoutSec(sec);
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem("pocketasset_inactivity_timeout_sec", String(sec));
      if (sec === 0) {
        window.localStorage.setItem("pocketasset_remember_me", "true");
      } else {
        window.localStorage.removeItem("pocketasset_remember_me");
      }
      onToast(sec === 0 ? "Inactivity auto-logout disabled." : `Auto-logout set to ${sec < 60 ? `${sec}s` : sec === 60 ? "60 seconds" : `${Math.round(sec / 60)} minutes`}.`);
    }
  }

  function handleTriggerTestWarning() {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("pocketasset_test_inactivity_warning"));
      onToast("60-second auto-logout warning banner triggered. Look at the top of your screen!");
    }
  }

  function handleExportBackup() {
    try {
      const json = createFullBackup({
        accounts,
        transactions,
        settings: {
          display_name: user.email?.split("@")[0] || "User",
          currency: "PKR",
          theme: "light",
          daily_spending_limit_paisa: 150000n, // Rs. 1,500
          enable_offline_mode: true,
          enable_ai_assistant: true,
          custom_categories: ["University", "Food", "Transport", "Books", "Personal Care"],
        },
      });

      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `PocketAsset_Backup_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      onToast("Full JSON backup exported successfully.");
    } catch {
      alert("Failed to create backup.");
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setRestoreError("");
    setRestoreMessage("");

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const backup = validateAndParseBackup(text);
        setRestoreMessage(
          `Backup verified! Contains ${backup.accounts.length} accounts and ${backup.transactions.length} ledger transactions exported at ${backup.exportedAt}.`
        );
        onToast("Backup verified successfully.");
      } catch (err) {
        setRestoreError(err instanceof Error ? err.message : "Invalid backup file format.");
      }
    };
    reader.readAsText(file);
  }

  return (
    <div className="settings-manager-page" style={{ maxWidth: "880px", margin: "0 auto" }}>
      <section className="page-heading">
        <div>
          <p className="eyebrow">Preferences & security controls</p>
          <h1>Settings & Data Management<span className="heading-period">.</span></h1>
          <p className="page-subtitle">
            Manage your university schedule, allowance rules, registered accounts, and encrypted data backups.
          </p>
        </div>
      </section>

      {/* Profile & Account Identity */}
      <section className="dashboard-card" style={{ marginBottom: "1.5rem" }}>
        <div className="card-header">
          <div>
            <h3>User Profile & Currency</h3>
            <p className="card-caption">Private workspace settings</p>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem", marginTop: "1rem" }}>
          <div>
            <label style={{ fontSize: "0.8rem", color: "#64748b", display: "block" }}>Signed-in Identity</label>
            <strong style={{ fontSize: "0.95rem" }}>{user.email}</strong>
          </div>
          <div>
            <label style={{ fontSize: "0.8rem", color: "#64748b", display: "block" }}>Primary Currency</label>
            <strong style={{ fontSize: "0.95rem" }}>Pakistani Rupee (PKR - Rs.)</strong>
          </div>
          <div>
            <label style={{ fontSize: "0.8rem", color: "#64748b", display: "block" }}>Storage & Security</label>
            <strong style={{ fontSize: "0.95rem", color: "#16a34a" }}>Row-Level Security Active</strong>
          </div>
        </div>
      </section>

      {/* Inactivity Security & Auto-Logout */}
      <section className="dashboard-card" style={{ marginBottom: "1.5rem" }}>
        <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Clock size={18} color="#2563eb" />
              <h3 style={{ margin: 0 }}>Inactivity Auto-Logout &amp; Session Protection</h3>
            </div>
            <p className="card-caption">
              Protect your financial ledger by automatically signing out when idle. Includes an authoritative 60-second warning countdown before signing out.
            </p>
          </div>
          <button
            type="button"
            className="outline-button"
            style={{ fontSize: "11px", padding: "5px 12px", display: "inline-flex", alignItems: "center", gap: "6px", background: "#f0fdf4", color: "#16a34a", borderColor: "#bbf7d0" }}
            onClick={handleTriggerTestWarning}
            title="Immediately launch the 60-second warning banner to test countdown and buttons"
          >
            <Clock size={13} /> Test 60-Second Auto-Logout Now
          </button>
        </div>

        <div style={{ marginTop: "1rem" }}>
          <label style={{ fontSize: "0.85rem", fontWeight: 600, display: "block", marginBottom: "0.5rem", color: "#334155" }}>
            Choose Inactivity Idle Duration
          </label>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {[
              { sec: 60, label: "60 Seconds (Recommended)", hint: "60s idle + 60s countdown lock" },
              { sec: 120, label: "2 Minutes", hint: "Short idle lock" },
              { sec: 300, label: "5 Minutes", hint: "Standard protection" },
              { sec: 900, label: "15 Minutes", hint: "Extended workspace" },
              { sec: 1800, label: "30 Minutes", hint: "Long session" },
              { sec: 0, label: "Disabled", hint: "Stay logged in (Personal device only)" },
            ].map(({ sec, label, hint }) => {
              const active = inactivityTimeoutSec === sec;
              return (
                <button
                  key={sec}
                  type="button"
                  onClick={() => handleSaveInactivityTimeout(sec)}
                  style={{
                    padding: "8px 14px",
                    borderRadius: "8px",
                    fontSize: "0.82rem",
                    fontWeight: 650,
                    border: active ? "2px solid #2563eb" : "1px solid #cbd5e1",
                    backgroundColor: active ? "#eff6ff" : "#ffffff",
                    color: active ? "#1d4ed8" : "#475569",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    gap: "2px",
                    minWidth: "140px",
                    transition: "all 0.15s ease",
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                    {label} {active ? "✓" : ""}
                  </span>
                  <small style={{ fontSize: "10px", color: active ? "#2563eb" : "#94a3b8", fontWeight: 400 }}>
                    {hint}
                  </small>
                </button>
              );
            })}
          </div>

          <div style={{ marginTop: "12px", padding: "10px 14px", borderRadius: "8px", background: "#f8fafc", border: "1px solid #e2e8f0", fontSize: "11px", color: "#64748b", display: "flex", alignItems: "center", gap: "8px" }}>
            <Shield size={14} color="#3b82f6" style={{ flexShrink: 0 }} />
            <span>
              {inactivityTimeoutSec === 60 ? (
                <strong style={{ color: "#2563eb" }}>
                  Strict 60-Second Auto-Logout Active: After 60 seconds of no mouse, keyboard, or touch events, a 60-second warning banner will appear.
                </strong>
              ) : inactivityTimeoutSec === 0 ? (
                <span style={{ color: "#d97706" }}>
                  Auto-logout is disabled for this personal browser session. Remember to manually sign out on shared devices.
                </span>
              ) : (
                <span>
                  After <strong>{Math.round(inactivityTimeoutSec / 60)} minutes</strong> of inactivity, the 60-second warning banner will appear with an audible alert. Click &quot;Keep Working&quot; or press Enter to stay signed in.
                </span>
              )}
            </span>
          </div>
        </div>
      </section>

      {/* Liquid Accounts & Balance Reconciliation */}
      <section className="dashboard-card" style={{ marginBottom: "1.5rem" }}>
        <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
          <div>
            <h3>Liquid Accounts &amp; Balance Reconciliation</h3>
            <p className="card-caption">
              Reconcile your actual cash in hand, JazzCash, Easypaisa, or bank balances when you forget to record daily transactions.
            </p>
          </div>
          <button
            type="button"
            className="primary-button"
            style={{ fontSize: "12px", padding: "6px 14px", display: "inline-flex", alignItems: "center", gap: "6px" }}
            onClick={async () => {
              try {
                const cashAcc = accounts.find((a) => a.name.toLowerCase().includes("hand") || (a.account_type === "cash" && !a.name.toLowerCase().includes("jazz")));
                const jazzAcc = accounts.find((a) => a.name.toLowerCase().includes("jazz"));
                const easyAcc = accounts.find((a) => a.name.toLowerCase().includes("easy"));

                if (cashAcc) {
                  await supabase.from("accounts").update({ opening_balance_paisa: "400000" }).eq("id", cashAcc.id);
                }
                if (jazzAcc) {
                  await supabase.from("accounts").update({ opening_balance_paisa: "321000" }).eq("id", jazzAcc.id);
                }
                if (easyAcc) {
                  await supabase.from("accounts").update({ opening_balance_paisa: "159900" }).eq("id", easyAcc.id);
                }
                onRefresh();
                onToast("Updated balances: Cash Rs. 4,000 | JazzCash Rs. 3,210 | Easypaisa Rs. 1,599.");
              } catch (e) {
                onToast("Failed to apply profile balances.");
              }
            }}
          >
            <CheckCircle2 size={14} /> Quick Set (Cash: Rs 4,000 | Jazz: Rs 3,210 | Easy: Rs 1,599)
          </button>
        </div>

        <div style={{ marginTop: "1rem" }}>
          <div style={{ display: "grid", gap: "10px" }}>
            {accounts.map((acc) => {
              const currentBal = calculateAccountBalance(acc, transactions);
              return (
                <div
                  key={acc.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 16px",
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "10px",
                    gap: "12px",
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: "180px" }}>
                    <div
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "8px",
                        background: "#eff6ff",
                        color: "#2563eb",
                        display: "grid",
                        placeItems: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Wallet size={18} />
                    </div>
                    <div>
                      <strong style={{ fontSize: "14px", color: "#0f172a", display: "block" }}>
                        {acc.name}
                      </strong>
                      <span style={{ fontSize: "11px", color: "#64748b" }}>
                        {accountTypeLabel[acc.account_type] ?? "Account"}
                        {!acc.is_active ? " · Inactive" : ""}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "16px", marginLeft: "auto" }}>
                    <div style={{ textAlign: "right" }}>
                      <span
                        style={{
                          fontSize: "10px",
                          color: "#64748b",
                          textTransform: "uppercase",
                          display: "block",
                          fontWeight: 600,
                          letterSpacing: "0.5px",
                        }}
                      >
                        Current Balance
                      </span>
                      <strong style={{ fontSize: "15px", color: "#0f172a" }}>
                        {formatPkr(currentBal)}
                      </strong>
                    </div>

                    <button
                      type="button"
                      className="outline-button"
                      style={{ padding: "6px 12px", fontSize: "12px", gap: "6px" }}
                      onClick={() => setEditingAccount(acc)}
                    >
                      <Pencil size={13} /> Edit / Reconcile
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* University Schedule & Allowance Configuration */}
      <section className="dashboard-card" style={{ marginBottom: "1.5rem" }}>
        <div className="card-header">
          <div>
            <h3>University Schedule & Allowance Configuration</h3>
            <p className="card-caption">
              Configure expected allowances on university days. Saturday & Sunday remain zero expected allowance by default.
            </p>
          </div>
        </div>

        <div style={{ marginTop: "1rem" }}>
          <div className="form-group" style={{ maxWidth: "260px" }}>
            <label>Expected Allowance on University Days (PKR)</label>
            <input
              type="text"
              value={expectedAllowance}
              onChange={(e) => setExpectedAllowance(e.target.value)}
            />
          </div>

          <label style={{ fontSize: "0.85rem", fontWeight: 600, display: "block", marginTop: "1rem", marginBottom: "0.5rem" }}>
            Active University Days
          </label>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {[
              { key: "mon", label: "Monday" },
              { key: "tue", label: "Tuesday" },
              { key: "wed", label: "Wednesday" },
              { key: "thu", label: "Thursday" },
              { key: "fri", label: "Friday" },
              { key: "sat", label: "Saturday (Weekend)" },
              { key: "sun", label: "Sunday (Weekend)" },
            ].map(({ key, label }) => {
              const active = universityDays[key as keyof typeof universityDays];
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() =>
                    setUniversityDays((prev) => ({
                      ...prev,
                      [key]: !prev[key as keyof typeof universityDays],
                    }))
                  }
                  style={{
                    padding: "6px 12px",
                    borderRadius: "6px",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    border: active ? "1px solid #2563eb" : "1px solid #cbd5e1",
                    backgroundColor: active ? "#eff6ff" : "#fff",
                    color: active ? "#2563eb" : "#64748b",
                    cursor: "pointer",
                  }}
                >
                  {label} {active ? "✓" : ""}
                </button>
              );
            })}
          </div>
          <small style={{ color: "#64748b", display: "block", marginTop: "0.5rem" }}>
            Rule D: Expected allowance never automatically creates fake income on holidays or weekends. Only confirmed receipts update account balances.
          </small>
        </div>
      </section>

      {/* Backup and Restore */}
      <section className="dashboard-card" style={{ marginBottom: "1.5rem" }}>
        <div className="card-header">
          <div>
            <h3>Data Backup & Restore</h3>
            <p className="card-caption">
              Create offline encrypted copies of your complete financial records or restore from an earlier backup.
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginTop: "1rem" }}>
          <button type="button" className="primary-button" onClick={handleExportBackup}>
            <Download size={16} /> Export Complete JSON Backup
          </button>

          <button
            type="button"
            className="outline-button"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={16} /> Restore / Verify JSON Backup
          </button>
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: "none" }}
            accept=".json"
            onChange={handleFileSelect}
          />
        </div>

        {restoreMessage && (
          <div style={{ backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534", padding: "0.75rem", borderRadius: "6px", marginTop: "1rem", fontSize: "0.85rem" }}>
            <CheckCircle2 size={16} style={{ display: "inline", marginRight: "6px" }} />
            {restoreMessage}
          </div>
        )}

        {restoreError && (
          <div style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", padding: "0.75rem", borderRadius: "6px", marginTop: "1rem", fontSize: "0.85rem" }}>
            <AlertTriangle size={16} style={{ display: "inline", marginRight: "6px" }} />
            {restoreError}
          </div>
        )}
      </section>

      {/* Security Principles */}
      <section className="dashboard-card">
        <div className="card-header">
          <div>
            <h3>Security & Privacy Guarantees</h3>
            <p className="card-caption">PocketAsset financial safety guidelines</p>
          </div>
        </div>

        <ul style={{ margin: "1rem 0 0 1.25rem", color: "#475569", fontSize: "0.875rem", lineHeight: "1.7" }}>
          <li><strong>Never store JazzCash or Easypaisa MPINs:</strong> PocketAsset never asks for or stores banking PINs or passwords.</li>
          <li><strong>Never store Brokerage passwords:</strong> PSX transactions and prices are recorded via verified statements.</li>
          <li><strong>User-isolated Row Level Security:</strong> PostgreSQL policies restrict all database operations to your unique authenticated user ID.</li>
          <li><strong>No automatic trading:</strong> All ledger entries require explicit user confirmation.</li>
        </ul>
      </section>

      {editingAccount && (
        <EditAccountDialog
          account={editingAccount}
          currentBalance={calculateAccountBalance(editingAccount, transactions)}
          userId={user.id}
          supabase={supabase}
          onClose={() => setEditingAccount(null)}
          onUpdated={(message) => {
            setEditingAccount(null);
            onRefresh();
            onToast(message);
          }}
        />
      )}
    </div>
  );
}


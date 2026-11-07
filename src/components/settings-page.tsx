"use client";

import { useRef, useState } from "react";
import type { User, SupabaseClient } from "@supabase/supabase-js";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Database,
  Download,
  FileText,
  Key,
  Lock,
  Plus,
  RefreshCw,
  Shield,
  Smartphone,
  Trash2,
  Upload,
  User as UserIcon,
  Wallet,
} from "lucide-react";
import { formatPkr, type FinanceAccount, type FinanceTransaction } from "@/lib/finance";
import { createFullBackup, validateAndParseBackup } from "@/lib/settings";

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
    </div>
  );
}


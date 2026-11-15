"use client";

import { useEffect, useMemo, type ReactNode } from "react";
import {
  Activity,
  Award,
  CheckCircle2,
  ChevronRight,
  HeartPulse,
  Layers,
  Percent,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react";
import { formatPkr, type FinanceAccount, type FinanceTransaction } from "@/lib/finance";
import { diagnoseWealthHealth, type WealthDoctorReport } from "@/lib/wealth-doctor";

interface WealthDoctorModalProps {
  accounts: FinanceAccount[];
  transactions: FinanceTransaction[];
  onClose: () => void;
}

function ModalShell({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    document.body.classList.add("modal-open");
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.classList.remove("modal-open");
    };
  }, [onClose]);

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        className="dialog-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="doctor-dialog-title"
        style={{ maxWidth: "720px" }}
      >
        <div className="dialog-heading">
          <div>
            <p className="panel-kicker">Diagnostic Intelligence</p>
            <h2 id="doctor-dialog-title">{title}</h2>
            <p>{subtitle}</p>
          </div>
          <button
            type="button"
            className="icon-button dialog-close"
            aria-label="Close dialog"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

export function WealthDoctorModal({
  accounts,
  transactions,
  onClose,
}: WealthDoctorModalProps) {
  const report: WealthDoctorReport = useMemo(() => {
    return diagnoseWealthHealth(accounts, transactions, [], [], 1740426n);
  }, [accounts, transactions]);

  const p = report.pillars;

  return (
    <ModalShell
      title="AI Wealth Doctor &amp; Financial Health Radar"
      subtitle="Holistic diagnostic score combining liquidity buffer, wealth retention, debt leverage, and multi-asset defense."
      onClose={onClose}
    >
      <div style={{ display: "grid", gap: "18px" }}>
        {/* Top Score Banner */}
        <div
          style={{
            padding: "20px 24px",
            background: "linear-gradient(135deg, #0b1329 0%, #161e38 100%)",
            borderRadius: "14px",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "16px",
            border: "1px solid rgba(59, 130, 246, 0.3)",
            boxShadow: "0 8px 24px rgba(15, 23, 42, 0.3)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div
              style={{
                width: "68px",
                height: "68px",
                borderRadius: "50%",
                background: "conic-gradient(#10b981 0% 86%, #334155 86% 100%)",
                display: "grid",
                placeItems: "center",
                padding: "5px",
                flex: "0 0 68px",
              }}
            >
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  borderRadius: "50%",
                  background: "#0b1329",
                  display: "grid",
                  placeItems: "center",
                  fontSize: "18px",
                  fontWeight: 800,
                  color: "#10b981",
                  fontFamily: "monospace",
                }}
              >
                {report.overallScore}
              </div>
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "3px" }}>
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: "999px",
                    background: "#065f46",
                    color: "#34d399",
                    letterSpacing: "0.5px",
                  }}
                >
                  GRADE {report.grade}
                </span>
                <span style={{ fontSize: "11px", color: "#94a3b8" }}>Health Index</span>
              </div>
              <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 800, color: "#f8fafc" }}>
                {report.statusTitle}
              </h3>
              <p style={{ margin: "3px 0 0", fontSize: "11px", color: "#94a3b8", maxWidth: "420px", lineHeight: 1.45 }}>
                {report.summary}
              </p>
            </div>
          </div>

          <div style={{ textAlign: "right" }}>
            <span style={{ fontSize: "10px", color: "#94a3b8", display: "block" }}>Debt Leverage</span>
            <strong style={{ fontSize: "15px", color: "#34d399" }}>100% Debt-Free</strong>
          </div>
        </div>

        {/* 5 Pillars Radar Grid */}
        <div style={{ display: "grid", gap: "10px" }}>
          <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
            Diagnostic Pillars Breakdown
          </span>

          {[p.liquidity, p.savingsRate, p.debtFreedom, p.diversification, p.spendingDiscipline].map((pillar) => (
            <div
              key={pillar.name}
              style={{
                padding: "12px 16px",
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "10px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <strong style={{ fontSize: "13px", color: "#0f172a" }}>{pillar.name}</strong>
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 700,
                      padding: "2px 6px",
                      borderRadius: "6px",
                      background: pillar.status === "excellent" ? "#ecfdf5" : pillar.status === "good" ? "#eff6ff" : "#fffbeb",
                      color: pillar.status === "excellent" ? "#166534" : pillar.status === "good" ? "#1e40af" : "#92400e",
                    }}
                  >
                    {pillar.metricValue}
                  </span>
                </div>
                <strong style={{ fontSize: "12px", color: "#2563eb" }}>{pillar.score} / 100</strong>
              </div>

              {/* Progress Bar */}
              <div style={{ width: "100%", height: "6px", background: "#e2e8f0", borderRadius: "999px", overflow: "hidden", marginBottom: "6px" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${pillar.score}%`,
                    background: pillar.score >= 80 ? "#10b981" : pillar.score >= 60 ? "#3b82f6" : "#f59e0b",
                    borderRadius: "999px",
                  }}
                />
              </div>
              <p style={{ margin: 0, fontSize: "11px", color: "#64748b", lineHeight: 1.4 }}>
                {pillar.insight}
              </p>
            </div>
          ))}
        </div>

        {/* Doctor's Prescriptions (Rx) */}
        <div>
          <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", display: "block", marginBottom: "8px" }}>
            Doctor&apos;s Prescriptions (Rx) &bull; Priority Micro-Goals
          </span>
          <div style={{ display: "grid", gap: "8px" }}>
            {report.prescriptions.map((rx, idx) => (
              <div
                key={idx}
                style={{
                  padding: "12px 14px",
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "10px",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "10px",
                }}
              >
                <div
                  style={{
                    width: "24px",
                    height: "24px",
                    borderRadius: "6px",
                    background: rx.priority === "high" ? "#fee2e2" : rx.priority === "medium" ? "#eff6ff" : "#fef3c7",
                    color: rx.priority === "high" ? "#b91c1c" : rx.priority === "medium" ? "#2563eb" : "#d97706",
                    display: "grid",
                    placeItems: "center",
                    fontSize: "11px",
                    fontWeight: 700,
                    flex: "0 0 24px",
                  }}
                >
                  {idx + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <strong style={{ fontSize: "12px", color: "#0f172a" }}>{rx.title}</strong>
                    <span style={{ fontSize: "10px", color: "#166534", fontWeight: 600 }}>{rx.targetImpact}</span>
                  </div>
                  <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#64748b", lineHeight: 1.45 }}>
                    {rx.action}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ModalShell>
  );
}

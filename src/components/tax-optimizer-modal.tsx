"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Copy,
  Download,
  FileSpreadsheet,
  FileText,
  HelpCircle,
  Receipt,
  ShieldAlert,
  Sparkles,
  Zap,
  X,
} from "lucide-react";
import { formatPkr, type FinanceTransaction } from "@/lib/finance";
import {
  calculateWhtRefunds,
  generateFbrClaimSchedule,
  type TaxOptimizerReport,
} from "@/lib/tax-optimizer";

interface TaxOptimizerModalProps {
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
        aria-labelledby="tax-dialog-title"
        style={{ maxWidth: "760px" }}
      >
        <div className="dialog-heading">
          <div>
            <p className="panel-kicker">FBR Tax Intelligence &bull; Section 170</p>
            <h2 id="tax-dialog-title">{title}</h2>
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

export function TaxOptimizerModal({
  transactions,
  onClose,
}: TaxOptimizerModalProps) {
  const [filerStatus, setFilerStatus] = useState<"filer" | "non_filer">("filer");
  const [copiedSchedule, setCopiedSchedule] = useState(false);

  const report: TaxOptimizerReport = useMemo(() => {
    return calculateWhtRefunds(transactions, "2026", filerStatus);
  }, [transactions, filerStatus]);

  function handleCopySchedule() {
    const text = generateFbrClaimSchedule(report);
    navigator.clipboard.writeText(text).then(() => {
      setCopiedSchedule(true);
      setTimeout(() => setCopiedSchedule(false), 2500);
    });
  }

  const b = report.breakdown;

  return (
    <ModalShell
      title="FBR Advance WHT Refund Reclaimer"
      subtitle="Detects Withholding Tax deducted under Sec 236 (Mobile), Sec 235 (Electricity), and Sec 150 (Dividends) to claim back in your annual FBR return."
      onClose={onClose}
    >
      <div className="dialog-scroll-body" style={{ maxHeight: "75vh", overflowY: "auto", padding: "4px 2px 16px" }}>
        {/* Top Banner with Total Reclaimable Tax */}
        <div
          style={{
            background: "linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%)",
            borderRadius: "14px",
            padding: "20px 24px",
            color: "#ffffff",
            marginBottom: "20px",
            boxShadow: "0 8px 24px -4px rgba(5, 150, 105, 0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "16px",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: "700",
                  textTransform: "uppercase",
                  letterSpacing: "0.8px",
                  padding: "2px 8px",
                  borderRadius: "999px",
                  background: "rgba(255, 255, 255, 0.2)",
                }}
              >
                Tax Year {report.taxYear} Potential Refund
              </span>
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: "700",
                  color: "#a7f3d0",
                }}
              >
                Under Sec 170 ITO 2001
              </span>
            </div>
            <div style={{ fontSize: "32px", fontWeight: "800", letterSpacing: "-0.5px" }}>
              {formatPkr(report.totalAdjustableTaxPaisa)}
            </div>
            <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#d1fae5", maxWidth: "440px" }}>
              Total advance tax automatically deducted from your bills, mobile recharges, and banking. Reclaimable against your annual tax liability.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px", alignItems: "flex-end" }}>
            <div style={{ display: "inline-flex", background: "rgba(0, 0, 0, 0.2)", padding: "3px", borderRadius: "8px" }}>
              <button
                type="button"
                onClick={() => setFilerStatus("filer")}
                style={{
                  padding: "5px 12px",
                  borderRadius: "6px",
                  border: "none",
                  fontSize: "11px",
                  fontWeight: "700",
                  cursor: "pointer",
                  background: filerStatus === "filer" ? "#ffffff" : "transparent",
                  color: filerStatus === "filer" ? "#065f46" : "#e2e8f0",
                  transition: "all 0.15s ease",
                }}
              >
                Active Filer (15%)
              </button>
              <button
                type="button"
                onClick={() => setFilerStatus("non_filer")}
                style={{
                  padding: "5px 12px",
                  borderRadius: "6px",
                  border: "none",
                  fontSize: "11px",
                  fontWeight: "700",
                  cursor: "pointer",
                  background: filerStatus === "non_filer" ? "#ffffff" : "transparent",
                  color: filerStatus === "non_filer" ? "#991b1b" : "#e2e8f0",
                  transition: "all 0.15s ease",
                }}
              >
                Non-Filer (30%)
              </button>
            </div>
            <button
              type="button"
              onClick={handleCopySchedule}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                background: copiedSchedule ? "#10b981" : "#ffffff",
                color: copiedSchedule ? "#ffffff" : "#065f46",
                border: "none",
                borderRadius: "8px",
                padding: "8px 14px",
                fontSize: "11px",
                fontWeight: "700",
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
                transition: "all 0.15s ease",
              }}
            >
              {copiedSchedule ? <Check size={14} /> : <Copy size={14} />}
              {copiedSchedule ? "Schedule Copied!" : "Copy FBR IRIS Schedule"}
            </button>
          </div>
        </div>

        {/* Deductions Itemized Breakdown Grid */}
        <h3 style={{ fontSize: "14px", fontWeight: "700", color: "#0f172a", margin: "0 0 12px" }}>
          Itemized Withholding Deductions Breakdown
        </h3>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px", marginBottom: "20px" }}>
          {/* Section 236: Mobile */}
          <div
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              padding: "14px 16px",
              display: "flex",
              flexDirection: "column",
              gap: "6px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "10px", fontWeight: "700", color: "#2563eb", background: "#eff6ff", padding: "2px 6px", borderRadius: "6px" }}>
                {b.mobileTelecom.sectionCode}
              </span>
              <span style={{ fontSize: "10px", color: "#64748b", fontWeight: "600" }}>
                {b.mobileTelecom.taxRatePercent}% WHT
              </span>
            </div>
            <strong style={{ fontSize: "13px", color: "#0f172a" }}>{b.mobileTelecom.sectionName}</strong>
            <div style={{ fontSize: "18px", fontWeight: "800", color: "#059669", marginTop: "2px" }}>
              {formatPkr(b.mobileTelecom.deductedTaxPaisa)}
            </div>
            <span style={{ fontSize: "11px", color: "#64748b" }}>
              From {formatPkr(b.mobileTelecom.totalGrossSpendPaisa)} recharges ({b.mobileTelecom.transactionCount} loads)
            </span>
          </div>

          {/* Section 235: Electricity */}
          <div
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              padding: "14px 16px",
              display: "flex",
              flexDirection: "column",
              gap: "6px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "10px", fontWeight: "700", color: "#d97706", background: "#fffbeb", padding: "2px 6px", borderRadius: "6px" }}>
                {b.electricityBills.sectionCode}
              </span>
              <span style={{ fontSize: "10px", color: "#64748b", fontWeight: "600" }}>
                {b.electricityBills.taxRatePercent}% WHT
              </span>
            </div>
            <strong style={{ fontSize: "13px", color: "#0f172a" }}>{b.electricityBills.sectionName}</strong>
            <div style={{ fontSize: "18px", fontWeight: "800", color: "#059669", marginTop: "2px" }}>
              {formatPkr(b.electricityBills.deductedTaxPaisa)}
            </div>
            <span style={{ fontSize: "11px", color: "#64748b" }}>
              From {formatPkr(b.electricityBills.totalGrossSpendPaisa)} bills ({b.electricityBills.transactionCount} bills)
            </span>
          </div>

          {/* Section 150: PSX Dividends */}
          <div
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              padding: "14px 16px",
              display: "flex",
              flexDirection: "column",
              gap: "6px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "10px", fontWeight: "700", color: "#7c3aed", background: "#f5f3ff", padding: "2px 6px", borderRadius: "6px" }}>
                {b.psxDividends.sectionCode}
              </span>
              <span style={{ fontSize: "10px", color: "#64748b", fontWeight: "600" }}>
                {b.psxDividends.taxRatePercent}% WHT
              </span>
            </div>
            <strong style={{ fontSize: "13px", color: "#0f172a" }}>{b.psxDividends.sectionName}</strong>
            <div style={{ fontSize: "18px", fontWeight: "800", color: "#059669", marginTop: "2px" }}>
              {formatPkr(b.psxDividends.deductedTaxPaisa)}
            </div>
            <span style={{ fontSize: "11px", color: "#64748b" }}>
              From {formatPkr(b.psxDividends.totalGrossSpendPaisa)} dividends ({b.psxDividends.transactionCount} payouts)
            </span>
          </div>
        </div>

        {/* How to claim notes and FBR Law references */}
        <div
          style={{
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
            borderRadius: "12px",
            padding: "16px",
            marginBottom: "20px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#1e40af", fontWeight: "700", fontSize: "13px", marginBottom: "8px" }}>
            <FileText size={16} /> How to Claim Your Refund in FBR IRIS Portal:
          </div>
          <ol style={{ margin: "0 0 0 18px", padding: 0, fontSize: "12px", color: "#1e3a8a", lineHeight: "1.6" }}>
            {report.refundClaimScheduleNotes.map((note, idx) => (
              <li key={idx}>{note}</li>
            ))}
          </ol>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
          <button
            type="button"
            className="secondary-button"
            onClick={onClose}
          >
            Close
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={handleCopySchedule}
          >
            <Copy size={14} /> Copy Full Refund Schedule
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

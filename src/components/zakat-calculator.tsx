"use client";

import { useEffect, useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Download,
  HeartHandshake,
  Landmark,
  Moon,
  Plus,
  Radio,
  RefreshCw,
  Scale,
  ShieldCheck,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import { formatPkr, parseRupeesToPaisa, type FinanceAccount, type FinanceTransaction } from "@/lib/finance";
import { calculateZakat, DEFAULT_ZAKAT_RATES, type ZakatRates } from "@/lib/zakat";
import type { Asset, Liability } from "@/lib/assets";
import { fetchLiveMarketData } from "@/lib/market-feed";

interface ZakatCalculatorProps {
  userId: string;
  supabase: SupabaseClient;
  accounts: FinanceAccount[];
  transactions: FinanceTransaction[];
  stockMarketValuePaisa: bigint;
  assets: Asset[];
  liabilities: Liability[];
  onRefresh: () => void;
  onToast: (msg: string) => void;
}

interface ZakatPayment {
  id: string;
  amountPaisa: bigint;
  recipient: string;
  date: string;
  notes: string;
}

export function ZakatCalculator({
  userId,
  supabase,
  accounts,
  transactions,
  stockMarketValuePaisa,
  assets,
  liabilities,
  onRefresh,
  onToast,
}: ZakatCalculatorProps) {
  const [rates, setRates] = useState<ZakatRates>(DEFAULT_ZAKAT_RATES);
  const [silverTolaInput, setSilverTolaInput] = useState("3350");
  const [goldTolaInput, setGoldTolaInput] = useState("282500");
  const [nisabStandard, setNisabStandard] = useState<"silver" | "gold">("silver");
  const [stockPercentage, setStockPercentage] = useState(30);
  const [liveBullionSynced, setLiveBullionSynced] = useState(false);

  // Auto-fetch live Sarafa bullion rates on mount
  useEffect(() => {
    void (async () => {
      try {
        const feed = await fetchLiveMarketData();
        if (feed.bullion) {
          setSilverTolaInput(String(feed.bullion.silverTolaRupees));
          setGoldTolaInput(String(feed.bullion.gold24kTolaRupees));
          setLiveBullionSynced(true);
        }
      } catch {
        // use default
      }
    })();
  }, []);

  // Zakat paid records
  const [payments, setPayments] = useState<ZakatPayment[]>([]);
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [payAmountInput, setPayAmountInput] = useState("");
  const [payRecipient, setPayRecipient] = useState("");
  const [payNotes, setPayNotes] = useState("");

  // Update rates when inputs change
  const currentRates: ZakatRates = useMemo(() => {
    let silverPaisa = 330000n;
    let goldPaisa = 28000000n;
    try {
      silverPaisa = parseRupeesToPaisa(silverTolaInput);
    } catch {
      // fallback
    }
    try {
      goldPaisa = parseRupeesToPaisa(goldTolaInput);
    } catch {
      // fallback
    }
    return {
      silverRatePerTolaPaisa: silverPaisa,
      goldRatePerTolaPaisa: goldPaisa,
      nisabStandard,
      stockZakatablePercentage: stockPercentage,
    };
  }, [silverTolaInput, goldTolaInput, nisabStandard, stockPercentage]);

  const zakat = useMemo(() => {
    return calculateZakat(accounts, transactions, stockMarketValuePaisa, assets, liabilities, currentRates);
  }, [accounts, transactions, stockMarketValuePaisa, assets, liabilities, currentRates]);

  const totalPaidPaisa = useMemo(() => {
    return payments.reduce((sum, p) => sum + p.amountPaisa, 0n);
  }, [payments]);

  const remainingZakatDuePaisa = zakat.zakatDuePaisa > totalPaidPaisa
    ? zakat.zakatDuePaisa - totalPaidPaisa
    : 0n;

  function handleRecordPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!payAmountInput.trim() || !payRecipient.trim()) return;

    let amtPaisa = 0n;
    try {
      amtPaisa = parseRupeesToPaisa(payAmountInput);
    } catch {
      alert("Invalid payment amount.");
      return;
    }

    const newPayment: ZakatPayment = {
      id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `zk-${Date.now()}`,
      amountPaisa: amtPaisa,
      recipient: payRecipient.trim(),
      date: new Date().toISOString().slice(0, 10),
      notes: payNotes.trim(),
    };

    setPayments((prev) => [newPayment, ...prev]);
    onToast(`Recorded Zakat distribution of ${formatPkr(amtPaisa)}.`);
    setPayDialogOpen(false);
    setPayAmountInput("");
    setPayRecipient("");
    setPayNotes("");
  }

  return (
    <div className="zakat-calculator-page" style={{ paddingBottom: "3rem" }}>
      <section className="page-heading">
        <div>
          <p className="eyebrow" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Moon size={14} style={{ color: "#059669" }} /> Shariah Wealth Intelligence
          </p>
          <h1>Zakat &amp; Nisab Calculator<span className="heading-period">.</span></h1>
          <p className="page-subtitle">
            Accurate Shariah-compliant Zakat calculation on liquid wealth, gold, and PSX stock shares with Nisab verification.
          </p>
        </div>
        <div className="heading-actions">
          <button type="button" className="outline-button refresh-button" onClick={onRefresh}>
            <RefreshCw size={15} /> Refresh Accounts
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={() => setPayDialogOpen(true)}
            disabled={!zakat.isEligibleForZakat}
          >
            <HeartHandshake size={16} /> Record Zakat Payment
          </button>
        </div>
      </section>

      {/* Primary Status Banner */}
      <div
        style={{
          marginTop: "1.5rem",
          padding: "20px 24px",
          borderRadius: "14px",
          background: zakat.isEligibleForZakat
            ? "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)"
            : "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
          border: `1px solid ${zakat.isEligibleForZakat ? "#a7f3d0" : "#e2e8f0"}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div>
          {liveBullionSynced && (
            <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "2px 8px", borderRadius: "6px", background: "rgba(5, 150, 105, 0.12)", border: "1px solid rgba(5, 150, 105, 0.25)", marginBottom: "8px" }}>
              <span className="live-status-dot live-dot-pulse" />
              <span style={{ fontSize: "10px", fontWeight: 750, color: "#047857" }}>
                LIVE SARAFA RATES AUTO-SYNCED (SILVER: Rs. {Number(silverTolaInput).toLocaleString()} • GOLD: Rs. {Number(goldTolaInput).toLocaleString()})
              </span>
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
            {zakat.isEligibleForZakat ? (
              <span style={{ fontSize: "12px", fontWeight: 700, padding: "3px 10px", borderRadius: "12px", background: "#059669", color: "#ffffff" }}>
                ✓ Saahib-e-Nisab (Zakat Due)
              </span>
            ) : (
              <span style={{ fontSize: "12px", fontWeight: 700, padding: "3px 10px", borderRadius: "12px", background: "#64748b", color: "#ffffff" }}>
                ● Below Nisab Threshold
              </span>
            )}
            <span style={{ fontSize: "12px", color: "#475569" }}>
              Nisab Standard: {nisabStandard === "silver" ? "Silver (52.5 Tola)" : "Gold (7.5 Tola)"} ({formatPkr(zakat.nisabThresholdPaisa)})
            </span>
          </div>

          <h2 style={{ margin: "0 0 4px 0", fontSize: "28px", fontWeight: 800, color: "#0f172a" }}>
            {formatPkr(zakat.zakatDuePaisa)}
          </h2>
          <p style={{ margin: 0, fontSize: "13px", color: "#475569" }}>
            Total 2.5% Zakat on Net Zakatable Wealth of <strong>{formatPkr(zakat.netZakatableWealthPaisa)}</strong>.
          </p>
        </div>

        {zakat.isEligibleForZakat && (
          <div style={{ textAlign: "right" }}>
            <span style={{ fontSize: "11px", textTransform: "uppercase", fontWeight: 700, color: "#64748b", display: "block" }}>
              Remaining Zakat to Distribute
            </span>
            <strong style={{ fontSize: "22px", color: remainingZakatDuePaisa > 0n ? "#dc2626" : "#16a34a" }}>
              {formatPkr(remainingZakatDuePaisa)}
            </strong>
            <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
              Already Distributed: {formatPkr(totalPaidPaisa)}
            </div>
          </div>
        )}
      </div>

      {/* Asset Breakdown Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem", marginTop: "1.5rem" }}>
        <div className="dashboard-card">
          <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>1. Liquid Cash &amp; Wallets</span>
          <div style={{ fontSize: "20px", fontWeight: 700, color: "#0f172a", margin: "6px 0" }}>
            {formatPkr(zakat.cashAndBankPaisa)}
          </div>
          <small style={{ color: "#64748b" }}>100% Zakatable (Cash in hand, JazzCash, Easypaisa)</small>
        </div>

        <div className="dashboard-card">
          <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>2. PSX Stocks (Working Capital)</span>
          <div style={{ fontSize: "20px", fontWeight: 700, color: "#2563eb", margin: "6px 0" }}>
            {formatPkr(zakat.zakatableStocksPaisa)}
          </div>
          <small style={{ color: "#64748b" }}>{stockPercentage}% of portfolio market value ({formatPkr(stockMarketValuePaisa)})</small>
        </div>

        <div className="dashboard-card">
          <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>3. Gold &amp; Silver</span>
          <div style={{ fontSize: "20px", fontWeight: 700, color: "#d97706", margin: "6px 0" }}>
            {formatPkr(zakat.goldSilverPaisa)}
          </div>
          <small style={{ color: "#64748b" }}>100% Zakatable value from assets</small>
        </div>

        <div className="dashboard-card">
          <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>4. Deductible Immediate Debts</span>
          <div style={{ fontSize: "20px", fontWeight: 700, color: "#dc2626", margin: "6px 0" }}>
            -{formatPkr(zakat.deductibleDebtsPaisa)}
          </div>
          <small style={{ color: "#64748b" }}>Short-term borrowed liabilities subtracted</small>
        </div>
      </div>

      {/* Nisab Rate Settings */}
      <section className="dashboard-card" style={{ marginTop: "1.5rem" }}>
        <div className="card-header">
          <div>
            <h3>Nisab &amp; Shariah Parameters</h3>
            <p className="card-caption">
              Adjust current Pakistani market rates for Silver and Gold per Tola to verify your Nisab status.
            </p>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginTop: "1rem" }}>
          <div>
            <label style={{ fontSize: "12px", color: "#475569", fontWeight: 600, display: "block", marginBottom: "4px" }}>
              Silver Rate per Tola (PKR)
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={silverTolaInput}
              onChange={(e) => setSilverTolaInput(e.target.value)}
              style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
            />
            <small style={{ color: "#64748b" }}>Nisab (52.5 Tola): {formatPkr((525n * currentRates.silverRatePerTolaPaisa) / 10n)}</small>
          </div>

          <div>
            <label style={{ fontSize: "12px", color: "#475569", fontWeight: 600, display: "block", marginBottom: "4px" }}>
              Gold Rate per Tola (PKR)
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={goldTolaInput}
              onChange={(e) => setGoldTolaInput(e.target.value)}
              style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
            />
            <small style={{ color: "#64748b" }}>Nisab (7.5 Tola): {formatPkr((75n * currentRates.goldRatePerTolaPaisa) / 10n)}</small>
          </div>

          <div>
            <label style={{ fontSize: "12px", color: "#475569", fontWeight: 600, display: "block", marginBottom: "4px" }}>
              Nisab Standard
            </label>
            <select
              value={nisabStandard}
              onChange={(e) => setNisabStandard(e.target.value as "silver" | "gold")}
              style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
            >
              <option value="silver">Silver Nisab (Recommended for Cash/Wallets)</option>
              <option value="gold">Gold Nisab (For Gold bullion/jewelry)</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: "12px", color: "#475569", fontWeight: 600, display: "block", marginBottom: "4px" }}>
              Stock Zakatable % (AAOIFI Standard)
            </label>
            <input
              type="number"
              min={0}
              max={100}
              value={stockPercentage}
              onChange={(e) => setStockPercentage(Number(e.target.value))}
              style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
            />
            <small style={{ color: "#64748b" }}>Exempts factory/fixed assets of listed companies</small>
          </div>
        </div>
      </section>

      {/* Distribution History */}
      <section className="dashboard-card" style={{ marginTop: "1.5rem" }}>
        <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h3>Zakat Distribution History</h3>
            <p className="card-caption">Record of verified Zakat payments given to eligible beneficiaries.</p>
          </div>
        </div>

        <div className="ledger-table-wrap" style={{ marginTop: "1rem" }}>
          <table className="ledger-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Beneficiary / Purpose</th>
                <th>Notes</th>
                <th style={{ textAlign: "right" }}>Amount (PKR)</th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", color: "#64748b", padding: "1.5rem" }}>
                    No Zakat payments logged yet. Click &quot;Record Zakat Payment&quot; above when you distribute Zakat.
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id}>
                    <td>{p.date}</td>
                    <td><strong>{p.recipient}</strong></td>
                    <td style={{ color: "#64748b" }}>{p.notes || "—"}</td>
                    <td style={{ textAlign: "right", color: "#059669", fontWeight: 700 }}>
                      {formatPkr(p.amountPaisa)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Record Payment Dialog */}
      {payDialogOpen && (
        <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setPayDialogOpen(false); }}>
          <section className="dialog-card" role="dialog" aria-modal="true">
            <div className="dialog-heading">
              <div>
                <p className="panel-kicker">Charitable Distribution</p>
                <h2>Record Zakat Payment</h2>
                <p>Log verified Zakat distributed to eligible recipients (Mustahiqeen).</p>
              </div>
              <button type="button" className="icon-button dialog-close" onClick={() => setPayDialogOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form className="entry-form" onSubmit={handleRecordPayment}>
              <label htmlFor="pay-amt">Amount Paid (PKR)</label>
              <div className="rupee-input">
                <span>Rs</span>
                <input
                  id="pay-amt"
                  type="text"
                  inputMode="decimal"
                  required
                  value={payAmountInput}
                  onChange={(e) => setPayAmountInput(e.target.value)}
                  placeholder="0.00"
                  autoFocus
                />
              </div>

              <label htmlFor="pay-recip">Beneficiary / Organization</label>
              <input
                id="pay-recip"
                type="text"
                required
                maxLength={80}
                value={payRecipient}
                onChange={(e) => setPayRecipient(e.target.value)}
                placeholder="e.g. Deserving student fee / SIUT / Shaukat Khanum"
              />

              <label htmlFor="pay-notes">Notes <span className="optional-label">Optional</span></label>
              <input
                id="pay-notes"
                type="text"
                maxLength={100}
                value={payNotes}
                onChange={(e) => setPayNotes(e.target.value)}
                placeholder="e.g. Paid in cash directly to family"
              />

              <div className="dialog-actions">
                <button type="button" className="outline-button" onClick={() => setPayDialogOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="primary-button">
                  Save Payment Record
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}


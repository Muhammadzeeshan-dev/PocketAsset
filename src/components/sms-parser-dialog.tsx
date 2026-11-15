"use client";

import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  Copy,
  CreditCard,
  LockKeyhole,
  MessageSquareText,
  Smartphone,
  Sparkles,
  Wallet,
  X,
} from "lucide-react";
import { formatPkr, type AccountType, type FinanceAccount, type FinanceTransaction } from "@/lib/finance";
import { parseTransactionSms, type ParsedSmsTransaction } from "@/lib/sms-parser";
import { queueOfflineTransaction, removePendingTransaction } from "@/lib/offline";

interface SmsParserDialogProps {
  accounts: FinanceAccount[];
  userId: string;
  supabase: SupabaseClient;
  onClose: () => void;
  onSaved: (message: string) => void;
}

export function SmsParserDialog({
  accounts,
  userId,
  supabase,
  onClose,
  onSaved,
}: SmsParserDialogProps) {
  const [smsText, setSmsText] = useState("");
  const [parsed, setParsed] = useState<ParsedSmsTransaction | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [customCategory, setCustomCategory] = useState<string>("");
  const [customDescription, setCustomDescription] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Sample templates for testing
  const SAMPLE_SMS = [
    {
      label: "JazzCash Send",
      text: "You have sent Rs. 450.00 to Ali Khan (03001234567) from your JazzCash Account. Remaining Balance: Rs. 2760.00. Fee: Rs. 0.00. TID: 9988776655.",
    },
    {
      label: "Easypaisa Paid",
      text: "Paid Rs. 1,250.00 to KFC Gulberg via Easypaisa. Trans ID: 12345678. Your new balance is Rs. 3,500.00.",
    },
    {
      label: "Meezan Bank Debit",
      text: "Dear Customer, PKR 3,200.00 debited from A/C 01010101 on 15-Nov-26 at SHELL PETROL PUMP. Avail Bal: PKR 14,800.00. Ref: MB991122",
    },
    {
      label: "JazzCash Receive",
      text: "Received Rs. 5,000.00 from Father (03129998888) in your JazzCash account. TID: 5544332211.",
    },
  ];

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

  // When text changes, parse
  useEffect(() => {
    if (!smsText.trim()) {
      setParsed(null);
      setError("");
      return;
    }

    const res = parseTransactionSms(smsText);
    setParsed(res);

    if (res) {
      // Find best matching account
      const matched = accounts.find((a) =>
        a.name.toLowerCase().includes(res.suggestedAccountNameHint.toLowerCase())
      ) || accounts.find((a) => a.account_type === res.suggestedAccountType) || accounts[0];

      if (matched) setSelectedAccountId(matched.id);
      setCustomCategory(res.suggestedCategory);
      setCustomDescription(`${res.transactionType === "income" ? "Received from" : "Paid to"} ${res.counterparty}`);
      setError("");
    } else if (smsText.trim().length > 20) {
      setError("Could not extract financial amounts. Please check if SMS contains PKR or Rs amounts.");
    }
  }, [smsText, accounts]);

  async function handleConfirmSave() {
    if (!parsed || !selectedAccountId) return;

    setBusy(true);
    setError("");

    try {
      const txId = typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `tx-sms-${Date.now()}`;

      const selectedAccount = accounts.find((a) => a.id === selectedAccountId);

      const transaction: FinanceTransaction = {
        id: txId,
        user_id: userId,
        account_id: selectedAccountId,
        transfer_to_account_id: null,
        transaction_type: parsed.transactionType,
        amount_paisa: parsed.amountPaisa.toString(),
        direction: parsed.direction,
        occurred_at: new Date().toISOString(),
        description: customDescription.trim() || `${parsed.transactionType === "income" ? "Received from" : "Paid to"} ${parsed.counterparty}`,
        category: customCategory || parsed.suggestedCategory,
        notes: parsed.notes,
      };

      if (typeof navigator !== "undefined" && !navigator.onLine) {
        await queueOfflineTransaction(userId, transaction);
        onSaved(`Saved offline: Rs. ${parsed.amountRupees} to ${selectedAccount?.name || "account"}.`);
        return;
      }

      const queued = await queueOfflineTransaction(userId, transaction).then(() => true).catch(() => false);
      const { error: insertError } = await supabase.from("transactions").insert(transaction);

      if (insertError) {
        throw new Error(insertError.message || "Failed to save transaction.");
      }

      if (queued) {
        await removePendingTransaction(userId, transaction.id).catch(() => undefined);
      }

      onSaved(`Logged Rs. ${parsed.amountRupees} to ${selectedAccount?.name || "account"} from SMS.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to record transaction.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section className="dialog-card" style={{ maxWidth: "560px" }} role="dialog" aria-modal="true">
        <div className="dialog-heading">
          <div>
            <p className="panel-kicker">Instant Transaction Extraction</p>
            <h2>Paste SMS or Bank Alert</h2>
            <p>Paste any JazzCash, Easypaisa, or bank SMS to log transactions in 1 second.</p>
          </div>
          <button type="button" className="icon-button dialog-close" aria-label="Close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: "16px 22px" }}>
          {/* Quick Sample Chips */}
          <div style={{ marginBottom: "12px" }}>
            <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 600, display: "block", marginBottom: "6px" }}>
              Try sample templates:
            </span>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {SAMPLE_SMS.map((sample, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSmsText(sample.text)}
                  style={{
                    fontSize: "11px",
                    padding: "4px 8px",
                    background: "#f1f5f9",
                    border: "1px solid #e2e8f0",
                    borderRadius: "6px",
                    cursor: "pointer",
                    color: "#334155",
                  }}
                >
                  {sample.label}
                </button>
              ))}
            </div>
          </div>

          <label htmlFor="sms-textarea" style={{ fontSize: "12px", fontWeight: 600, color: "#334155" }}>
            Paste SMS Text
          </label>
          <textarea
            id="sms-textarea"
            rows={3}
            value={smsText}
            onChange={(e) => setSmsText(e.target.value)}
            placeholder="Paste your 8558, 3737, or banking SMS message here..."
            style={{
              width: "100%",
              padding: "10px",
              fontSize: "13px",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              fontFamily: "inherit",
              marginBottom: "12px",
            }}
            autoFocus
          />

          {parsed && (
            <div
              style={{
                background: "#f8fafc",
                border: "1px solid #cbd5e1",
                borderRadius: "10px",
                padding: "14px",
                marginBottom: "14px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "#2563eb", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "4px" }}>
                  <Sparkles size={14} /> AI Parsed Transaction
                </span>
                <span
                  style={{
                    fontSize: "10px",
                    padding: "2px 8px",
                    borderRadius: "12px",
                    background: parsed.direction === "inflow" ? "#ecfdf5" : "#fef2f2",
                    color: parsed.direction === "inflow" ? "#065f46" : "#991b1b",
                    fontWeight: 700,
                  }}
                >
                  {parsed.direction === "inflow" ? "▲ Incoming (Income)" : "▼ Outgoing (Expense)"}
                </span>
              </div>

              <div style={{ display: "flex", alignItems: "baseline", gap: "6px", marginBottom: "12px" }}>
                <strong style={{ fontSize: "24px", color: parsed.direction === "inflow" ? "#16a34a" : "#dc2626" }}>
                  {parsed.direction === "inflow" ? `+Rs. ${parsed.amountRupees}` : `-Rs. ${parsed.amountRupees}`}
                </strong>
                <span style={{ fontSize: "12px", color: "#64748b" }}>from {parsed.suggestedAccountNameHint}</span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
                <div>
                  <label style={{ fontSize: "11px", color: "#64748b", display: "block" }}>Target Account</label>
                  <select
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                    style={{ width: "100%", padding: "6px 8px", fontSize: "12px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({formatPkr(a.current_balance_paisa ?? a.opening_balance_paisa)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: "11px", color: "#64748b", display: "block" }}>Category</label>
                  <input
                    type="text"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    style={{ width: "100%", padding: "6px 8px", fontSize: "12px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: "11px", color: "#64748b", display: "block" }}>Description</label>
                <input
                  type="text"
                  value={customDescription}
                  onChange={(e) => setCustomDescription(e.target.value)}
                  style={{ width: "100%", padding: "6px 8px", fontSize: "12px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                />
              </div>

              {parsed.remainingBalancePaisa !== null && (
                <div style={{ marginTop: "10px", fontSize: "11px", color: "#475569", background: "#f1f5f9", padding: "6px 10px", borderRadius: "6px" }}>
                  ℹ️ SMS reports remaining balance: <strong>{formatPkr(parsed.remainingBalancePaisa)}</strong>
                </div>
              )}
            </div>
          )}

          {error && <p className="form-alert error" role="alert">{error}</p>}

          <div className="dialog-actions">
            <button type="button" className="outline-button" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button
              type="button"
              className="primary-button"
              disabled={!parsed || busy}
              onClick={() => void handleConfirmSave()}
            >
              <CheckCircle2 size={15} />
              {busy ? "Saving to Ledger…" : "Save to Ledger"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}


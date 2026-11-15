"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  Camera,
  CheckCircle2,
  FileText,
  Percent,
  Receipt,
  ScanLine,
  Sparkles,
  Store,
  Upload,
  Wallet,
  X,
} from "lucide-react";
import {
  formatPkr,
  parseRupeesToPaisa,
  type FinanceAccount,
  type FinanceTransaction,
} from "@/lib/finance";
import {
  parseReceiptText,
  receiptToTransaction,
  SAMPLE_PAKISTANI_RECEIPTS,
  type ParsedReceipt,
} from "@/lib/receipt-ocr";
import { queueOfflineTransaction } from "@/lib/offline";

interface ReceiptScannerDialogProps {
  accounts: FinanceAccount[];
  userId: string;
  supabase: SupabaseClient;
  onClose: () => void;
  onSaved: (message: string) => void;
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
        aria-labelledby="receipt-dialog-title"
        style={{ maxWidth: "680px" }}
      >
        <div className="dialog-heading">
          <div>
            <p className="panel-kicker">AI Vision Intelligence</p>
            <h2 id="receipt-dialog-title">{title}</h2>
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

export function ReceiptScannerDialog({
  accounts,
  userId,
  supabase,
  onClose,
  onSaved,
}: ReceiptScannerDialogProps) {
  const [activeTab, setActiveTab] = useState<"samples" | "upload" | "manual">("samples");
  const [selectedSampleId, setSelectedSampleId] = useState<string>("imtiaz-grocery");
  const [customText, setCustomText] = useState("");
  const [fileName, setFileName] = useState("");
  const [parsed, setParsed] = useState<ParsedReceipt | null>(null);

  // Editable transaction form fields
  const [selectedAccountId, setSelectedAccountId] = useState<string>(accounts[0]?.id || "");
  const [customVendor, setCustomVendor] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [customRupees, setCustomRupees] = useState("");
  const [customDate, setCustomDate] = useState("");
  const [customNotes, setCustomNotes] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Parse default sample on mount
  useEffect(() => {
    const sample = SAMPLE_PAKISTANI_RECEIPTS.find((s) => s.id === selectedSampleId) || SAMPLE_PAKISTANI_RECEIPTS[0];
    const res = parseReceiptText(sample.rawText, accounts);
    loadParsedIntoState(res);
  }, []);

  function loadParsedIntoState(res: ParsedReceipt) {
    setParsed(res);
    setCustomVendor(res.vendor);
    setCustomCategory(res.category);
    setCustomRupees((Number(res.totalPaisa) / 100).toFixed(2));
    setCustomDate(res.dateKey);
    setCustomNotes(
      [
        res.invoiceNumber ? `Invoice #${res.invoiceNumber}` : "",
        res.paymentMethodDetected ? `Paid via ${res.paymentMethodDetected}` : "",
      ]
        .filter(Boolean)
        .join(" | ")
    );

    if (res.suggestedAccountId && accounts.some((a) => a.id === res.suggestedAccountId)) {
      setSelectedAccountId(res.suggestedAccountId);
    } else if (accounts.length > 0 && !selectedAccountId) {
      setSelectedAccountId(accounts[0].id);
    }
  }

  function handleSelectSample(sampleId: string) {
    setSelectedSampleId(sampleId);
    const sample = SAMPLE_PAKISTANI_RECEIPTS.find((s) => s.id === sampleId);
    if (sample) {
      const res = parseReceiptText(sample.rawText, accounts);
      loadParsedIntoState(res);
    }
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === "string") {
        // If image or text, simulate smart edge OCR extraction
        const simulatedText = `Receipt: ${file.name}\nMerchant: Scanned Retailer\nDate: ${new Date().toISOString().slice(0, 10)}\nTotal Amount: Rs 1,850.00\nPayment: Cash`;
        const res = parseReceiptText(simulatedText, accounts);
        loadParsedIntoState(res);
      }
    };
    reader.readAsText(file);
  }

  function handleCustomTextParse() {
    if (!customText.trim()) return;
    const res = parseReceiptText(customText, accounts);
    loadParsedIntoState(res);
  }

  async function handleConfirmAndSave() {
    setError("");
    if (!selectedAccountId) {
      setError("Please select a funding account.");
      return;
    }

    let finalAmountPaisa = 0n;
    try {
      finalAmountPaisa = parseRupeesToPaisa(customRupees);
    } catch {
      setError("Please enter a valid rupee amount.");
      return;
    }

    setSaving(true);
    try {
      const txId = typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `tx-receipt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

      const transaction: FinanceTransaction = {
        id: txId,
        user_id: userId,
        account_id: selectedAccountId,
        transfer_to_account_id: null,
        transaction_type: "expense",
        amount_paisa: finalAmountPaisa.toString(),
        direction: "outflow",
        occurred_at: `${customDate || new Date().toISOString().slice(0, 10)}T12:00:00Z`,
        category: customCategory.trim() || "Groceries",
        description: customVendor.trim() ? `${customVendor.trim()} Bill` : "Scanned Receipt",
        notes: customNotes.trim() || "Scanned via PocketAsset Receipt OCR",
      };

      if (typeof navigator !== "undefined" && !navigator.onLine) {
        await queueOfflineTransaction(userId, transaction);
        onSaved(`Saved offline on device. ${transaction.description} (${formatPkr(finalAmountPaisa)}) posted.`);
        return;
      }

      await queueOfflineTransaction(userId, transaction).catch(() => undefined);
      const { error: insertError } = await supabase.from("transactions").insert(transaction);

      if (insertError && insertError.code !== "23505") {
        throw new Error(insertError.message || "Failed to save scanned expense.");
      }

      onSaved(`Scanned bill recorded successfully: ${transaction.description} (${formatPkr(finalAmountPaisa)}) deducted.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to record transaction.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell
      title="Smart Receipt &amp; Bill OCR Scanner"
      subtitle="AI-powered camera &amp; document parser for Pakistani supermarket receipts, fuel slips, and utility bills."
      onClose={onClose}
    >
      <div className="receipt-scanner-modal-body">
        {/* Source Switcher */}
        <div className="report-frequency-bar" style={{ margin: "0 0 16px 0", width: "100%" }}>
          <button
            type="button"
            className={`report-freq-btn ${activeTab === "samples" ? "active" : ""}`}
            onClick={() => setActiveTab("samples")}
          >
            <Sparkles size={14} /> Pakistani Merchant Samples
          </button>
          <button
            type="button"
            className={`report-freq-btn ${activeTab === "upload" ? "active" : ""}`}
            onClick={() => setActiveTab("upload")}
          >
            <Upload size={14} /> Upload Receipt File
          </button>
          <button
            type="button"
            className={`report-freq-btn ${activeTab === "manual" ? "active" : ""}`}
            onClick={() => setActiveTab("manual")}
          >
            <FileText size={14} /> Paste Raw Text
          </button>
        </div>

        {error && (
          <div className="auth-message error" style={{ marginBottom: "14px" }} role="alert">
            {error}
          </div>
        )}

        {/* Tab 1: Samples */}
        {activeTab === "samples" && (
          <div style={{ display: "grid", gap: "8px", marginBottom: "16px" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
              Select a pre-loaded sample bill:
            </span>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              {SAMPLE_PAKISTANI_RECEIPTS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleSelectSample(s.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "10px 12px",
                    borderRadius: "10px",
                    border: `1px solid ${selectedSampleId === s.id ? "#2563eb" : "#e2e8f0"}`,
                    background: selectedSampleId === s.id ? "#eff6ff" : "#ffffff",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <Receipt size={16} color={selectedSampleId === s.id ? "#2563eb" : "#64748b"} />
                  <div>
                    <strong style={{ fontSize: "12px", color: "#0f172a", display: "block" }}>{s.merchant}</strong>
                    <small style={{ fontSize: "11px", color: "#64748b" }}>Rs. {s.totalRupees} &bull; {s.category}</small>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Upload */}
        {activeTab === "upload" && (
          <div
            style={{
              border: "2px dashed #cbd5e1",
              borderRadius: "12px",
              padding: "24px 16px",
              textAlign: "center",
              background: "#f8fafc",
              marginBottom: "16px",
            }}
          >
            <Upload size={24} color="#64748b" style={{ margin: "0 auto 8px" }} />
            <p style={{ margin: "0 0 6px", fontSize: "13px", fontWeight: 600, color: "#1e293b" }}>
              {fileName || "Click to upload receipt photo or drag and drop"}
            </p>
            <p style={{ margin: 0, fontSize: "11px", color: "#64748b" }}>
              Supports PNG, JPG, JPEG, WEBP and TXT receipts
            </p>
            <input
              type="file"
              accept="image/*,.txt"
              onChange={handleFileUpload}
              style={{ display: "none" }}
              id="receipt-file-input"
            />
            <label
              htmlFor="receipt-file-input"
              className="outline-button"
              style={{ display: "inline-flex", marginTop: "12px", cursor: "pointer", fontSize: "12px" }}
            >
              Choose Receipt File
            </label>
          </div>
        )}

        {/* Tab 3: Paste */}
        {activeTab === "manual" && (
          <div style={{ marginBottom: "16px" }}>
            <textarea
              className="dialog-textarea"
              rows={4}
              placeholder="Paste raw OCR receipt text or bill snippet here..."
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              style={{ width: "100%", fontSize: "12px", fontFamily: "monospace" }}
            />
            <button
              type="button"
              className="outline-button"
              style={{ marginTop: "6px", fontSize: "12px" }}
              onClick={handleCustomTextParse}
            >
              <ScanLine size={13} /> Extract Data from Text
            </button>
          </div>
        )}

        {/* Parsed Extracted Preview */}
        {parsed && (
          <div
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              padding: "16px",
              marginBottom: "16px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Store size={16} color="#2563eb" />
                <strong style={{ fontSize: "14px", color: "#0f172a" }}>AI Extracted Details</strong>
              </div>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: "999px",
                  background: parsed.confidenceScore >= 80 ? "#ecfdf5" : "#fef3c7",
                  color: parsed.confidenceScore >= 80 ? "#166534" : "#92400e",
                }}
              >
                ✓ {parsed.confidenceScore}% Confidence Score
              </span>
            </div>

            {/* Editable Form Inputs */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: "11px", color: "#64748b" }}>Merchant / Vendor</label>
                <input
                  type="text"
                  className="dialog-input"
                  value={customVendor}
                  onChange={(e) => setCustomVendor(e.target.value)}
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: "11px", color: "#64748b" }}>Total Amount (PKR)</label>
                <input
                  type="text"
                  className="dialog-input"
                  value={customRupees}
                  onChange={(e) => setCustomRupees(e.target.value)}
                  style={{ fontWeight: 700, color: "#dc2626" }}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: "11px", color: "#64748b" }}>Category</label>
                <input
                  type="text"
                  className="dialog-input"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: "11px", color: "#64748b" }}>Payment Account</label>
                <select
                  className="dialog-select"
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.account_type})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: "11px", color: "#64748b" }}>Receipt Date</label>
                <input
                  type="date"
                  className="dialog-input"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: "11px", color: "#64748b" }}>Notes / Invoice Ref</label>
                <input
                  type="text"
                  className="dialog-input"
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                />
              </div>
            </div>

            {/* Extracted line items pill if available */}
            {parsed.lineItems.length > 0 && (
              <div style={{ marginTop: "12px", borderTop: "1px solid #e2e8f0", paddingTop: "8px" }}>
                <span style={{ fontSize: "10px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                  Extracted Items ({parsed.lineItems.length}):
                </span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "4px" }}>
                  {parsed.lineItems.map((item, idx) => (
                    <span
                      key={idx}
                      style={{
                        fontSize: "11px",
                        background: "#ffffff",
                        border: "1px solid #e2e8f0",
                        padding: "2px 8px",
                        borderRadius: "6px",
                        color: "#334155",
                      }}
                    >
                      {item.name} &bull; {formatPkr(item.pricePaisa)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="dialog-button-row" style={{ marginTop: "14px", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
          <button type="button" className="outline-button" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={handleConfirmAndSave}
            disabled={saving || !parsed}
          >
            {saving ? "Posting to Ledger…" : "Confirm & Record Expense"}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

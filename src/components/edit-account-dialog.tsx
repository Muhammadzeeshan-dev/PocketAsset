"use client";

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  AlertCircle,
  CheckCircle2,
  LockKeyhole,
  Scale,
  SlidersHorizontal,
  X,
} from "lucide-react";
import {
  accountTypeLabel,
  formatPkr,
  getPakistanDateKey,
  parseRupeesToPaisa,
  type AccountType,
  type FinanceAccount,
  type FinanceTransaction,
} from "@/lib/finance";
import { queueOfflineTransaction, removePendingTransaction } from "@/lib/offline";

export interface EditAccountDialogProps {
  account: FinanceAccount;
  currentBalance: bigint;
  userId: string;
  supabase: SupabaseClient;
  onClose: () => void;
  onUpdated: (message: string) => void;
}

function AccountModalShell({
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
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="dialog-card" role="dialog" aria-modal="true" aria-labelledby="edit-dialog-title">
        <div className="dialog-heading">
          <div>
            <p className="panel-kicker">PocketAsset Ledger</p>
            <h2 id="edit-dialog-title">{title}</h2>
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

export function EditAccountDialog({
  account,
  currentBalance,
  userId,
  supabase,
  onClose,
  onUpdated,
}: EditAccountDialogProps) {
  const [activeTab, setActiveTab] = useState<"reconcile" | "details">("reconcile");

  // Reconcile Form State
  const initialActualStr = (Number(currentBalance) / 100).toFixed(2);
  const [actualRupees, setActualRupees] = useState(initialActualStr);
  const [adjustmentDate, setAdjustmentDate] = useState(() => getPakistanDateKey(new Date()));
  const [adjustmentReason, setAdjustmentReason] = useState("Cash audit / balance reconciliation");

  // Details Form State
  const [name, setName] = useState(account.name);
  const [accountType, setAccountType] = useState<AccountType>(account.account_type);
  const initialOpeningStr = (Number(account.opening_balance_paisa) / 100).toFixed(2);
  const [openingRupees, setOpeningRupees] = useState(initialOpeningStr);
  const [isActive, setIsActive] = useState(account.is_active);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Calculate live delta
  const parsedActualPaisa = useMemo(() => {
    try {
      const clean = actualRupees.trim();
      if (!clean) return null;
      return parseRupeesToPaisa(clean);
    } catch {
      return null;
    }
  }, [actualRupees]);

  const differencePaisa = parsedActualPaisa !== null ? parsedActualPaisa - currentBalance : null;

  async function handleReconcileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (parsedActualPaisa === null) {
      setError("Please enter a valid rupee amount (e.g. 5000 or 12500.50).");
      return;
    }

    if (differencePaisa === 0n) {
      onUpdated(`Balance for ${account.name} already matches (${formatPkr(currentBalance)}). No adjustment needed.`);
      return;
    }

    setBusy(true);
    try {
      const delta = differencePaisa!;
      const absAmount = delta > 0n ? delta : -delta;
      const direction = delta > 0n ? "inflow" : "outflow";

      const txId = typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `tx-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

      const transaction: FinanceTransaction = {
        id: txId,
        user_id: userId,
        account_id: account.id,
        transfer_to_account_id: null,
        transaction_type: "adjustment",
        amount_paisa: absAmount.toString(),
        direction,
        occurred_at: `${adjustmentDate}T12:00:00Z`,
        description: `Balance adjustment: ${account.name}`,
        category: "Adjustment",
        notes: adjustmentReason.trim() || `Reconciled balance from ${formatPkr(currentBalance)} to ${formatPkr(parsedActualPaisa)}`,
      };

      let queuedLocally = false;
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        await queueOfflineTransaction(userId, transaction);
        onUpdated(`Saved offline on device. ${account.name} balance adjusted to ${formatPkr(parsedActualPaisa)}.`);
        return;
      }

      queuedLocally = await queueOfflineTransaction(userId, transaction).then(() => true).catch(() => false);
      const { error: insertError } = await supabase.from("transactions").insert(transaction);

      if (insertError) {
        if (insertError.code === "23505") {
          const { data } = await supabase.from("transactions").select("id").eq("id", transaction.id).maybeSingle();
          if (data) {
            await removePendingTransaction(userId, transaction.id).catch(() => undefined);
            onUpdated(`Adjusted ${account.name} balance to ${formatPkr(parsedActualPaisa)}.`);
            return;
          }
        }
        const errMsg = insertError.message || (insertError as any).details || (insertError as any).hint || "Failed to record balance adjustment.";
        throw new Error(errMsg);
      }

      if (queuedLocally) {
        await removePendingTransaction(userId, transaction.id).catch(() => undefined);
      }

      onUpdated(`Adjusted ${account.name} balance to ${formatPkr(parsedActualPaisa)}. All views updated.`);
    } catch (caught) {
      const msg = caught instanceof Error ? caught.message : typeof caught === "string" ? caught : "Failed to record balance adjustment.";
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  async function handleDetailsSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Please enter an account name.");
      return;
    }

    let openingPaisa: bigint;
    try {
      const cleanOpening = openingRupees.trim();
      openingPaisa = cleanOpening === "" || cleanOpening === "0" || cleanOpening === "0.00"
        ? 0n
        : parseRupeesToPaisa(cleanOpening);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Please enter a valid starting opening balance.");
      return;
    }

    setBusy(true);
    try {
      const { error: updateError } = await supabase
        .from("accounts")
        .update({
          name: trimmedName,
          account_type: accountType,
          opening_balance_paisa: openingPaisa.toString(),
          is_active: isActive,
        })
        .eq("id", account.id);

      if (updateError) {
        const errMsg = updateError.message || (updateError as any).details || (updateError as any).hint || "Failed to update account details.";
        throw new Error(errMsg);
      }

      onUpdated(`Account "${trimmedName}" settings updated successfully.`);
    } catch (caught) {
      const msg = caught instanceof Error ? caught.message : typeof caught === "string" ? caught : "Failed to update account details.";
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AccountModalShell
      title={`Edit ${account.name}`}
      subtitle="Reconcile unrecorded days or edit account name, type, and opening balance."
      onClose={onClose}
    >
      <div style={{ padding: "0 22px" }}>
        {/* Navigation Tabs */}
        <div
          style={{
            display: "flex",
            gap: "8px",
            marginTop: "14px",
            marginBottom: "14px",
            padding: "4px",
            background: "#f1f5f9",
            borderRadius: "10px",
          }}
        >
          <button
            type="button"
            onClick={() => {
              setActiveTab("reconcile");
              setError("");
            }}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              padding: "8px 12px",
              fontSize: "12px",
              fontWeight: 650,
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
              background: activeTab === "reconcile" ? "#ffffff" : "transparent",
              color: activeTab === "reconcile" ? "#2563eb" : "#64748b",
              boxShadow: activeTab === "reconcile" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              transition: "all 0.15s ease",
            }}
          >
            <Scale size={14} /> Reconcile Balance
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("details");
              setError("");
            }}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              padding: "8px 12px",
              fontSize: "12px",
              fontWeight: 650,
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
              background: activeTab === "details" ? "#ffffff" : "transparent",
              color: activeTab === "details" ? "#2563eb" : "#64748b",
              boxShadow: activeTab === "details" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              transition: "all 0.15s ease",
            }}
          >
            <SlidersHorizontal size={14} /> Account Details
          </button>
        </div>

        {activeTab === "reconcile" ? (
          <form className="entry-form" onSubmit={(e) => void handleReconcileSubmit(e)}>
            <div
              style={{
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "10px",
                padding: "12px 14px",
                marginBottom: "12px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "4px",
                }}
              >
                <span
                  style={{
                    fontSize: "11px",
                    color: "#64748b",
                    textTransform: "uppercase",
                    fontWeight: 700,
                    letterSpacing: "0.5px",
                  }}
                >
                  System Recorded Balance
                </span>
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 600,
                    color: "#2563eb",
                    background: "#eff6ff",
                    padding: "2px 8px",
                    borderRadius: "12px",
                  }}
                >
                  {accountTypeLabel[account.account_type] ?? "Account"}
                </span>
              </div>
              <strong style={{ fontSize: "20px", color: "#0f172a", letterSpacing: "-0.5px" }}>
                {formatPkr(currentBalance)}
              </strong>
            </div>

            <label htmlFor="actual-balance-input">
              Actual Counted Balance (PKR)
              <span className="optional-label" style={{ color: "#2563eb", fontWeight: 600 }}>
                Enter total cash/wallet amount you have right now
              </span>
            </label>
            <div className="rupee-input">
              <span>Rs</span>
              <input
                id="actual-balance-input"
                type="text"
                inputMode="decimal"
                required
                value={actualRupees}
                onChange={(e) => setActualRupees(e.target.value)}
                placeholder="0.00"
                autoFocus
              />
            </div>

            {differencePaisa !== null && (
              <div
                style={{
                  marginTop: "10px",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  fontSize: "12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background:
                    differencePaisa > 0n
                      ? "#ecfdf5"
                      : differencePaisa < 0n
                      ? "#fef2f2"
                      : "#f8fafc",
                  border: `1px solid ${
                    differencePaisa > 0n
                      ? "#a7f3d0"
                      : differencePaisa < 0n
                      ? "#fecaca"
                      : "#e2e8f0"
                  }`,
                  color:
                    differencePaisa > 0n
                      ? "#065f46"
                      : differencePaisa < 0n
                      ? "#991b1b"
                      : "#475569",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    {differencePaisa > 0n ? (
                      <CheckCircle2 size={15} style={{ color: "#10b981" }} />
                    ) : differencePaisa < 0n ? (
                      <AlertCircle size={15} style={{ color: "#ef4444" }} />
                    ) : (
                      <CheckCircle2 size={15} style={{ color: "#64748b" }} />
                    )}
                    <strong>
                      {differencePaisa > 0n
                        ? "▲ Net Inflow Adjustment"
                        : differencePaisa < 0n
                        ? "▼ Net Outflow Adjustment"
                        : "● Balances Match Exactly"}
                    </strong>
                  </div>
                  <div style={{ fontSize: "11px", marginTop: "2px", opacity: 0.9 }}>
                    {differencePaisa > 0n
                      ? "Unrecorded receipts/cash will be credited to this account."
                      : differencePaisa < 0n
                      ? "Unrecorded spending will be debited from this account."
                      : "No adjustments will be added to the ledger."}
                  </div>
                </div>
                <strong style={{ fontSize: "14px", whiteSpace: "nowrap" }}>
                  {differencePaisa > 0n
                    ? `+${formatPkr(differencePaisa)}`
                    : differencePaisa < 0n
                    ? `-${formatPkr(-differencePaisa)}`
                    : "Rs. 0"}
                </strong>
              </div>
            )}

            <div className="form-two-columns" style={{ marginTop: "12px" }}>
              <div>
                <label htmlFor="adj-date">Adjustment Date</label>
                <input
                  id="adj-date"
                  type="date"
                  required
                  value={adjustmentDate}
                  onChange={(e) => setAdjustmentDate(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="adj-reason">Audit Note / Reason</label>
                <input
                  id="adj-reason"
                  type="text"
                  maxLength={100}
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  placeholder="e.g. Forgot to log expenses"
                />
              </div>
            </div>

            <div className="dialog-footnote">
              <LockKeyhole size={14} />
              <span>
                Double-entry adjustment keeps your ledger mathematically sound without altering past receipts.
              </span>
            </div>

            {error && <p className="form-alert error" role="alert">{error}</p>}

            <div className="dialog-actions">
              <button type="button" className="outline-button" onClick={onClose} disabled={busy}>
                Cancel
              </button>
              <button type="submit" className="primary-button" disabled={busy}>
                {busy ? "Applying…" : "Apply Balance Adjustment"}
              </button>
            </div>
          </form>
        ) : (
          <form className="entry-form" onSubmit={(e) => void handleDetailsSubmit(e)}>
            <label htmlFor="edit-name-input">Account Name</label>
            <input
              id="edit-name-input"
              required
              maxLength={80}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Cash in hand, JazzCash, Easypaisa, Meezan Bank"
              autoFocus
            />

            <div className="form-two-columns" style={{ marginTop: "10px" }}>
              <div>
                <label htmlFor="edit-type-select">Account Type</label>
                <select
                  id="edit-type-select"
                  value={accountType}
                  onChange={(e) => setAccountType(e.target.value as AccountType)}
                >
                  {Object.entries(accountTypeLabel).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="edit-opening-input">Opening Balance (PKR)</label>
                <div className="rupee-input">
                  <span>Rs</span>
                  <input
                    id="edit-opening-input"
                    inputMode="decimal"
                    value={openingRupees}
                    onChange={(e) => setOpeningRupees(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            <div style={{ marginTop: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
              <input
                id="edit-active-check"
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                style={{ width: "16px", height: "16px", accentColor: "#2563eb", cursor: "pointer" }}
              />
              <label
                htmlFor="edit-active-check"
                style={{ margin: 0, fontSize: "12px", cursor: "pointer", color: "#334155", fontWeight: 500 }}
              >
                Active account (available for daily income, expenses, and transfers)
              </label>
            </div>

            <div className="dialog-footnote">
              <LockKeyhole size={14} />
              <span>
                Opening balance represents initial capital and never counts as taxable or earned income.
              </span>
            </div>

            {error && <p className="form-alert error" role="alert">{error}</p>}

            <div className="dialog-actions">
              <button type="button" className="outline-button" onClick={onClose} disabled={busy}>
                Cancel
              </button>
              <button type="submit" className="primary-button" disabled={busy}>
                {busy ? "Saving…" : "Save Account Details"}
              </button>
            </div>
          </form>
        )}
      </div>
    </AccountModalShell>
  );
}


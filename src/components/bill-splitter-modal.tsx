"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  Check,
  CheckCircle2,
  Copy,
  MessageCircle,
  Plus,
  Share2,
  Trash2,
  UserCheck,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { formatPkr, parseRupeesToPaisa } from "@/lib/finance";
import {
  createSplitBill,
  generateWhatsAppReminderMessage,
  type SplitBillGroup,
  type SplitParticipant,
} from "@/lib/bill-splitter";

interface BillSplitterModalProps {
  onClose: () => void;
  onLogReimbursement?: (amountPaisa: bigint, description: string) => void;
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
        aria-labelledby="splitter-dialog-title"
        style={{ maxWidth: "640px", maxHeight: "min(92vh, 820px)" }}
      >
        <div className="dialog-heading">
          <div>
            <p className="panel-kicker">Social Finance &bull; Qarz-e-Hasana</p>
            <h2 id="splitter-dialog-title">{title}</h2>
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

export function BillSplitterModal({
  onClose,
  onLogReimbursement,
}: BillSplitterModalProps) {
  const [billTitle, setBillTitle] = useState("Dinner with Friends");
  const [totalAmount, setTotalAmount] = useState("3600");
  const [paymentDetails, setPaymentDetails] = useState("JazzCash / Easypaisa on 0300-1234567");
  const [includeSelf, setIncludeSelf] = useState(true);
  const [participants, setParticipants] = useState<string[]>([
    "Hamza",
    "Ali",
    "Zubair",
  ]);
  const [newParticipantName, setNewParticipantName] = useState("");
  const [billGroup, setBillGroup] = useState<SplitBillGroup | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Recalculate bill whenever inputs change
  useEffect(() => {
    try {
      const activeNames = participants.map((p) => p.trim()).filter(Boolean);
      if (activeNames.length > 0 || includeSelf) {
        const bg = createSplitBill(
          billTitle || "Bill",
          totalAmount || "0",
          activeNames,
          includeSelf
        );
        setBillGroup(bg);
      } else {
        setBillGroup(null);
      }
    } catch {
      setBillGroup(null);
    }
  }, [billTitle, totalAmount, participants, includeSelf]);

  function handleAddParticipant() {
    const trimmed = newParticipantName.trim();
    if (trimmed && !participants.includes(trimmed)) {
      setParticipants([...participants, trimmed]);
      setNewParticipantName("");
    }
  }

  function handleRemoveParticipant(index: number) {
    setParticipants(participants.filter((_, i) => i !== index));
  }

  function handleTogglePaid(participantId: string) {
    if (!billGroup) return;
    const updated = {
      ...billGroup,
      participants: billGroup.participants.map((p) =>
        p.id === participantId ? { ...p, hasPaid: !p.hasPaid } : p
      ),
    };
    setBillGroup(updated);
  }

  function handleCopyReminder(participant: SplitParticipant) {
    if (!billGroup) return;
    const msg = generateWhatsAppReminderMessage(billGroup, participant, paymentDetails);
    navigator.clipboard.writeText(msg).then(() => {
      setCopiedId(participant.id);
      setTimeout(() => setCopiedId(null), 2500);
    });
  }

  const collectedPaisa = billGroup
    ? billGroup.participants
        .filter((p) => p.hasPaid)
        .reduce((sum, p) => sum + p.sharePaisa, 0n)
    : 0n;

  const totalPaisa = billGroup ? billGroup.totalPaisa : 0n;
  const pendingPaisa = totalPaisa > collectedPaisa ? totalPaisa - collectedPaisa : 0n;

  return (
    <ModalShell
      title="Smart Bill Splitter &amp; Qarz Tracker"
      subtitle="Split dining, rent, or fuel bills equally down to the single paisa and copy ready-to-send WhatsApp reminders."
      onClose={onClose}
    >
      <div className="dialog-scroll-body" style={{ maxHeight: "75vh", overflowY: "auto", padding: "4px 2px 16px" }}>
        {/* Bill Configuration Form */}
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "12px", marginBottom: "14px" }}>
          <div>
            <label className="field-label" style={{ fontSize: "11px", fontWeight: "700" }}>Bill Description / Title</label>
            <input
              type="text"
              className="text-input"
              value={billTitle}
              onChange={(e) => setBillTitle(e.target.value)}
              placeholder="e.g. Dinner at Monal, Office Lunch"
            />
          </div>
          <div>
            <label className="field-label" style={{ fontSize: "11px", fontWeight: "700" }}>Total Bill (PKR)</label>
            <input
              type="number"
              className="text-input"
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
              placeholder="e.g. 3600"
              min="1"
            />
          </div>
        </div>

        <div style={{ marginBottom: "16px" }}>
          <label className="field-label" style={{ fontSize: "11px", fontWeight: "700" }}>
            Your Payment Receive Details (For WhatsApp reminder)
          </label>
          <input
            type="text"
            className="text-input"
            value={paymentDetails}
            onChange={(e) => setPaymentDetails(e.target.value)}
            placeholder="e.g. JazzCash on 0300-1234567 / Meezan IBAN PK..."
          />
        </div>

        {/* Participant Management */}
        <div style={{ marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
            <span style={{ fontSize: "12px", fontWeight: "700", color: "#0f172a" }}>Friends Sharing This Bill</span>
            <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#475569", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={includeSelf}
                onChange={(e) => setIncludeSelf(e.target.checked)}
              />
              Include my share ({includeSelf ? "Yes" : "No"})
            </label>
          </div>

          <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
            <input
              type="text"
              className="text-input"
              value={newParticipantName}
              onChange={(e) => setNewParticipantName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddParticipant();
                }
              }}
              placeholder="Add friend's name (e.g. Bilal) and press Enter"
              style={{ flex: 1 }}
            />
            <button
              type="button"
              className="outline-button"
              onClick={handleAddParticipant}
            >
              <Plus size={14} /> Add
            </button>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {participants.map((name, idx) => (
              <span
                key={idx}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "4px 10px",
                  borderRadius: "999px",
                  background: "#f1f5f9",
                  fontSize: "12px",
                  color: "#334155",
                  fontWeight: "600",
                }}
              >
                {name}
                <button
                  type="button"
                  onClick={() => handleRemoveParticipant(idx)}
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: "#94a3b8",
                    display: "flex",
                    alignItems: "center",
                    padding: 0,
                  }}
                  title="Remove"
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Live Calculation Cards */}
        {billGroup && (
          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "16px", marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
              <div>
                <span style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: "700" }}>Total Split</span>
                <div style={{ fontSize: "20px", fontWeight: "800", color: "#0f172a" }}>
                  {formatPkr(totalPaisa)}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: "700" }}>Pending to Collect</span>
                <div style={{ fontSize: "20px", fontWeight: "800", color: pendingPaisa > 0n ? "#dc2626" : "#059669" }}>
                  {formatPkr(pendingPaisa)}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {billGroup.participants.map((participant) => (
                <div
                  key={participant.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 14px",
                    borderRadius: "10px",
                    background: participant.hasPaid ? "#ecfdf5" : "#ffffff",
                    border: participant.hasPaid ? "1px solid #a7f3d0" : "1px solid #e2e8f0",
                    transition: "all 0.15s ease",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <input
                      type="checkbox"
                      checked={participant.hasPaid}
                      onChange={() => handleTogglePaid(participant.id)}
                      title="Mark as Paid"
                      style={{ cursor: "pointer", width: "16px", height: "16px" }}
                    />
                    <div>
                      <strong style={{ fontSize: "13px", color: "#0f172a", display: "block" }}>
                        {participant.name}
                      </strong>
                      <span style={{ fontSize: "11px", color: participant.hasPaid ? "#059669" : "#64748b", fontWeight: "500" }}>
                        {participant.hasPaid ? "Paid / Settled ✓" : "Pending payment"}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ textAlign: "right" }}>
                      <strong style={{ fontSize: "14px", color: "#0f172a" }}>
                        {formatPkr(participant.sharePaisa)}
                      </strong>
                    </div>

                    {participant.id !== "self" && (
                      <button
                        type="button"
                        onClick={() => handleCopyReminder(participant)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "5px",
                          padding: "5px 10px",
                          borderRadius: "6px",
                          border: "1px solid #cbd5e1",
                          background: copiedId === participant.id ? "#10b981" : "#ffffff",
                          color: copiedId === participant.id ? "#ffffff" : "#0f172a",
                          fontSize: "11px",
                          fontWeight: "600",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                        title="Copy formatted WhatsApp reminder message"
                      >
                        {copiedId === participant.id ? <Check size={12} /> : <MessageCircle size={12} />}
                        {copiedId === participant.id ? "Copied!" : "WhatsApp"}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
          <button
            type="button"
            className="secondary-button"
            onClick={onClose}
          >
            Done
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

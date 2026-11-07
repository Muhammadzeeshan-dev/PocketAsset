"use client";

import { useEffect } from "react";
import { AlertTriangle, Clock, LogOut, RefreshCw } from "lucide-react";

type SessionWarningModalProps = {
  isOpen: boolean;
  secondsRemaining: number;
  onExtend: () => void;
  onLogout: () => void;
  isExtending?: boolean;
};

export function SessionWarningModal({
  isOpen,
  secondsRemaining,
  onExtend,
  onLogout,
  isExtending = false,
}: SessionWarningModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add("modal-open");
    } else {
      document.body.classList.remove("modal-open");
    }
    return () => {
      document.body.classList.remove("modal-open");
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Format seconds into MM:SS format
  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const formattedTime = `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;

  const isUrgent = secondsRemaining <= 15;

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-warning-title"
      style={{
        zIndex: 9999,
        backgroundColor: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        className="modal-card"
        style={{
          maxWidth: "460px",
          border: isUrgent ? "1px solid #f87171" : "1px solid #e2e8f0",
          boxShadow: isUrgent
            ? "0 20px 45px -10px rgba(220, 38, 38, 0.25)"
            : "0 20px 45px -10px rgba(15, 23, 42, 0.2)",
        }}
      >
        <div
          className="modal-header"
          style={{
            background: isUrgent ? "#fff1f2" : "#f8fafc",
            borderBottom: isUrgent ? "1px solid #fecdd3" : "1px solid #f1f5f9",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: isUrgent ? "#ffe4e6" : "#fef3c7",
                color: isUrgent ? "#e11d48" : "#d97706",
                display: "grid",
                placeItems: "center",
              }}
            >
              {isUrgent ? <AlertTriangle size={20} /> : <Clock size={20} />}
            </div>
            <h3 id="session-warning-title" style={{ fontSize: "17px", margin: 0 }}>
              Are you still there?
            </h3>
          </div>
        </div>

        <div style={{ padding: "24px 24px 16px" }}>
          <p
            style={{
              fontSize: "14px",
              lineHeight: 1.6,
              color: "#334155",
              margin: "0 0 20px 0",
            }}
          >
            Your session is about to expire due to inactivity. Would you like to continue?
          </p>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 18px",
              borderRadius: "10px",
              background: isUrgent ? "#fef2f2" : "#f1f5f9",
              border: isUrgent ? "1px solid #fecaca" : "1px solid #e2e8f0",
              marginBottom: "8px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Clock
                size={16}
                style={{
                  color: isUrgent ? "#dc2626" : "#64748b",
                  animation: isUrgent ? "pulse 1s infinite" : "none",
                }}
              />
              <span
                style={{
                  fontSize: "13px",
                  fontWeight: 500,
                  color: isUrgent ? "#991b1b" : "#475569",
                }}
              >
                Automatic logout in:
              </span>
            </div>
            <span
              style={{
                fontFamily: "var(--font-mono, monospace)",
                fontSize: "18px",
                fontWeight: 700,
                color: isUrgent ? "#dc2626" : "#0f172a",
                letterSpacing: "1px",
              }}
            >
              {formattedTime}
            </span>
          </div>

          <div
            style={{
              height: "4px",
              borderRadius: "2px",
              background: "#e2e8f0",
              overflow: "hidden",
              margin: "12px 0 20px",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${Math.min(100, Math.max(0, (secondsRemaining / 60) * 100))}%`,
                background: isUrgent ? "#ef4444" : "#2563eb",
                transition: "width 1s linear, background-color .3s ease",
              }}
            />
          </div>
        </div>

        <div
          className="modal-actions"
          style={{
            padding: "16px 24px",
            display: "flex",
            justifyContent: "flex-end",
            gap: "12px",
            background: "#fafafa",
            borderTop: "1px solid #f1f5f9",
            margin: 0,
          }}
        >
          <button
            type="button"
            className="secondary-button"
            onClick={onLogout}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "9px 16px",
              fontSize: "13px",
            }}
          >
            <LogOut size={14} />
            Cancel / Logout
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={onExtend}
            disabled={isExtending}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "9px 20px",
              fontSize: "13px",
              fontWeight: 600,
            }}
          >
            {isExtending ? (
              <>
                <RefreshCw size={14} className="loading-spinner small" />
                Extending…
              </>
            ) : (
              "Extend Session"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}


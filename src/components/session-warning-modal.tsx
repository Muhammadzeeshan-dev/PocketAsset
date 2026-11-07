"use client";

import { useEffect, useCallback } from "react";
import { CheckCircle2, Lock, LogOut, RefreshCw, ShieldAlert } from "lucide-react";

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
  // Prevent background scrolling while modal is visible
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

  // Keyboard accessibility: Enter or Space to stay active, Escape to logout
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") {
        e.preventDefault();
        onLogout();
      } else if (e.key === "Enter" || e.key === " ") {
        const target = e.target as HTMLElement | null;
        if (!target || target.id === "extend-session-btn" || target.tagName.toLowerCase() !== "button") {
          e.preventDefault();
          onExtend();
        }
      }
    },
    [isOpen, onExtend, onLogout]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (!isOpen) return null;

  const isUrgent = secondsRemaining <= 15;
  const isWarning = secondsRemaining <= 30;

  // SVG Circular countdown geometry
  const radius = 52;
  const circumference = 2 * Math.PI * radius; // ~326.73
  const strokeDashoffset = circumference * (1 - Math.max(0, Math.min(60, secondsRemaining)) / 60);

  const ringStroke = isUrgent ? "#ef4444" : isWarning ? "#f59e0b" : "#2563eb";

  return (
    <div
      className="session-idle-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-warning-title"
    >
      <div className={`session-idle-card ${isUrgent ? "urgent" : ""}`}>
        {/* Header with Security Beacon */}
        <div className={`session-idle-header ${isUrgent ? "urgent" : ""}`}>
          <div className={`idle-badge ${isUrgent ? "urgent" : ""}`}>
            <span className="idle-badge-dot" />
            {isUrgent ? "URGENT LOGOUT IMMINENT" : "SESSION INACTIVITY GUARD"}
          </div>
          <div style={{ color: isUrgent ? "#dc2626" : "#64748b" }}>
            {isUrgent ? <ShieldAlert size={18} /> : <Lock size={18} />}
          </div>
        </div>

        {/* Modal Body with Animated Circular Countdown */}
        <div className="session-idle-body">
          <div className="idle-timer-ring-wrap">
            <svg
              className="idle-timer-svg"
              width="124"
              height="124"
              viewBox="0 0 124 124"
              aria-hidden="true"
            >
              {/* Background track circle */}
              <circle
                className="idle-timer-bg-circle"
                cx="62"
                cy="62"
                r={radius}
              />
              {/* Dynamic countdown progress circle */}
              <circle
                className="idle-timer-progress-circle"
                cx="62"
                cy="62"
                r={radius}
                stroke={ringStroke}
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
              />
            </svg>

            <div className="idle-timer-center">
              <span className={`idle-timer-sec ${isUrgent ? "urgent" : ""}`}>
                {secondsRemaining}s
              </span>
              <span className="idle-timer-label">Auto-Logout</span>
            </div>
          </div>

          <h3 id="session-warning-title" className="idle-title">
            Are you still here?
          </h3>
          <p className="idle-desc">
            PocketAsset detected <strong>10 seconds of inactivity</strong>. To protect your private financial accounts, ledgers, and net worth, you will be automatically logged out in <strong>{secondsRemaining} seconds</strong>.
          </p>

          <div className="idle-actions-col">
            <button
              id="extend-session-btn"
              type="button"
              className={`idle-btn-stay ${isUrgent ? "urgent" : ""}`}
              onClick={onExtend}
              disabled={isExtending}
              autoFocus
            >
              {isExtending ? (
                <>
                  <RefreshCw size={16} className="spin" />
                  Extending Session…
                </>
              ) : (
                <>
                  <CheckCircle2 size={18} />
                  I&apos;m Still Here • Keep Me Signed In
                </>
              )}
            </button>

            <button
              type="button"
              className="idle-btn-logout"
              onClick={onLogout}
            >
              <LogOut size={14} />
              Sign Out Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useCallback } from "react";
import { CheckCircle2, Clock, LogOut, RefreshCw, ShieldAlert, Zap } from "lucide-react";

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
  // Prevent background scrolling while modal is open
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
  const radius = 54;
  const circumference = 2 * Math.PI * radius; // ~339.29
  const strokeDashoffset = circumference * (1 - Math.max(0, Math.min(60, secondsRemaining)) / 60);

  const ringStroke = isUrgent ? "#ef4444" : isWarning ? "#f59e0b" : "#38bdf8";

  return (
    <div
      className="session-idle-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-idle-title"
    >
      <div className={`session-idle-card ${isUrgent ? "urgent" : ""}`}>
        {/* Futuristic Header Beacon */}
        <div className="session-idle-header">
          <div className={`idle-beacon-pill ${isUrgent ? "urgent" : ""}`}>
            <span className="beacon-dot" />
            <span>{isUrgent ? "URGENT LOGOUT IMMINENT" : "SESSION SECURITY GUARD"}</span>
          </div>
          <div className="beacon-icon">
            {isUrgent ? <ShieldAlert size={18} color="#ef4444" /> : <Clock size={18} color="#38bdf8" />}
          </div>
        </div>

        {/* Circular Radial Countdown HUD */}
        <div className="idle-radar-wrap">
          <svg className="idle-svg-ring" width="136" height="136" viewBox="0 0 136 136">
            <circle
              className="idle-track-circle"
              cx="68"
              cy="68"
              r={radius}
              strokeWidth="7"
            />
            <circle
              className="idle-progress-circle"
              cx="68"
              cy="68"
              r={radius}
              strokeWidth="7"
              stroke={ringStroke}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          </svg>
          <div className="idle-timer-center">
            <strong className={`idle-countdown-number ${isUrgent ? "urgent" : ""}`}>
              {secondsRemaining}
            </strong>
            <span className="idle-countdown-unit">SECONDS</span>
          </div>
        </div>

        {/* Warning Copy */}
        <div className="idle-copy-block">
          <h2 id="session-idle-title">Are you still with us?</h2>
          <p>
            No user activity detected for your chosen duration. To protect your financial accounts and ledger data, PocketAsset will securely lock this session in <strong>{secondsRemaining} seconds</strong>.
          </p>
        </div>

        {/* Futuristic Action Buttons */}
        <div className="idle-action-buttons">
          <button
            id="extend-session-btn"
            type="button"
            className={`idle-primary-extend-btn ${isUrgent ? "urgent" : ""}`}
            onClick={onExtend}
            disabled={isExtending}
          >
            {isExtending ? (
              <>
                <RefreshCw size={16} className="spin" />
                <span>Extending Session…</span>
              </>
            ) : (
              <>
                <Zap size={16} />
                <span>Extend Session (+30 Mins)</span>
              </>
            )}
          </button>

          <button
            type="button"
            className="idle-keep-working-btn"
            onClick={onExtend}
            disabled={isExtending}
          >
            <CheckCircle2 size={15} />
            <span>Keep Working (+60s)</span>
          </button>

          <button
            type="button"
            className="idle-signout-btn"
            onClick={onLogout}
          >
            <LogOut size={14} />
            <span>Sign Out Immediately</span>
          </button>
        </div>

        <div className="idle-keyboard-hint">
          <span>Tip: Press <code>[Space]</code> or <code>[Enter]</code> on keyboard to instantly extend time.</span>
        </div>
      </div>
    </div>
  );
}

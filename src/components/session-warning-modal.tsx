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
  const radius = 52;
  const circumference = 2 * Math.PI * radius; // ~326.73
  const strokeDashoffset = circumference * (1 - Math.max(0, Math.min(60, secondsRemaining)) / 60);

  const ringStroke = isUrgent ? "#f43f5e" : isWarning ? "#f59e0b" : "#38bdf8";

  return (
    <div
      className="session-idle-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-idle-title"
    >
      <div className={`session-idle-card ${isUrgent ? "urgent" : ""}`}>
        {/* Security Badge Beacon */}
        <div className="idle-security-badge">
          <span className="security-badge-pulse" />
          <span>{isUrgent ? "URGENT LOGOUT IMMINENT" : "SESSION INACTIVITY GUARD"}</span>
          {isUrgent ? <ShieldAlert size={14} color="#f43f5e" /> : <Clock size={14} color="#38bdf8" />}
        </div>

        {/* Futuristic Header & Title */}
        <div className="idle-header">
          <h2 id="session-idle-title" className="idle-title">Are you still working?</h2>
          <p className="idle-desc">
            No activity detected. To protect your financial accounts and confidential records, PocketAsset will automatically log out in <strong>{secondsRemaining} seconds</strong>.
          </p>
        </div>

        {/* Circular Radial Countdown HUD */}
        <div className="idle-radar-wrap">
          <svg className="idle-svg-ring" width="128" height="128" viewBox="0 0 128 128">
            <circle
              className="idle-ring-track"
              cx="64"
              cy="64"
              r={radius}
              strokeWidth="6"
              fill="transparent"
            />
            <circle
              className="idle-progress-circle"
              cx="64"
              cy="64"
              r={radius}
              strokeWidth="6"
              fill="transparent"
              stroke={ringStroke}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              transform="rotate(-90 64 64)"
            />
          </svg>
          <div className="idle-ring-center">
            <strong className={`idle-countdown-number ${isUrgent ? "urgent" : ""}`}>
              {secondsRemaining}
            </strong>
            <span className="idle-countdown-sec">SECONDS</span>
          </div>
        </div>

        {/* Action Buttons: Extend Time / Keep Working / Logout */}
        <div className="idle-actions-stack">
          <button
            id="extend-session-btn"
            type="button"
            className="idle-primary-extend-btn"
            onClick={onExtend}
            disabled={isExtending}
          >
            {isExtending ? (
              <>
                <RefreshCw size={15} className="spin" />
                <span>Extending Session…</span>
              </>
            ) : (
              <>
                <Zap size={15} />
                <span>Extend Time (+30 Mins)</span>
              </>
            )}
          </button>

          <div className="idle-secondary-actions">
            <button
              type="button"
              className="idle-keep-working-btn"
              onClick={onExtend}
              disabled={isExtending}
            >
              <CheckCircle2 size={13} />
              <span>Keep Working (+60s)</span>
            </button>

            <button
              type="button"
              className="idle-signout-btn"
              onClick={onLogout}
            >
              <LogOut size={13} />
              <span>Logout Now</span>
            </button>
          </div>
        </div>

        {/* Keyboard Shortcut Hint */}
        <div className="idle-footer-tip">
          <span>Tip: Press <kbd className="idle-kbd">Space</kbd> or <kbd className="idle-kbd">Enter</kbd> to extend &bull; <kbd className="idle-kbd">Esc</kbd> to logout</span>
        </div>
      </div>
    </div>
  );
}

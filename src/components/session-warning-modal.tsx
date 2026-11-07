"use client";

import { useEffect, useCallback } from "react";
import { CheckCircle2, Clock, LogOut, RefreshCw } from "lucide-react";

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

  return (
    <div
      className={`session-top-banner ${isUrgent ? "urgent" : ""}`}
      role="alert"
      aria-live="polite"
    >
      <div className="banner-left-content">
        <div className={`banner-pulse-dot ${isUrgent ? "urgent" : ""}`} />
        <div className={`banner-timer-badge ${isUrgent ? "urgent" : ""}`}>
          <Clock size={12} />
          <span>{secondsRemaining}s</span>
        </div>
        <div className="banner-text">
          <strong>Session Idle Warning</strong>
          <span className="banner-subtext">
            Auto-logout in {secondsRemaining}s due to inactivity
          </span>
        </div>
      </div>

      <div className="banner-actions">
        <button
          id="extend-session-btn"
          type="button"
          className={`banner-stay-btn ${isUrgent ? "urgent" : ""}`}
          onClick={onExtend}
          disabled={isExtending}
        >
          {isExtending ? (
            <>
              <RefreshCw size={12} className="spin" />
              Extending…
            </>
          ) : (
            <>
              <CheckCircle2 size={13} />
              Keep Working
            </>
          )}
        </button>

        <button
          type="button"
          className="banner-logout-btn"
          onClick={onLogout}
          title="Sign out now"
        >
          <LogOut size={12} />
          Sign Out
        </button>
      </div>
    </div>
  );
}

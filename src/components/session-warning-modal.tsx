"use client";

import { useEffect, useCallback } from "react";
import { Clock, LogOut, RefreshCw, Zap } from "lucide-react";

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
  // Keyboard shortcuts: Space or Enter to extend time, Escape to logout
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") {
        e.preventDefault();
        onLogout();
      } else if (e.key === "Enter" || e.key === " ") {
        const target = e.target as HTMLElement | null;
        if (
          !target ||
          target.id === "banner-stay-btn" ||
          (target.tagName.toLowerCase() !== "button" &&
            target.tagName.toLowerCase() !== "input" &&
            target.tagName.toLowerCase() !== "textarea")
        ) {
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
      aria-label="Inactivity auto-logout warning banner"
    >
      <div className="banner-left-content">
        <span className={`banner-pulse-dot ${isUrgent ? "urgent" : ""}`} />
        <div className={`banner-timer-badge ${isUrgent ? "urgent" : ""}`}>
          <Clock size={12} />
          <span>{secondsRemaining}s</span>
        </div>
        <div className="banner-text">
          <strong>
            {secondsRemaining <= 10
              ? `⚠️ Auto-logout in ${secondsRemaining}s!`
              : `${secondsRemaining} sec baad auto logout ho jayega`}
          </strong>
          <span className="banner-subtext">
            Inactivity detected &bull; Extend karo ya Logout
          </span>
        </div>
      </div>

      <div className="banner-actions">
        <button
          id="banner-stay-btn"
          type="button"
          className={`banner-stay-btn ${isUrgent ? "urgent" : ""}`}
          onClick={onExtend}
          disabled={isExtending}
          title="Extend session by 30 minutes"
        >
          {isExtending ? (
            <>
              <RefreshCw size={13} className="spin" />
              <span>Extending…</span>
            </>
          ) : (
            <>
              <Zap size={13} />
              <span>Extend (+30m)</span>
            </>
          )}
        </button>

        <button
          type="button"
          className="banner-logout-btn"
          onClick={onLogout}
          title="Sign out immediately"
        >
          <LogOut size={12} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}

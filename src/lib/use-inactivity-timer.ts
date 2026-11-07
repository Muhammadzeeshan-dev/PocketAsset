"use client";

import { useEffect, useRef, useState, useCallback } from "react";

const INACTIVITY_TIMEOUT_MS = 20 * 1000; // 20 seconds idle before top banner triggers
const WARNING_COUNTDOWN_SEC = 60; // 60 seconds (1 minute) countdown
const TOTAL_EXPIRY_MS = INACTIVITY_TIMEOUT_MS + WARNING_COUNTDOWN_SEC * 1000; // 80,000 ms (20s + 60s)

const STORAGE_KEY_LAST_ACTIVE = "pocketasset_last_active";
const STORAGE_KEY_LOGOUT = "pocketasset_session_logout";
const BROADCAST_CHANNEL_NAME = "pocketasset_auth_channel";

type BroadcastMessage =
  | { type: "ACTIVITY"; timestamp: number }
  | { type: "EXTEND_SESSION"; timestamp: number }
  | { type: "LOGOUT"; reason: string };

type UseInactivityTimerOptions = {
  sessionId: string | null;
  isEnabled: boolean;
  onLogout: (reason?: string) => void;
  getAccessToken?: () => Promise<string | null>;
};

export function useInactivityTimer({
  sessionId,
  isEnabled,
  onLogout,
  getAccessToken,
}: UseInactivityTimerOptions) {
  const [isWarningOpen, setIsWarningOpen] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(WARNING_COUNTDOWN_SEC);
  const [isExtending, setIsExtending] = useState(false);

  const channelRef = useRef<BroadcastChannel | null>(null);
  const lastActiveRef = useRef<number>(0);
  const lastThrottleRef = useRef<number>(0);
  const warningOpenRef = useRef<boolean>(false);
  const onLogoutRef = useRef(onLogout);

  useEffect(() => {
    onLogoutRef.current = onLogout;
  }, [onLogout]);

  useEffect(() => {
    warningOpenRef.current = isWarningOpen;
  }, [isWarningOpen]);

  // Handle logout with broadcast
  const triggerLogout = useCallback((reason = "inactivity") => {
    try {
      localStorage.removeItem(STORAGE_KEY_LAST_ACTIVE);
      localStorage.setItem(STORAGE_KEY_LOGOUT, String(Date.now()));
      if (channelRef.current) {
        channelRef.current.postMessage({ type: "LOGOUT", reason } satisfies BroadcastMessage);
      }
    } catch {
      // ignore
    }
    setIsWarningOpen(false);
    onLogoutRef.current(reason);
  }, []);

  // Handle Extend Session
  const extendSession = useCallback(async () => {
    warningOpenRef.current = false;
    if (!sessionId) {
      const now = Date.now();
      lastActiveRef.current = now;
      try {
        localStorage.setItem(STORAGE_KEY_LAST_ACTIVE, String(now));
        if (channelRef.current) {
          channelRef.current.postMessage({ type: "EXTEND_SESSION", timestamp: now } satisfies BroadcastMessage);
        }
      } catch {
        // ignore
      }
      setIsWarningOpen(false);
      setSecondsRemaining(WARNING_COUNTDOWN_SEC);
      return;
    }

    setIsExtending(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (getAccessToken) {
        const token = await getAccessToken().catch(() => null);
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }
      }

      const res = await fetch("/api/auth/session-extend", {
        method: "POST",
        headers,
        body: JSON.stringify({ sessionId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.revoked) {
          triggerLogout("revoked");
          return;
        }
      }

      const now = Date.now();
      lastActiveRef.current = now;
      try {
        localStorage.setItem(STORAGE_KEY_LAST_ACTIVE, String(now));
        if (channelRef.current) {
          channelRef.current.postMessage({ type: "EXTEND_SESSION", timestamp: now } satisfies BroadcastMessage);
        }
      } catch {
        // ignore
      }

      setIsWarningOpen(false);
      setSecondsRemaining(WARNING_COUNTDOWN_SEC);
    } catch {
      // Even if network fails, grant extension locally for offline resilience
      const now = Date.now();
      lastActiveRef.current = now;
      try {
        localStorage.setItem(STORAGE_KEY_LAST_ACTIVE, String(now));
      } catch {
        // ignore
      }
      setIsWarningOpen(false);
      setSecondsRemaining(WARNING_COUNTDOWN_SEC);
    } finally {
      setIsExtending(false);
    }
  }, [sessionId, triggerLogout, getAccessToken]);

  // Main inactivity tracking effect
  useEffect(() => {
    if (!isEnabled) {
      return;
    }

    // Set up BroadcastChannel
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      try {
        const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
        channelRef.current = channel;
        channel.onmessage = (event: MessageEvent<BroadcastMessage>) => {
          const msg = event.data;
          if (!msg || typeof msg !== "object") return;

          if (msg.type === "LOGOUT") {
            onLogoutRef.current(msg.reason);
          } else if (msg.type === "EXTEND_SESSION") {
            lastActiveRef.current = msg.timestamp;
            setIsWarningOpen(false);
            setSecondsRemaining(WARNING_COUNTDOWN_SEC);
          } else if (msg.type === "ACTIVITY") {
            // Other tab was active - update last active only if warning is NOT currently showing
            if (!warningOpenRef.current) {
              lastActiveRef.current = msg.timestamp;
            }
          }
        };
      } catch {
        // BroadcastChannel unavailable
      }
    }

    // Storage event listener for fallback multi-tab sync
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY_LOGOUT) {
        onLogoutRef.current("inactivity");
      } else if (e.key === STORAGE_KEY_LAST_ACTIVE && e.newValue) {
        const ts = Number(e.newValue);
        if (!isNaN(ts) && !warningOpenRef.current) {
          lastActiveRef.current = ts;
        }
      }
    };
    window.addEventListener("storage", handleStorageChange);

    // Initial check on mount/refresh: compute elapsed time
    const storedLast = localStorage.getItem(STORAGE_KEY_LAST_ACTIVE);
    const now = Date.now();
    let initialLastActive = now;

    if (storedLast) {
      const parsed = Number(storedLast);
      if (!isNaN(parsed) && parsed > 0 && parsed <= now) {
        initialLastActive = parsed;
      }
    } else {
      try {
        localStorage.setItem(STORAGE_KEY_LAST_ACTIVE, String(now));
      } catch {
        // ignore
      }
    }
    lastActiveRef.current = initialLastActive;

    const initialElapsed = now - initialLastActive;
    if (initialElapsed >= TOTAL_EXPIRY_MS) {
      // User was already inactive for > 6 minutes before refresh
      setTimeout(() => {
        triggerLogout("inactivity");
      }, 0);
      return () => {
        window.removeEventListener("storage", handleStorageChange);
        channelRef.current?.close();
      };
    } else if (initialElapsed >= INACTIVITY_TIMEOUT_MS) {
      // User refreshed while in the 60s warning period
      const remaining = Math.max(1, Math.ceil((TOTAL_EXPIRY_MS - initialElapsed) / 1000));
      setTimeout(() => {
        setSecondsRemaining(remaining);
        setIsWarningOpen(true);
      }, 0);
    }

    // Genuine user interaction listener (throttled to at most once per 400ms)
    const handleUserInteraction = (evt?: Event) => {
      // If banner is already open, purposeful interactions (click, keydown) automatically extend session
      if (warningOpenRef.current) {
        if (evt && (evt.type === "click" || evt.type === "keydown")) {
          void extendSession();
        }
        return;
      }

      const currentTime = Date.now();
      if (currentTime - lastThrottleRef.current < 400) {
        return;
      }
      lastThrottleRef.current = currentTime;
      lastActiveRef.current = currentTime;

      try {
        localStorage.setItem(STORAGE_KEY_LAST_ACTIVE, String(currentTime));
        if (channelRef.current) {
          channelRef.current.postMessage({ type: "ACTIVITY", timestamp: currentTime } satisfies BroadcastMessage);
        }
      } catch {
        // ignore
      }
    };

    const trackedEvents = [
      "mousemove",
      "mousedown",
      "keydown",
      "scroll",
      "touchstart",
      "pointerdown",
      "click",
    ] as const;

    trackedEvents.forEach((evt) => {
      window.addEventListener(evt, handleUserInteraction, { passive: true });
    });

    // Check timer loop every 1000ms
    const intervalId = setInterval(() => {
      const current = Date.now();
      const elapsed = current - lastActiveRef.current;

      if (warningOpenRef.current) {
        // Warning modal is currently open, decrement countdown based on actual elapsed time
        const remaining = Math.max(0, Math.ceil((TOTAL_EXPIRY_MS - elapsed) / 1000));
        setSecondsRemaining(remaining);

        if (remaining <= 0) {
          clearInterval(intervalId);
          triggerLogout("inactivity");
        }
      } else {
        // Warning modal is not open yet
        if (elapsed >= INACTIVITY_TIMEOUT_MS) {
          const remaining = Math.max(0, Math.ceil((TOTAL_EXPIRY_MS - elapsed) / 1000));
          if (remaining <= 0) {
            clearInterval(intervalId);
            triggerLogout("inactivity");
          } else {
            setSecondsRemaining(remaining);
            setIsWarningOpen(true);
          }
        }
      }
    }, 1000);

    return () => {
      clearInterval(intervalId);
      trackedEvents.forEach((evt) => {
        window.removeEventListener(evt, handleUserInteraction);
      });
      window.removeEventListener("storage", handleStorageChange);
      if (channelRef.current) {
        channelRef.current.close();
        channelRef.current = null;
      }
    };
  }, [isEnabled, triggerLogout]);

  return {
    isWarningOpen: isEnabled && isWarningOpen,
    secondsRemaining,
    isExtending,
    extendSession,
    cancelAndLogout: () => triggerLogout("user_logout"),
  };
}


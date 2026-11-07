"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import type { User, SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseBrowserClient, createDemoSupabaseClient } from "@/lib/supabase";
import type { AppSection } from "@/lib/navigation";
import { Dashboard } from "@/components/dashboard";
import { LoginPage } from "@/components/login-page";
import { AdminPanel } from "@/components/admin-panel";
import { SessionWarningModal } from "@/components/session-warning-modal";
import { useInactivityTimer } from "@/lib/use-inactivity-timer";

const STORAGE_KEY_SESSION = "pocketasset_session";
const STORAGE_KEY_SESSION_ID = "pocketasset_session_id";
const STORAGE_KEY_LAST_ACTIVE = "pocketasset_last_active";

export function PocketAssetApp({ section = "overview" }: { section?: AppSection }) {
  const browserClient = getSupabaseBrowserClient();
  const [user, setUser] = useState<User | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [, setDemoMode] = useState<boolean>(false);
  const [supabaseClient, setSupabaseClient] = useState<SupabaseClient>(() => {
    return browserClient || createDemoSupabaseClient();
  });
  const [loading, setLoading] = useState(true);
  const [logoutNotice, setLogoutNotice] = useState<string>("");

  // Logout handler
  const handleLogout = useCallback(async (reason = "user_logout") => {
    try {
      localStorage.removeItem(STORAGE_KEY_SESSION);
      localStorage.removeItem(STORAGE_KEY_SESSION_ID);
      localStorage.removeItem(STORAGE_KEY_LAST_ACTIVE);
      if (browserClient) {
        await browserClient.auth.signOut().catch(() => {});
      }
    } catch {
      // ignore
    }
    setUser(null);
    setSessionId(null);
    setDemoMode(false);
    if (reason === "inactivity") {
      setLogoutNotice("You have been logged out due to inactivity.");
    } else if (reason === "revoked") {
      setLogoutNotice("This session has been revoked by the security administrator.");
    } else {
      setLogoutNotice("");
    }
  }, [browserClient]);

  const getAccessToken = useCallback(async () => {
    if (browserClient) {
      const { data } = await browserClient.auth.getSession();
      return data.session?.access_token || null;
    }
    return null;
  }, [browserClient]);

  // Inactivity timer hook
  const {
    isWarningOpen,
    secondsRemaining,
    isExtending,
    extendSession,
    cancelAndLogout,
  } = useInactivityTimer({
    sessionId,
    isEnabled: Boolean(user),
    onLogout: handleLogout,
    getAccessToken,
  });

  // Persistent session initialization on refresh / app mount
  useEffect(() => {
    let mounted = true;

    async function initSession() {
      try {
        if (browserClient) {
          const { data } = await browserClient.auth.getSession();
          if (mounted && data.session?.user) {
            const sid = localStorage.getItem(STORAGE_KEY_SESSION_ID) || `sess-supa-${data.session.user.id.slice(0, 8)}`;
            // Verify server-side session status
            try {
              const res = await fetch(`/api/auth/session-status?sessionId=${encodeURIComponent(sid)}`);
              if (res.status === 401) {
                const statusData = await res.json().catch(() => ({}));
                if (statusData.revoked) {
                  await browserClient.auth.signOut().catch(() => {});
                  if (mounted) {
                    setUser(null);
                    setLogoutNotice("This session has been revoked by the security administrator.");
                    setLoading(false);
                  }
                  return;
                }
              }
            } catch {
              // offline resilience
            }

            if (mounted) {
              setUser(data.session.user);
              setSessionId(sid);
              setDemoMode(false);
              setSupabaseClient(browserClient);
            }
          }
        } else {
          // Standalone / Demo Mode session restoration (strictly local development only)
          // In production, localStorage or sessionStorage alone can NEVER authenticate a user
          if (process.env.NODE_ENV === "production") {
            try {
              localStorage.removeItem(STORAGE_KEY_SESSION);
              localStorage.removeItem(STORAGE_KEY_SESSION_ID);
            } catch {
              // ignore
            }
            if (mounted) {
              setUser(null);
              setLoading(false);
            }
            return;
          }

          const stored = localStorage.getItem(STORAGE_KEY_SESSION);
          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              if (parsed?.user && parsed?.sessionId) {
                // Check server-side revocation
                try {
                  const res = await fetch(`/api/auth/session-status?sessionId=${encodeURIComponent(parsed.sessionId)}`);
                  if (res.status === 401) {
                    const statusData = await res.json().catch(() => ({}));
                    if (statusData.revoked) {
                      localStorage.removeItem(STORAGE_KEY_SESSION);
                      localStorage.removeItem(STORAGE_KEY_SESSION_ID);
                      if (mounted) {
                        setUser(null);
                        setLogoutNotice("This session has been revoked by the security administrator.");
                        setLoading(false);
                      }
                      return;
                    }
                  }
                } catch {
                  // offline resilience
                }

                if (mounted) {
                  setUser(parsed.user);
                  setSessionId(parsed.sessionId);
                  setDemoMode(true);
                  setSupabaseClient(createDemoSupabaseClient());
                }
              }
            } catch {
              localStorage.removeItem(STORAGE_KEY_SESSION);
            }
          }
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void initSession();

    // Listen for auth state change if Supabase is active
    let authSubscription: { unsubscribe: () => void } | null = null;
    if (browserClient) {
      const { data: listener } = browserClient.auth.onAuthStateChange((_event, session) => {
        if (mounted) {
          if (session?.user) {
            setUser(session.user);
            setDemoMode(false);
            setSupabaseClient(browserClient);
          } else {
            setUser(null);
            setSessionId(null);
          }
        }
      });
      authSubscription = listener.subscription;
    }

    return () => {
      mounted = false;
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
    };
  }, [browserClient]);

  // Real-time periodic session revocation verification
  const sidRef = useRef(sessionId);
  useEffect(() => {
    sidRef.current = sessionId;
  }, [sessionId]);

  useEffect(() => {
    if (!user) return;
    let active = true;

    async function checkSession() {
      try {
        const sid = sidRef.current || "sess-current";
        const res = await fetch(`/api/auth/session-status?sessionId=${encodeURIComponent(sid)}`);
        if (res.status === 401 && active) {
          const data = await res.json().catch(() => ({}));
          if (data.revoked) {
            await handleLogout("revoked");
          }
        }
      } catch {
        // network or offline
      }
    }

    const interval = setInterval(checkSession, 15000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [user, handleLogout]);

  // Page activity logger
  useEffect(() => {
    if (!user) return;
    const pageTitleMap: Record<AppSection, string> = {
      overview: "Overview Dashboard",
      daily: "Daily Money Tracker",
      calendar: "Financial Calendar",
      transactions: "Transactions Ledger",
      income: "Income & Allowances",
      expenses: "Expenses & Purchases",
      budgets: "Budget Planner",
      inventory: "Household Inventory",
      savings: "Savings Goals & Emergency Fund",
      investments: "PSX Stock Investments",
      assets: "Assets & Net Worth",
      reports: "Financial Reports",
      assistant: "Deterministic Assistant",
      settings: "User Settings",
      admin: "Security Admin Console",
    };

    const startTime = Date.now();
    const route = section === "overview" ? "/" : `/${section}`;
    const pageName = pageTitleMap[section] || section;

    void fetch("/api/auth/page-activity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: user.id,
        sessionId,
        pageName,
        route,
        durationSeconds: 0,
      }),
    }).catch(() => {});

    return () => {
      const durationSeconds = Math.round((Date.now() - startTime) / 1000);
      if (durationSeconds > 1) {
        void fetch("/api/auth/page-activity", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user.id,
            sessionId,
            pageName,
            route,
            durationSeconds,
          }),
        }).catch(() => {});
      }
    };
  }, [user, sessionId, section]);

  // Live preview / demo activation
  async function activateDemoMode() {
    const demoSessionId = `sess-demo-${crypto.randomUUID()}`;
    const demoUser: User = {
      id: "demo-user-1",
      email: "muhammadzeeshan7864x56@gmail.com",
      app_metadata: {},
      user_metadata: { full_name: "Muhammad Zeeshan" },
      aud: "authenticated",
      created_at: "2026-11-06T00:00:00Z",
    } as User;

    await fetch("/api/auth/login-audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: demoUser.id,
        userEmail: demoUser.email,
        sessionId: demoSessionId,
        clientTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Karachi",
        status: "success",
        loginMethod: "demo",
      }),
    }).catch(() => {});

    setUser(demoUser);
    setSessionId(demoSessionId);
    setLogoutNotice("");
    setDemoMode(true);
    setSupabaseClient(createDemoSupabaseClient());

    try {
      localStorage.setItem(STORAGE_KEY_SESSION_ID, demoSessionId);
      localStorage.setItem(STORAGE_KEY_LAST_ACTIVE, String(Date.now()));
      localStorage.setItem(
        STORAGE_KEY_SESSION,
        JSON.stringify({
          user: demoUser,
          sessionId: demoSessionId,
          savedAt: Date.now(),
        }),
      );
    } catch {
      // ignore
    }
  }

  // Handle successful login
  function handleAuthenticated(authenticatedUser: User, newSessionId: string) {
    setUser(authenticatedUser);
    setSessionId(newSessionId);
    setLogoutNotice("");
    setDemoMode(false);
    if (browserClient) setSupabaseClient(browserClient);

    try {
      localStorage.setItem(STORAGE_KEY_SESSION_ID, newSessionId);
      localStorage.setItem(STORAGE_KEY_LAST_ACTIVE, String(Date.now()));
      localStorage.setItem(
        STORAGE_KEY_SESSION,
        JSON.stringify({
          user: authenticatedUser,
          sessionId: newSessionId,
          savedAt: Date.now(),
        }),
      );
    } catch {
      // ignore
    }
  }

  if (loading) {
    return <div className="loading-screen"><span className="loading-spinner" />Loading your private workspace…</div>;
  }

  if (!user) {
    return (
      <LoginPage
        supabase={browserClient}
        onAuthenticated={handleAuthenticated}
        onTryDemo={activateDemoMode}
        logoutNotice={logoutNotice}
      />
    );
  }

  return (
    <>
      {section === "admin" ? (
        <AdminPanel user={user} />
      ) : (
        <Dashboard
          user={user}
          supabase={supabaseClient}
          section={section}
          onSignedOut={() => handleLogout("user_logout")}
        />
      )}

      <SessionWarningModal
        isOpen={isWarningOpen}
        secondsRemaining={secondsRemaining}
        onExtend={extendSession}
        onLogout={cancelAndLogout}
        isExtending={isExtending}
      />
    </>
  );
}

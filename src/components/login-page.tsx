"use client";

import { useState, type FormEvent } from "react";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { AlertCircle, CheckCircle2, Eye, EyeOff, LockKeyhole, ShieldCheck, WalletCards } from "lucide-react";

type LoginPageProps = {
  supabase: SupabaseClient | null;
  onAuthenticated: (user: User, sessionId: string) => void;
  onTryDemo?: () => void;
  logoutNotice?: string;
};

export function LoginPage({ supabase, onAuthenticated, onTryDemo, logoutNotice }: LoginPageProps) {
  const [email, setEmail] = useState("muhammadzeeshan7864x56@gmail.com");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setInfoMessage("");

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setError("Please enter your email address.");
      return;
    }
    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setBusy(true);

    const clientTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Karachi";
    const sessionId = `sess-${crypto.randomUUID()}`;

    try {
      if (supabase) {
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        });

        if (authError) {
          // Log failed login attempt
          await fetch("/api/auth/login-audit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userEmail: trimmedEmail,
              clientTimezone,
              status: "failure",
              failureReason: authError.message,
            }),
          }).catch(() => {});

          throw authError;
        }

        if (data.user) {
          // Record successful login audit
          await fetch("/api/auth/login-audit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: data.user.id,
              userEmail: data.user.email || trimmedEmail,
              sessionId,
              clientTimezone,
              status: "success",
              loginMethod: "password",
            }),
          }).catch(() => {});

          onAuthenticated(data.user, sessionId);
          return;
        }
      } else {
        // In production, reject immediately if live Supabase is not configured
        if (process.env.NODE_ENV === "production") {
          setError("Production environment requires an active Supabase authentication connection.");
          setBusy(false);
          return;
        }

        // Demo / Standalone Mode without live Supabase (strictly local development only)
        if (
          trimmedEmail !== "muhammadzeeshan7864x56@gmail.com" &&
          trimmedEmail !== "zeeshan@pocketasset.pk" &&
          !trimmedEmail.includes("zeeshan")
        ) {
          await fetch("/api/auth/login-audit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userEmail: trimmedEmail,
              clientTimezone,
              status: "failure",
              failureReason: "Unauthorized account (Private single-owner system)",
            }),
          }).catch(() => {});

          setError("Access denied. PocketAsset is a private wealth management system restricted to the authorized owner.");
          setBusy(false);
          return;
        }

        // Strict Password Restriction: Only allow the designated owner master password
        const REQUIRED_OWNER_PASSWORD = process.env.NEXT_PUBLIC_OWNER_PASSWORD || "Zeeshan@PocketAsset2026";
        if (password !== REQUIRED_OWNER_PASSWORD) {
          await fetch("/api/auth/login-audit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userEmail: trimmedEmail,
              clientTimezone,
              status: "failure",
              failureReason: "Invalid password entered for owner account",
            }),
          }).catch(() => {});

          setError("Invalid email or password. Please verify your credentials.");
          setBusy(false);
          return;
        }

        const simulatedUser: User = {
          id: "demo-user-1",
          email: trimmedEmail,
          app_metadata: {},
          user_metadata: { full_name: "Muhammad Zeeshan" },
          aud: "authenticated",
          created_at: "2026-11-06T00:00:00Z",
        } as User;

        await fetch("/api/auth/login-audit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: simulatedUser.id,
            userEmail: trimmedEmail,
            sessionId,
            clientTimezone,
            status: "success",
            loginMethod: "demo",
          }),
        }).catch(() => {});

        onAuthenticated(simulatedUser, sessionId);
      }
    } catch (caught) {
      const msg = caught instanceof Error ? caught.message : "Authentication failed. Please verify your credentials.";
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  async function handleForgotPassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email.trim()) {
      setError("Please enter your registered owner email address.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      if (supabase) {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/settings`,
        });
        if (resetError) throw resetError;
      }
      setInfoMessage("If your account is registered, a password recovery link has been sent to your email.");
      setForgotPasswordOpen(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Password recovery request failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-screen">
      <section className="auth-intro">
        <div className="brand-lockup">
          <div className="brand-mark">
            <WalletCards size={26} strokeWidth={2.2} />
          </div>
          <span>Pocket<span>Asset</span></span>
        </div>
        <div className="intro-copy">
          <p className="eyebrow">Private Wealth Management</p>
          <h1>Track Every Rupee.<br /><em>Build Your Wealth.</em></h1>
          <p>
            A private, secure platform designed for one owner in Pakistan to manage cash flow, PSX investments, university allowances, and net worth.
          </p>
          <div className="auth-security-badge">
            <ShieldCheck size={16} />
            <span>Single-owner private access &bull; End-to-end ledger protection</span>
          </div>
        </div>
        <footer className="intro-footer">
          PocketAsset &bull; Bank-grade security &bull; PK Financial Ledger
        </footer>
      </section>

      <section className="auth-form-card">
        <div className="auth-card-inner">
          <div className="auth-form-header">
            <h2>{forgotPasswordOpen ? "Reset Password" : "Sign in to PocketAsset"}</h2>
            <p>
              {forgotPasswordOpen
                ? "Enter your owner email address to receive password reset instructions."
                : "Enter your credentials to access your private financial ledger."}
            </p>
          </div>

          {logoutNotice && !error && (
            <div
              className="auth-message warning"
              role="alert"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 14px",
                borderRadius: "8px",
                background: "#fffbeb",
                border: "1px solid #fde68a",
                color: "#b45309",
                fontSize: "13px",
                marginBottom: "16px",
              }}
            >
              <AlertCircle size={16} />
              <span>{logoutNotice}</span>
            </div>
          )}

          {error && (
            <div className="auth-message error" role="alert">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {infoMessage && (
            <div className="auth-message success" role="status">
              <CheckCircle2 size={16} />
              <span>{infoMessage}</span>
            </div>
          )}

        {!forgotPasswordOpen ? (
          <form onSubmit={handleLogin} className="auth-form" noValidate>
            <div className="form-group">
              <label htmlFor="auth-email">Owner Email Address</label>
              <input
                id="auth-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="muhammadzeeshan7864x56@gmail.com"
                disabled={busy}
              />
            </div>

            <div className="form-group">
              <div className="form-label-row">
                <label htmlFor="auth-password">Password</label>
                <button
                  type="button"
                  className="text-link-sm"
                  onClick={() => {
                    setError("");
                    setForgotPasswordOpen(true);
                  }}
                  tabIndex={-1}
                >
                  Forgot password?
                </button>
              </div>
              <div className="password-input-wrap">
                <input
                  id="auth-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  disabled={busy}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="form-checkbox-row">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span>Remember this session on this device</span>
              </label>
            </div>

            <button type="submit" className="primary-button auth-submit-btn" disabled={busy}>
              {busy ? (
                <>
                  <span className="loading-spinner small" /> Authenticating…
                </>
              ) : (
                "Sign In"
              )}
            </button>

            <div className="auth-restricted-notice">
              <LockKeyhole size={14} />
              <span>Public registration is closed. Only the authorized owner account can log in.</span>
            </div>
          </form>
        ) : (
          <form onSubmit={handleForgotPassword} className="auth-form">
            <div className="form-group">
              <label htmlFor="reset-email">Owner Email Address</label>
              <input
                id="reset-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="muhammadzeeshan7864x56@gmail.com"
                disabled={busy}
              />
            </div>

            <div className="form-actions-stack">
              <button type="submit" className="primary-button auth-submit-btn" disabled={busy}>
                {busy ? "Sending instructions…" : "Send Reset Link"}
              </button>
              <button
                type="button"
                className="outline-button auth-demo-btn"
                onClick={() => {
                  setError("");
                  setForgotPasswordOpen(false);
                }}
                disabled={busy}
              >
                Back to Sign In
              </button>
            </div>
          </form>
        )}
        </div>
      </section>
    </main>
  );
}


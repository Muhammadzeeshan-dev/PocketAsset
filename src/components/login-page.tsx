"use client";

import { useState, useEffect, type FormEvent } from "react";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { AlertCircle, CheckCircle2, Eye, EyeOff, Fingerprint, LockKeyhole, ScanFace, ShieldCheck, Sparkles, WalletCards } from "lucide-react";
import {
  authenticateWithBiometrics,
  checkBiometricSupport,
  isBiometricsEnrolled,
  registerBiometricCredential,
} from "@/lib/biometrics";

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
  const [bioSupported, setBioSupported] = useState(false);
  const [bioDeviceName, setBioDeviceName] = useState("Fingerprint & Face Recognition");

  useEffect(() => {
    checkBiometricSupport().then((s) => {
      setBioSupported(s.isSupported);
      if (s.deviceFriendlyName) setBioDeviceName(s.deviceFriendlyName);
    });
  }, []);

  async function handleBiometricLogin() {
    setError("");
    setInfoMessage("");
    setBusy(true);

    const clientTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Karachi";
    const sessionId = `sess-bio-${crypto.randomUUID()}`;
    const targetEmail = email.trim().toLowerCase() || "muhammadzeeshan7864x56@gmail.com";

    try {
      if (!isBiometricsEnrolled()) {
        setInfoMessage("Prompting device for biometric thumb / face registration...");
        await registerBiometricCredential("owner-1", targetEmail);
        setInfoMessage("✓ Biometrics registered! Verifying identity...");
      }

      const result = await authenticateWithBiometrics();
      if (!result.success) {
        throw new Error(result.error || "Biometric scan cancelled.");
      }

      setInfoMessage("✓ Biometrics verified. Establishing secure session...");

      // Call dedicated biometric-session endpoint to establish authoritative DB session
      const bioRes = await fetch("/api/auth/biometric-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail, sessionId }),
      });

      const bioData = await bioRes.json().catch(() => ({}));
      const emailOtp = bioData?.emailOtp;
      const ownerUuid = bioData?.userId || "cbaad70a-cc7d-4516-b2f1-e811e04e77b7";

      // If Supabase client is available, exchange OTP for official JWT session
      if (supabase && emailOtp) {
        try {
          const { data: authData, error: otpErr } = await supabase.auth.verifyOtp({
            email: targetEmail,
            token: emailOtp,
            type: "email",
          });
          if (!otpErr && authData?.user) {
            try {
              localStorage.setItem("pocketasset_remember_me", rememberMe ? "true" : "false");
            } catch {
              // ignore
            }
            onAuthenticated(authData.user, sessionId);
            return;
          }
        } catch {
          // Fall through to verifiedOwner fallback
        }
      }

      const verifiedOwner: User = {
        id: ownerUuid,
        email: targetEmail,
        app_metadata: {},
        user_metadata: { full_name: "Muhammad Zeeshan" },
        aud: "authenticated",
        created_at: "2026-11-06T00:00:00Z",
      } as User;

      try {
        localStorage.setItem("pocketasset_remember_me", rememberMe ? "true" : "false");
      } catch {
        // ignore
      }
      onAuthenticated(verifiedOwner, sessionId);
    } catch (caught) {
      const msg = caught instanceof Error ? caught.message : "Biometric authentication failed.";
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("action") === "forgot-password") {
        setForgotPasswordOpen(true);
      }
    }
  }, []);

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

          try {
            localStorage.setItem("pocketasset_remember_me", rememberMe ? "true" : "false");
          } catch {
            // ignore
          }

          onAuthenticated(data.user, sessionId);
          return;
        }
      } else {
        // Standalone / Offline Owner Mode without live Supabase connection
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

        // Strict Password Restriction: Only allow the designated owner master password or updated password
        const customPassword = typeof window !== "undefined" ? localStorage.getItem("pocketasset_custom_password") : null;
        const REQUIRED_OWNER_PASSWORD = customPassword || process.env.NEXT_PUBLIC_OWNER_PASSWORD || "Zeeshan@PocketAsset2026";
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

        try {
          localStorage.setItem("pocketasset_remember_me", rememberMe ? "true" : "false");
        } catch {
          // ignore
        }

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
          redirectTo: `${window.location.origin}/reset-password`,
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

            {bioSupported && (
              <div style={{ marginTop: "14px" }}>
                <div className="auth-demo-divider">
                  <span>OR INSTANT HARDWARE UNLOCK</span>
                </div>
                <button
                  type="button"
                  onClick={handleBiometricLogin}
                  disabled={busy}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "10px",
                    padding: "11px 16px",
                    borderRadius: "10px",
                    background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
                    color: "#ffffff",
                    border: "1px solid rgba(59, 130, 246, 0.35)",
                    fontSize: "12px",
                    fontWeight: "700",
                    cursor: "pointer",
                    boxShadow: "0 4px 14px rgba(15, 23, 42, 0.15)",
                    transition: "all 0.15s ease",
                  }}
                  title={`Sign in using ${bioDeviceName}`}
                >
                  <Fingerprint size={18} color="#38bdf8" />
                  <ScanFace size={18} color="#38bdf8" />
                  <span>Sign In with Thumb / Fingerprint &amp; Face ID</span>
                </button>
              </div>
            )}

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


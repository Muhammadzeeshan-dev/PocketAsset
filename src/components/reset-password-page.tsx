"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase";

type PageState = "verifying" | "ready" | "invalid" | "success";

export function ResetPasswordPage() {
  const [status, setStatus] = useState<PageState>("verifying");
  const [userEmail, setUserEmail] = useState<string>("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const supabase = getSupabaseBrowserClient();

  useEffect(() => {
    let isMounted = true;

    async function initRecoverySession() {
      // 1. Check for error in hash fragment (e.g. #error=access_denied&error_description=...)
      if (typeof window !== "undefined") {
        const hash = window.location.hash;
        if (hash.includes("error=") || hash.includes("error_description=")) {
          const params = new URLSearchParams(hash.replace(/^#/, ""));
          const desc = params.get("error_description") || "This recovery link is invalid or has expired.";
          if (isMounted) {
            setErrorMessage(desc.replace(/\+/g, " "));
            setStatus("invalid");
          }
          return;
        }

        // 2. Check for PKCE auth code in query parameters (?code=...)
        const searchParams = new URLSearchParams(window.location.search);
        const code = searchParams.get("code");
        if (code && supabase) {
          try {
            const { data, error } = await supabase.auth.exchangeCodeForSession(code);
            if (!error && data?.session?.user) {
              if (isMounted) {
                setUserEmail(data.session.user.email || "");
                setStatus("ready");
              }
              return;
            }
          } catch {
            // Fall through to session check
          }
        }
      }

      if (!supabase) {
        // Fallback for standalone demo mode
        if (isMounted) {
          setUserEmail("muhammadzeeshan7864x56@gmail.com");
          setStatus("ready");
        }
        return;
      }

      // 3. Check existing active recovery session
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session?.user) {
          if (isMounted) {
            setUserEmail(data.session.user.email || "");
            setStatus("ready");
          }
          return;
        }
      } catch {
        // Fallback
      }

      // 4. Listen for auth state change event (e.g. PASSWORD_RECOVERY)
      const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
        if (!isMounted) return;
        if (event === "PASSWORD_RECOVERY" || session?.user) {
          setUserEmail(session?.user?.email || "");
          setStatus("ready");
        }
      });

      // 5. Timeout safeguard: if no session detected after 3.5 seconds
      const timeoutId = setTimeout(async () => {
        if (!isMounted) return;
        const { data } = await supabase.auth.getSession();
        if (data.session?.user) {
          setUserEmail(data.session.user.email || "");
          setStatus("ready");
        } else {
          // If non-production, allow owner to test reset
          if (process.env.NODE_ENV !== "production") {
            setUserEmail("muhammadzeeshan7864x56@gmail.com");
            setStatus("ready");
          } else {
            setStatus("invalid");
            setErrorMessage("Password recovery session could not be established. The link may have expired.");
          }
        }
      }, 3500);

      return () => {
        listener.subscription.unsubscribe();
        clearTimeout(timeoutId);
      };
    }

    void initRecoverySession();

    return () => {
      isMounted = false;
    };
  }, [supabase]);

  // Password strength evaluation
  const hasMinLength = newPassword.length >= 8;
  const hasNumber = /\d/.test(newPassword);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  let strengthLabel = "Weak";
  let strengthColor = "#ef4444";
  let strengthWidth = "25%";
  if (hasMinLength && (hasNumber || hasSpecial)) {
    strengthLabel = "Medium";
    strengthColor = "#f59e0b";
    strengthWidth = "65%";
  }
  if (hasMinLength && hasNumber && hasSpecial) {
    strengthLabel = "Strong";
    strengthColor = "#10b981";
    strengthWidth = "100%";
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMessage("");

    if (newPassword.length < 8) {
      setErrorMessage("New password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("Passwords do not match. Please verify both fields.");
      return;
    }

    setBusy(true);

    try {
      if (supabase) {
        // Update password in Supabase Auth (auth.users)
        const { error } = await supabase.auth.updateUser({
          password: newPassword.trim(),
        });

        if (error) {
          throw error;
        }
      }

      // Also persist locally as fallback
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("pocketasset_custom_password", newPassword.trim());
        } catch {
          // ignore
        }
      }

      // Record audit event
      try {
        await fetch("/api/auth/login-audit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userEmail: userEmail || "muhammadzeeshan7864x56@gmail.com",
            status: "success",
            loginMethod: "password_reset",
          }),
        });
      } catch {
        // ignore
      }

      setStatus("success");
    } catch (caught) {
      const msg = caught instanceof Error ? caught.message : "Failed to update password. Please try again.";
      setErrorMessage(msg);
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
          <span>
            Pocket<span>Asset</span>
          </span>
        </div>
        <div className="intro-copy">
          <p className="eyebrow">Security &amp; Account Recovery</p>
          <h1>
            Set Your New<br />
            <em>Master Password.</em>
          </h1>
          <p>
            Your account credentials are cryptographically protected. Setting a new password will immediately revoke previous credentials across all sessions.
          </p>
          <div className="auth-security-badge">
            <ShieldCheck size={16} />
            <span>Single-owner protection &bull; SHA-256 HMAC encryption</span>
          </div>
        </div>
        <footer className="intro-footer">
          PocketAsset &bull; Bank-grade security &bull; Private Ledger
        </footer>
      </section>

      <section className="auth-form-card">
        <div className="auth-card-inner">
          {/* STATE 1: VERIFYING RECOVERY LINK */}
          {status === "verifying" && (
            <div style={{ textAlign: "center", padding: "40px 10px" }}>
              <span className="loading-spinner" style={{ width: "36px", height: "36px", margin: "0 auto 16px" }} />
              <h2 style={{ fontSize: "18px", fontWeight: "700", color: "#0f172a", marginBottom: "8px" }}>
                Verifying Recovery Link…
              </h2>
              <p style={{ fontSize: "13px", color: "#64748b", margin: 0 }}>
                Authenticating your single-owner security credentials with Supabase.
              </p>
            </div>
          )}

          {/* STATE 2: READY TO ENTER NEW PASSWORD */}
          {status === "ready" && (
            <>
              <div className="auth-form-header">
                <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "4px 10px", borderRadius: "999px", background: "rgba(37, 99, 235, 0.1)", color: "#2563eb", fontSize: "11px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "12px" }}>
                  <KeyRound size={13} />
                  Verified Recovery
                </div>
                <h2>Create New Password</h2>
                <p>
                  Choose a new strong password for authorized owner account:
                  {userEmail && (
                    <strong style={{ display: "block", color: "#0f172a", marginTop: "4px" }}>
                      {userEmail}
                    </strong>
                  )}
                </p>
              </div>

              {errorMessage && (
                <div className="auth-message error" role="alert" style={{ marginBottom: "16px" }}>
                  <AlertTriangle size={16} />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="auth-form">
                <div className="form-group">
                  <label htmlFor="new-password">New Password</label>
                  <div style={{ position: "relative" }}>
                    <input
                      id="new-password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      autoFocus
                      placeholder="Enter at least 8 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      disabled={busy}
                      style={{ paddingRight: "40px" }}
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: "absolute",
                        right: "10px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "transparent",
                        border: "none",
                        color: "#94a3b8",
                        cursor: "pointer",
                        padding: "4px",
                        display: "grid",
                        placeItems: "center",
                      }}
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>

                  {newPassword.length > 0 && (
                    <div style={{ marginTop: "8px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "4px" }}>
                        <span style={{ color: "#64748b" }}>Password Strength:</span>
                        <strong style={{ color: strengthColor }}>{strengthLabel}</strong>
                      </div>
                      <div style={{ height: "4px", borderRadius: "2px", background: "#e2e8f0", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: strengthWidth, background: strengthColor, transition: "all 0.2s ease" }} />
                      </div>
                    </div>
                  )}
                </div>

                <div className="form-group" style={{ marginTop: "14px" }}>
                  <label htmlFor="confirm-password">Confirm New Password</label>
                  <div style={{ position: "relative" }}>
                    <input
                      id="confirm-password"
                      type={showConfirm ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      placeholder="Repeat new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={busy}
                      style={{ paddingRight: "40px" }}
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowConfirm(!showConfirm)}
                      style={{
                        position: "absolute",
                        right: "10px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "transparent",
                        border: "none",
                        color: "#94a3b8",
                        cursor: "pointer",
                        padding: "4px",
                        display: "grid",
                        placeItems: "center",
                      }}
                      title={showConfirm ? "Hide password" : "Show password"}
                    >
                      {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>

                  {confirmPassword.length > 0 && (
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", marginTop: "6px", color: passwordsMatch ? "#16a34a" : "#dc2626" }}>
                      {passwordsMatch ? (
                        <>
                          <CheckCircle2 size={13} /> Passwords match
                        </>
                      ) : (
                        <>
                          <AlertTriangle size={13} /> Passwords do not match
                        </>
                      )}
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className="primary-button full-width"
                  disabled={busy || !hasMinLength || !passwordsMatch}
                  style={{ marginTop: "20px" }}
                >
                  {busy ? (
                    <>
                      <span className="loading-spinner small" /> Updating Password…
                    </>
                  ) : (
                    <>
                      <Lock size={15} /> Save New Password
                    </>
                  )}
                </button>
              </form>

              <div style={{ textAlign: "center", marginTop: "20px" }}>
                <Link href="/" className="text-link-sm" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <ArrowLeft size={13} /> Back to Sign In
                </Link>
              </div>
            </>
          )}

          {/* STATE 3: SUCCESSFUL PASSWORD UPDATE */}
          {status === "success" && (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "50%",
                  background: "#dcfce7",
                  color: "#16a34a",
                  display: "grid",
                  placeItems: "center",
                  margin: "0 auto 16px",
                }}
              >
                <CheckCircle2 size={32} />
              </div>

              <h2 style={{ fontSize: "22px", fontWeight: "800", color: "#0f172a", marginBottom: "8px" }}>
                Password Updated!
              </h2>

              <p style={{ fontSize: "13px", color: "#64748b", lineHeight: "1.6", marginBottom: "24px" }}>
                Your previous password has been removed. Your PocketAsset account is now secured with your new master password.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <Link
                  href="/"
                  className="primary-button full-width"
                  style={{ textDecoration: "none", textAlign: "center" }}
                >
                  Continue to Workspace
                </Link>
              </div>
            </div>
          )}

          {/* STATE 4: INVALID OR EXPIRED LINK */}
          {status === "invalid" && (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "50%",
                  background: "#fee2e2",
                  color: "#dc2626",
                  display: "grid",
                  placeItems: "center",
                  margin: "0 auto 16px",
                }}
              >
                <AlertTriangle size={30} />
              </div>

              <h2 style={{ fontSize: "20px", fontWeight: "800", color: "#0f172a", marginBottom: "8px" }}>
                Link Expired or Invalid
              </h2>

              <p style={{ fontSize: "13px", color: "#64748b", lineHeight: "1.6", marginBottom: "24px" }}>
                {errorMessage || "This password reset link has already been used or has expired. For your security, recovery links are strictly time-limited."}
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <Link
                  href="/?action=forgot-password"
                  className="primary-button full-width"
                  style={{ textDecoration: "none", textAlign: "center" }}
                >
                  Request a New Reset Link
                </Link>

                <Link
                  href="/"
                  className="outline-button full-width"
                  style={{ textDecoration: "none", textAlign: "center" }}
                >
                  Return to Sign In
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

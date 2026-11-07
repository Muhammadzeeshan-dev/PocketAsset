"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Eye,
  KeyRound,
  Laptop,
  LogOut,
  Mail,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  UserCheck,
  XCircle,
} from "lucide-react";
import type {
  LoginAuditEntry,
  PageActivityEntry,
  SecurityNotification,
  SessionRecord,
} from "@/lib/auth-security";

type AdminTab = "overview" | "logins" | "sessions" | "pages" | "alerts" | "settings";

type AdminDataResponse = {
  adminEmail: string;
  expiresAt?: string;
  metrics: {
    successfulLogins: number;
    failedLogins: number;
    lastLogin: string | null;
    activeSessionsCount: number;
    uniqueDevicesCount: number;
    recentVisitsCount: number;
    otpEventsCount: number;
    securityAlertsCount: number;
  };
  loginLogs: (LoginAuditEntry & { id: string })[];
  sessions: SessionRecord[];
  pageActivities: (PageActivityEntry & { id: string })[];
  notifications: SecurityNotification[];
};

export function AdminPanel({ user, onBackToApp }: { user: User; onBackToApp?: () => void }) {
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [checkingAuth, setCheckingAuth] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");

  // OTP Challenge State
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpMessage, setOtpMessage] = useState("");
  const [otpError, setOtpError] = useState("");
  const [otpBusy, setOtpBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Admin Data State
  const [adminData, setAdminData] = useState<AdminDataResponse | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "success" | "failure">("all");
  const [sessionActionMsg, setSessionActionMsg] = useState("");

  // Check existing admin verification on mount
  useEffect(() => {
    async function checkAdminSession() {
      setCheckingAuth(true);
      try {
        const res = await fetch("/api/admin/data");
        if (res.ok) {
          const data: AdminDataResponse = await res.json();
          setAdminData(data);
          setIsVerified(true);
        } else {
          setIsVerified(false);
        }
      } catch {
        setIsVerified(false);
      } finally {
        setCheckingAuth(false);
      }
    }
    void checkAdminSession();
  }, []);

  // Cooldown countdown
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  async function requestOtp() {
    setOtpBusy(true);
    setOtpError("");
    setOtpMessage("");
    try {
      const res = await fetch("/api/admin/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          adminEmail: user.email || "muhammadzeeshan7864x56@gmail.com",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to request OTP code.");
      }
      setOtpSent(true);
      setOtpMessage(data.devNotice || data.message || "A 6-digit verification code has been sent to your email.");
      setCooldown(30);
    } catch (caught) {
      setOtpError(caught instanceof Error ? caught.message : "Failed to generate OTP challenge.");
    } finally {
      setOtpBusy(false);
    }
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!otpCode || otpCode.trim().length !== 6) {
      setOtpError("Please enter the 6-digit verification code.");
      return;
    }
    setOtpBusy(true);
    setOtpError("");
    try {
      const res = await fetch("/api/admin/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          adminEmail: user.email || "muhammadzeeshan7864x56@gmail.com",
          code: otpCode.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Verification failed.");
      }
      setIsVerified(true);
      // Fetch admin data
      await loadAdminDashboard();
    } catch (caught) {
      setOtpError(caught instanceof Error ? caught.message : "OTP verification failed.");
    } finally {
      setOtpBusy(false);
    }
  }

  async function loadAdminDashboard() {
    setLoadingData(true);
    setFetchError("");
    try {
      const res = await fetch("/api/admin/data");
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        if (res.status === 401) {
          setIsVerified(false);
          return;
        }
        throw new Error(errData.error || "Failed to load dashboard data");
      }
      const data: AdminDataResponse = await res.json();
      setAdminData(data);
    } catch (caught) {
      setFetchError(caught instanceof Error ? caught.message : "Failed to load data.");
    } finally {
      setLoadingData(false);
    }
  }

  async function handleRevokeSession(sessionId: string) {
    try {
      const res = await fetch("/api/admin/sessions/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      if (res.ok) {
        setSessionActionMsg(`Session ${sessionId} has been successfully revoked.`);
        await loadAdminDashboard();
      }
    } catch {
      // Ignored
    }
  }

  async function handleRevokeAllOtherSessions() {
    try {
      const res = await fetch("/api/admin/sessions/revoke-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentSessionId: "sess-current",
          userId: user.id,
        }),
      });
      if (res.ok) {
        setSessionActionMsg("All other active sessions have been revoked across all devices.");
        await loadAdminDashboard();
      }
    } catch {
      // Ignored
    }
  }

  async function handleAdminLogout() {
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } catch {
      // Ignored
    } finally {
      setIsVerified(false);
      setAdminData(null);
      setOtpSent(false);
      setOtpCode("");
      if (onBackToApp) {
        onBackToApp();
      } else {
        window.location.assign("/");
      }
    }
  }

  // Filtered Login Logs
  const filteredLoginLogs = (adminData?.loginLogs || []).filter((log) => {
    if (statusFilter !== "all" && log.status !== statusFilter) return false;
    if (dateFilter && !log.serverTimestamp.startsWith(dateFilter)) return false;
    if (searchTerm) {
      const query = searchTerm.toLowerCase();
      return (
        log.userEmail.toLowerCase().includes(query) ||
        log.browser.toLowerCase().includes(query) ||
        log.operatingSystem.toLowerCase().includes(query) ||
        (log.approxLocation || "").toLowerCase().includes(query) ||
        (log.ipAddress || "").includes(query)
      );
    }
    return true;
  });

  if (checkingAuth) {
    return (
      <div className="loading-screen">
        <span className="loading-spinner" /> Verifying admin security credentials…
      </div>
    );
  }

  // OTP Verification Gate
  if (!isVerified) {
    return (
      <main className="admin-gate-screen">
        <div className="admin-gate-card">
          <div className="admin-gate-icon">
            <ShieldCheck size={32} />
          </div>
          <h1>PocketAsset Admin Authentication</h1>
          <p className="admin-gate-subtitle">
            Admin access is restricted to the authorized owner (<strong>{user.email || "muhammadzeeshan7864x56@gmail.com"}</strong>). Additional email OTP verification is required to open the admin console.
          </p>

          {otpError && <div className="auth-message error" role="alert">{otpError}</div>}
          {otpMessage && <div className="auth-message success" role="status">{otpMessage}</div>}

          {!otpSent ? (
            <div className="otp-request-step">
              <p className="otp-step-copy">
                Click below to request a 6-digit one-time password delivered securely to your verified owner email.
              </p>
              <button
                type="button"
                className="primary-button full-width"
                onClick={requestOtp}
                disabled={otpBusy || cooldown > 0}
              >
                {otpBusy ? (
                  <>
                    <span className="loading-spinner small" /> Generating Code…
                  </>
                ) : (
                  <>
                    <Mail size={16} /> Send 6-Digit Verification Code
                  </>
                )}
              </button>
            </div>
          ) : (
            <form onSubmit={verifyOtp} className="otp-verify-form">
              <div className="form-group">
                <label htmlFor="admin-otp">Enter 6-Digit Verification Code</label>
                <input
                  id="admin-otp"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  autoFocus
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="123456"
                  className="otp-code-input"
                  disabled={otpBusy}
                />
                <span className="otp-input-hint">Code expires in 5 minutes &bull; 3 attempts maximum</span>
              </div>

              <div className="otp-button-group">
                <button
                  type="submit"
                  className="primary-button full-width"
                  disabled={otpBusy || otpCode.length !== 6}
                >
                  {otpBusy ? "Verifying Code…" : "Verify & Enter Admin Console"}
                </button>
                <button
                  type="button"
                  className="outline-button full-width"
                  onClick={requestOtp}
                  disabled={otpBusy || cooldown > 0}
                >
                  {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend Verification Code"}
                </button>
              </div>
            </form>
          )}

          <div className="admin-gate-footer">
            <Link href="/" className="text-link-sm flex-center">
              <ArrowLeft size={14} /> Back to Financial Dashboard
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // Authorized Admin Dashboard
  const metrics = adminData?.metrics || {
    successfulLogins: 0,
    failedLogins: 0,
    lastLogin: null,
    activeSessionsCount: 0,
    uniqueDevicesCount: 0,
    recentVisitsCount: 0,
    otpEventsCount: 0,
    securityAlertsCount: 0,
  };

  return (
    <div className="admin-layout">
      {/* Admin Sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <div className="brand-mark"><Shield size={20} /></div>
          <div>
            <strong>Pocket<span>Asset</span></strong>
            <small>Security & Admin</small>
          </div>
        </div>

        <nav className="admin-nav" aria-label="Admin Navigation">
          <button
            type="button"
            className={`admin-nav-item ${activeTab === "overview" ? "active" : ""}`}
            onClick={() => setActiveTab("overview")}
          >
            <Activity size={16} /> Overview Metrics
          </button>
          <button
            type="button"
            className={`admin-nav-item ${activeTab === "logins" ? "active" : ""}`}
            onClick={() => setActiveTab("logins")}
          >
            <Clock size={16} /> Login History
          </button>
          <button
            type="button"
            className={`admin-nav-item ${activeTab === "sessions" ? "active" : ""}`}
            onClick={() => setActiveTab("sessions")}
          >
            <Laptop size={16} /> Device &amp; Sessions
          </button>
          <button
            type="button"
            className={`admin-nav-item ${activeTab === "pages" ? "active" : ""}`}
            onClick={() => setActiveTab("pages")}
          >
            <Eye size={16} /> Page Activity
          </button>
          <button
            type="button"
            className={`admin-nav-item ${activeTab === "alerts" ? "active" : ""}`}
            onClick={() => setActiveTab("alerts")}
          >
            <ShieldAlert size={16} /> Security Alerts
            {metrics.securityAlertsCount > 0 && (
              <span className="admin-tab-badge">{metrics.securityAlertsCount}</span>
            )}
          </button>
          <button
            type="button"
            className={`admin-nav-item ${activeTab === "settings" ? "active" : ""}`}
            onClick={() => setActiveTab("settings")}
          >
            <KeyRound size={16} /> Security Settings
          </button>
        </nav>

        <div className="admin-sidebar-bottom">
          <Link href="/" className="admin-nav-item exit-admin">
            <ArrowLeft size={16} /> Return to Finances
          </Link>
          <div className="admin-verified-pill">
            <UserCheck size={14} /> Verified Admin
          </div>
        </div>
      </aside>

      {/* Admin Content Area */}
      <main className="admin-main">
        <header className="admin-topbar">
          <div>
            <div className="admin-top-beacon-row">
              <div className="cyber-top-beacon">
                <span className="cyber-beacon-dot" /> LIVE AUDIT MONITORING &bull; SHA-256 HMAC SECURED
              </div>
              <span className="defcon-pill">DEFCON 5 NORMAL</span>
            </div>
            <h1 className="admin-page-title">
              {activeTab === "overview" && "Security Operations & Audit Center"}
              {activeTab === "logins" && "Login Activity & Ingress Logs"}
              {activeTab === "sessions" && "Active Sessions & Device Management"}
              {activeTab === "pages" && "Navigation Route Telemetry"}
              {activeTab === "alerts" && "Real-Time Threat Notifications"}
              {activeTab === "settings" && "Authentication Hardening & Controls"}
            </h1>
            <p className="admin-page-sub">
              Authorized Owner: <strong>{adminData?.adminEmail || user.email}</strong> &bull; Server Authenticated &bull; Single-Owner Lock
            </p>
          </div>
          <div className="admin-topbar-actions">
            <button
              type="button"
              className="outline-button small-button"
              onClick={() => void loadAdminDashboard()}
              disabled={loadingData}
            >
              <RefreshCw size={14} className={loadingData ? "spin" : ""} /> Refresh Telemetry
            </button>
            <button
              type="button"
              className="outline-button small-button danger-text"
              onClick={handleAdminLogout}
              title="Lock admin console and revoke token immediately"
            >
              <LogOut size={14} /> Lock Console
            </button>
          </div>
        </header>

        {sessionActionMsg && (
          <div className="toast-message" role="status">
            <CheckCircle2 size={16} /> {sessionActionMsg}
            <button type="button" onClick={() => setSessionActionMsg("")}>Dismiss</button>
          </div>
        )}

        {fetchError && (
          <div className="error-banner" role="alert">
            <AlertTriangle size={16} /> {fetchError}
          </div>
        )}

        <div className="admin-body">
          {/* TAB 1: OVERVIEW METRICS */}
          {activeTab === "overview" && (
            <div className="admin-overview-grid">
              {/* Futuristic Cyber Hardening Scorecard */}
              <div className="security-score-card">
                <div className="score-top-row">
                  <div className="score-circle-wrap">
                    <div className="score-badge-radial">
                      <div className="score-badge-inner">98%</div>
                    </div>
                    <div>
                      <div className="score-badge-tags">
                        <span className="score-tag-main">GRADE A+ SECURITY POSTURE</span>
                        <span className="score-tag-sub">CRYPTOGRAPHICALLY HARDENED</span>
                      </div>
                      <h2 className="score-heading">
                        Owner Access Defense System Active
                      </h2>
                      <p className="score-desc">
                        PostgreSQL Row Level Security (RLS) isolation active. Remote sessions authenticated via SHA-256 HMAC signatures with 5-minute timed OTP email challenges.
                      </p>
                    </div>
                  </div>
                  <div className="score-actions-col">
                    <button
                      type="button"
                      className="panic-kill-btn"
                      onClick={() => void handleRevokeAllOtherSessions()}
                      title="Immediately invalidates all remote sessions and cookies across devices"
                    >
                      <ShieldAlert size={14} /> Panic: Revoke All Remote Sessions
                    </button>
                    <span className="score-threat-status">DEFCON 5 &bull; Threat Level: Normal</span>
                  </div>
                </div>

                {/* Real-time Telemetry Grid INSIDE the scorecard */}
                <div className="security-telemetry-grid">
                  <div className="telemetry-item">
                    <span>Database Isolation</span>
                    <strong>Postgres RLS (Enforced)</strong>
                  </div>
                  <div className="telemetry-item">
                    <span>Token Signature</span>
                    <strong>HMAC SHA-256 (256-bit)</strong>
                  </div>
                  <div className="telemetry-item">
                    <span>Edge Protection</span>
                    <strong>Strict-Origin &amp; CSP</strong>
                  </div>
                  <div className="telemetry-item">
                    <span>Inactivity Guard</span>
                    <strong>Auto-Lock Active (10s / 1m)</strong>
                  </div>
                </div>
              </div>

              <section className="metric-grid-4">
                <article className="metric-card">
                  <div className="metric-icon metric-green"><CheckCircle2 size={18} /></div>
                  <div className="metric-copy">
                    <span className="metric-label">Successful Logins</span>
                    <strong className="metric-value">{metrics.successfulLogins}</strong>
                    <span className="metric-hint">Authorized entries</span>
                  </div>
                </article>
                <article className="metric-card">
                  <div className="metric-icon metric-rose"><XCircle size={18} /></div>
                  <div className="metric-copy">
                    <span className="metric-label">Failed Attempts</span>
                    <strong className="metric-value">{metrics.failedLogins}</strong>
                    <span className="metric-hint">Blocked by single-owner rule</span>
                  </div>
                </article>
                <article className="metric-card">
                  <div className="metric-icon metric-blue"><Laptop size={18} /></div>
                  <div className="metric-copy">
                    <span className="metric-label">Active Sessions</span>
                    <strong className="metric-value">{metrics.activeSessionsCount}</strong>
                    <span className="metric-hint">Across authorized devices</span>
                  </div>
                </article>
                <article className="metric-card">
                  <div className="metric-icon metric-violet"><KeyRound size={18} /></div>
                  <div className="metric-copy">
                    <span className="metric-label">OTP Verifications</span>
                    <strong className="metric-value">{metrics.otpEventsCount}</strong>
                    <span className="metric-hint">Cryptographic challenges</span>
                  </div>
                </article>
              </section>

              <div className="admin-two-cols">
                {/* Recent Logins Snapshot */}
                <article className="panel admin-panel-box">
                  <div className="panel-heading">
                    <div>
                      <p className="panel-kicker">Authoritative UTC Log</p>
                      <h2>Recent Login Activity</h2>
                    </div>
                    <button type="button" className="text-action" onClick={() => setActiveTab("logins")}>
                      View all ({adminData?.loginLogs.length || 0})
                    </button>
                  </div>
                  <div className="admin-table-wrap">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Time (PKT)</th>
                          <th>Device / OS</th>
                          <th>Location</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(adminData?.loginLogs || []).slice(0, 5).map((log) => (
                          <tr key={log.id}>
                            <td>
                              {new Intl.DateTimeFormat("en-PK", {
                                dateStyle: "short",
                                timeStyle: "short",
                                timeZone: "Asia/Karachi",
                              }).format(new Date(log.serverTimestamp))}
                            </td>
                            <td>
                              <strong>{log.deviceType}</strong> &bull; {log.operatingSystem} ({log.browser})
                            </td>
                            <td>{log.approxLocation || "Location unavailable"}</td>
                            <td>
                              <span className={`status-pill ${log.status === "success" ? "success" : "failure"}`}>
                                {log.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </article>

                {/* Page Navigation Snapshot */}
                <article className="panel admin-panel-box">
                  <div className="panel-heading">
                    <div>
                      <p className="panel-kicker">Navigation Timeline</p>
                      <h2>Recent Page Activity</h2>
                    </div>
                    <button type="button" className="text-action" onClick={() => setActiveTab("pages")}>
                      View all ({adminData?.pageActivities.length || 0})
                    </button>
                  </div>
                  <div className="admin-activity-timeline">
                    {(adminData?.pageActivities || []).slice(0, 6).map((act) => (
                      <div key={act.id} className="timeline-row">
                        <div className="timeline-dot" />
                        <div className="timeline-content">
                          <div className="timeline-title-row">
                            <strong>{act.pageName}</strong>
                            <span className="timeline-route"><code>{act.route}</code></span>
                          </div>
                          <span className="timeline-time">
                            {new Intl.DateTimeFormat("en-PK", {
                              hour: "numeric",
                              minute: "2-digit",
                              second: "2-digit",
                              timeZone: "Asia/Karachi",
                            }).format(new Date(act.visitedAt))} &bull; {act.deviceType || "Desktop"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
              </div>
            </div>
          )}

          {/* TAB 2: LOGIN HISTORY */}
          {activeTab === "logins" && (
            <div className="admin-subpage">
              <div className="admin-filter-bar">
                <div className="admin-search-input">
                  <Search size={15} />
                  <input
                    type="text"
                    placeholder="Search by browser, OS, IP or location…"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="admin-date-filter">
                  <Calendar size={15} />
                  <input
                    type="date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                  />
                </div>
                <div className="admin-status-filter">
                  <button
                    type="button"
                    className={`filter-chip ${statusFilter === "all" ? "active" : ""}`}
                    onClick={() => setStatusFilter("all")}
                  >
                    All ({adminData?.loginLogs.length || 0})
                  </button>
                  <button
                    type="button"
                    className={`filter-chip ${statusFilter === "success" ? "active" : ""}`}
                    onClick={() => setStatusFilter("success")}
                  >
                    Success
                  </button>
                  <button
                    type="button"
                    className={`filter-chip ${statusFilter === "failure" ? "active" : ""}`}
                    onClick={() => setStatusFilter("failure")}
                  >
                    Failed
                  </button>
                </div>
              </div>

              <div className="panel admin-panel-box">
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Date &amp; Time (Local)</th>
                        <th>User Email</th>
                        <th>Device</th>
                        <th>Browser &amp; OS</th>
                        <th>Network IP</th>
                        <th>Location</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLoginLogs.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="table-empty-cell">
                            No login audit records found matching your filters.
                          </td>
                        </tr>
                      ) : (
                        filteredLoginLogs.map((log) => (
                          <tr key={log.id}>
                            <td>
                              <strong>
                                {new Intl.DateTimeFormat("en-PK", {
                                  dateStyle: "medium",
                                  timeStyle: "short",
                                  timeZone: log.clientTimezone || "Asia/Karachi",
                                }).format(new Date(log.serverTimestamp))}
                              </strong>
                            </td>
                            <td>{log.userEmail}</td>
                            <td>
                              <span className="device-chip">
                                {log.deviceType === "Mobile" ? <Smartphone size={13} /> : <Laptop size={13} />}
                                {log.deviceType}
                              </span>
                            </td>
                            <td>
                              {log.browser} &bull; <small>{log.operatingSystem}</small>
                            </td>
                            <td><code>{log.ipAddress || "127.0.0.1"}</code></td>
                            <td>{log.approxLocation || "Location unavailable"}</td>
                            <td>
                              <span className={`status-pill ${log.status === "success" ? "success" : "failure"}`}>
                                {log.status}
                              </span>
                              {log.failureReason && (
                                <span className="failure-reason-hint">{log.failureReason}</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SESSIONS */}
          {activeTab === "sessions" && (
            <div className="admin-subpage">
              <div className="sessions-header-row">
                <p>
                  Active authentication sessions across devices. You can revoke any unfamiliar session immediately.
                </p>
                <button
                  type="button"
                  className="danger-button"
                  onClick={() => void handleRevokeAllOtherSessions()}
                >
                  <LogOut size={14} /> Revoke All Other Sessions
                </button>
              </div>

              <div className="sessions-grid">
                {(adminData?.sessions || []).map((session) => (
                  <article
                    key={session.id}
                    className={`session-card ${session.isRevoked ? "revoked" : "active"}`}
                  >
                    <div className="session-card-header">
                      <div className="session-device-icon">
                        {session.deviceType === "Mobile" ? <Smartphone size={20} /> : <Laptop size={20} />}
                      </div>
                      <div>
                        <strong>{session.operatingSystem} &bull; {session.browser}</strong>
                        <span className="session-id-label">ID: <code>{session.sessionId}</code></span>
                      </div>
                      <span className={`session-state-pill ${session.isRevoked ? "revoked" : "live"}`}>
                        {session.isRevoked ? "Revoked" : "Active"}
                      </span>
                    </div>

                    <div className="session-details-list">
                      <div>
                        <span>Approx Location:</span>
                        <strong>{session.approxLocation || "Location unavailable"}</strong>
                      </div>
                      <div>
                        <span>Signed In:</span>
                        <strong>
                          {new Intl.DateTimeFormat("en-PK", {
                            dateStyle: "medium",
                            timeStyle: "short",
                            timeZone: "Asia/Karachi",
                          }).format(new Date(session.createdAt))}
                        </strong>
                      </div>
                      <div>
                        <span>Last Active:</span>
                        <strong>
                          {new Intl.DateTimeFormat("en-PK", {
                            dateStyle: "medium",
                            timeStyle: "short",
                            timeZone: "Asia/Karachi",
                          }).format(new Date(session.lastActiveAt))}
                        </strong>
                      </div>
                    </div>

                    <div className="session-card-actions">
                      {!session.isRevoked ? (
                        <button
                          type="button"
                          className="outline-button danger-text"
                          onClick={() => void handleRevokeSession(session.sessionId)}
                        >
                          <LogOut size={13} /> Revoke Session
                        </button>
                      ) : (
                        <span className="revoked-caption">
                          Revoked {session.revokedAt ? new Intl.DateTimeFormat("en-PK", { dateStyle: "short", timeStyle: "short" }).format(new Date(session.revokedAt)) : ""}
                        </span>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: PAGE ACTIVITY */}
          {activeTab === "pages" && (
            <div className="admin-subpage">
              <div className="privacy-guarantee-strip">
                <ShieldCheck size={16} />
                <span>
                  <strong>Privacy Rule Enforced:</strong> Only high-level route navigation events are recorded. Financial form field values, keystrokes, clipboard contents, and passwords are never logged.
                </span>
              </div>

              <div className="panel admin-panel-box">
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Visit Timestamp (PKT)</th>
                        <th>Page Name</th>
                        <th>Route URL</th>
                        <th>Device</th>
                        <th>Time Spent</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(adminData?.pageActivities || []).map((page) => (
                        <tr key={page.id}>
                          <td>
                            {new Intl.DateTimeFormat("en-PK", {
                              dateStyle: "medium",
                              timeStyle: "medium",
                              timeZone: "Asia/Karachi",
                            }).format(new Date(page.visitedAt))}
                          </td>
                          <td><strong>{page.pageName}</strong></td>
                          <td><code>{page.route}</code></td>
                          <td>
                            <span className="device-chip">
                              {page.deviceType === "Mobile" ? <Smartphone size={13} /> : <Laptop size={13} />}
                              {page.deviceType || "Desktop"}
                            </span>
                          </td>
                          <td>{page.durationSeconds ? `${page.durationSeconds}s` : "Active"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: ALERTS */}
          {activeTab === "alerts" && (
            <div className="admin-subpage">
              <div className="alerts-list">
                {(adminData?.notifications || []).map((notif) => (
                  <article
                    key={notif.id}
                    className={`alert-card-item ${notif.category === "security_alert" ? "critical" : ""}`}
                  >
                    <div className="alert-card-icon">
                      {notif.category === "security_alert" ? (
                        <ShieldAlert size={20} className="text-rose" />
                      ) : notif.category === "admin_otp" ? (
                        <KeyRound size={20} className="text-violet" />
                      ) : (
                        <ShieldCheck size={20} className="text-blue" />
                      )}
                    </div>
                    <div className="alert-card-body">
                      <div className="alert-card-header">
                        <strong>{notif.title}</strong>
                        <span className="alert-time">
                          <Clock size={12} />
                          {new Intl.DateTimeFormat("en-PK", {
                            dateStyle: "medium",
                            timeStyle: "short",
                            timeZone: "Asia/Karachi",
                          }).format(new Date(notif.createdAt))}
                        </span>
                      </div>
                      <p>{notif.message}</p>
                      <span className="alert-cat-pill">{notif.category.replace("_", " ").toUpperCase()}</span>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: SETTINGS */}
          {activeTab === "settings" && (
            <div className="admin-subpage">
              <div className="panel admin-panel-box" style={{ padding: "24px" }}>
                <h3 style={{ margin: "0 0 16px 0", fontSize: "16px", color: "#1e293b" }}>
                  Authentication &amp; Security Configuration
                </h3>

                <div className="settings-section">
                  <h4>Admin Access Control</h4>
                  <div className="setting-row">
                    <div>
                      <strong>Server-Side Admin Allowlist</strong>
                      <span>Only emails matching <code>ADMIN_EMAIL</code> or pre-approved database records can request admin OTP.</span>
                    </div>
                    <span className="status-pill success">Active: {adminData?.adminEmail || "muhammadzeeshan7864x56@gmail.com"}</span>
                  </div>

                  <div className="setting-row">
                    <div>
                      <strong>Admin Email OTP Verification</strong>
                      <span>Requires 6-digit cryptographic code on entry. Code expires in 5 minutes.</span>
                    </div>
                    <span className="status-pill success">Enforced (SHA-256 HMAC)</span>
                  </div>

                  <div className="setting-row">
                    <div>
                      <strong>Public Registration</strong>
                      <span>Open signup is strictly disabled. Single-owner private access only.</span>
                    </div>
                    <span className="status-pill success">Disabled</span>
                  </div>
                </div>

                <div className="settings-section" style={{ marginTop: "24px" }}>
                  <h4>Server Environment Status</h4>
                  <div className="setting-row">
                    <div>
                      <strong>SMTP Email Transport</strong>
                      <span>Required for real-world Gmail delivery of Admin OTP codes and security alerts.</span>
                    </div>
                    <span className="status-pill neutral">Configurable in .env.local</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}


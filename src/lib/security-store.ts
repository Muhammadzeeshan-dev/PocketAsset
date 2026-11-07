import { getSupabaseServerClient } from "./supabase-server";
import {
  type DeviceType,
  type LoginAuditEntry,
  type PageActivityEntry,
  type SecurityNotification,
  type SessionRecord,
} from "./auth-security";

type DbLoginAuditRow = {
  id: string;
  user_id?: string | null;
  user_email: string;
  session_id?: string | null;
  server_timestamp: string;
  client_timezone?: string | null;
  device_type: DeviceType;
  browser: string;
  operating_system: string;
  ip_address?: string | null;
  approx_location?: string | null;
  login_method: "password" | "otp" | "demo";
  status: "success" | "failure";
  failure_reason?: string | null;
};

type DbSessionRow = {
  id: string;
  session_id: string;
  user_id: string;
  user_email: string;
  device_type: DeviceType;
  browser: string;
  operating_system: string;
  approx_location: string;
  ip_address?: string;
  created_at: string;
  last_active_at: string;
  expires_at: string;
  is_revoked: boolean;
  revoked_at?: string | null;
  revoked_reason?: string | null;
};

type DbPageActivityRow = {
  id: string;
  user_id: string;
  session_id?: string | null;
  page_name: string;
  route: string;
  visited_at: string;
  duration_seconds: number;
  device_type: DeviceType;
};

type DbNotificationRow = {
  id: string;
  user_id: string;
  category: SecurityNotification["category"];
  title: string;
  message: string;
  is_read: boolean;
  read_at?: string | null;
  created_at: string;
};

// In-memory fallback stores for demo mode or local verification without live Supabase
let memoryLoginLogs: (LoginAuditEntry & { id: string })[] = [
  {
    id: "log-1",
    userId: "demo-user-1",
    userEmail: "zeeshan@pocketasset.pk",
    sessionId: "sess-current",
    serverTimestamp: "2026-11-06T10:00:00.000Z",
    clientTimezone: "Asia/Karachi",
    deviceType: "Desktop",
    browser: "Google Chrome",
    operatingSystem: "Windows 10/11",
    ipAddress: "127.0.0.1",
    approxLocation: "Islamabad, Pakistan",
    loginMethod: "password",
    status: "success",
  },
  {
    id: "log-2",
    userId: "demo-user-1",
    userEmail: "zeeshan@pocketasset.pk",
    sessionId: "sess-laptop-1",
    serverTimestamp: "2026-11-05T14:30:00.000Z",
    clientTimezone: "Asia/Karachi",
    deviceType: "Laptop",
    browser: "Mozilla Firefox",
    operatingSystem: "Windows 10/11",
    ipAddress: "127.0.0.1",
    approxLocation: "Rawalpindi, Pakistan",
    loginMethod: "password",
    status: "success",
  },
  {
    id: "log-3",
    userId: null,
    userEmail: "intruder@suspicious.org",
    sessionId: null,
    serverTimestamp: "2026-11-05T03:15:00.000Z",
    clientTimezone: "UTC",
    deviceType: "Desktop",
    browser: "Unknown Browser",
    operatingSystem: "Linux",
    ipAddress: "198.51.100.42",
    approxLocation: "Unknown Location",
    loginMethod: "password",
    status: "failure",
    failureReason: "Account not authorized (Single-owner platform)",
  },
];

let memorySessions: SessionRecord[] = [
  {
    id: "sess-rec-1",
    sessionId: "sess-current",
    userId: "demo-user-1",
    userEmail: "zeeshan@pocketasset.pk",
    deviceType: "Desktop",
    browser: "Google Chrome",
    operatingSystem: "Windows 10/11",
    approxLocation: "Islamabad, Pakistan",
    ipAddress: "127.0.0.1",
    createdAt: "2026-11-06T10:00:00.000Z",
    lastActiveAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    isRevoked: false,
  },
  {
    id: "sess-rec-2",
    sessionId: "sess-mobile-1",
    userId: "demo-user-1",
    userEmail: "zeeshan@pocketasset.pk",
    deviceType: "Mobile",
    browser: "Apple Safari",
    operatingSystem: "iOS",
    approxLocation: "Islamabad, Pakistan",
    ipAddress: "127.0.0.1",
    createdAt: "2026-11-04T18:20:00.000Z",
    lastActiveAt: "2026-11-04T22:10:00.000Z",
    expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
    isRevoked: false,
  },
];

let memoryPageActivities: (PageActivityEntry & { id: string })[] = [
  {
    id: "act-1",
    userId: "demo-user-1",
    sessionId: "sess-current",
    pageName: "Overview Dashboard",
    route: "/",
    visitedAt: "2026-11-06T10:01:00.000Z",
    durationSeconds: 120,
    deviceType: "Desktop",
  },
  {
    id: "act-2",
    userId: "demo-user-1",
    sessionId: "sess-current",
    pageName: "Daily Money Tracker",
    route: "/daily",
    visitedAt: "2026-11-06T10:03:00.000Z",
    durationSeconds: 240,
    deviceType: "Desktop",
  },
  {
    id: "act-3",
    userId: "demo-user-1",
    sessionId: "sess-current",
    pageName: "Financial Calendar",
    route: "/calendar",
    visitedAt: "2026-11-06T10:07:00.000Z",
    durationSeconds: 180,
    deviceType: "Desktop",
  },
  {
    id: "act-4",
    userId: "demo-user-1",
    sessionId: "sess-current",
    pageName: "PSX Investments",
    route: "/investments",
    visitedAt: "2026-11-06T10:10:00.000Z",
    durationSeconds: 300,
    deviceType: "Desktop",
  },
];

const memoryNotifications: SecurityNotification[] = [
  {
    id: "notif-1",
    userId: "demo-user-1",
    category: "login",
    title: "New login confirmed",
    message: "Successful login from Windows 10/11 using Google Chrome at 10:00 AM.",
    isRead: false,
    createdAt: "2026-11-06T10:00:00.000Z",
  },
  {
    id: "notif-2",
    userId: "demo-user-1",
    category: "admin_otp",
    title: "Admin authorization verified",
    message: "Admin OTP was successfully verified for zeeshan@pocketasset.pk.",
    isRead: true,
    readAt: "2026-11-06T09:30:00.000Z",
    createdAt: "2026-11-06T09:25:00.000Z",
  },
  {
    id: "notif-3",
    userId: "demo-user-1",
    category: "security_alert",
    title: "Unauthorized registration blocked",
    message: "A public registration attempt was rejected by single-owner access controls.",
    isRead: false,
    createdAt: "2026-11-05T03:15:00.000Z",
  },
];

type MemoryOtpChallenge = {
  id: string;
  userId: string;
  adminEmail: string;
  otpHash: string;
  attempts: number;
  maxAttempts: number;
  expiresAt: Date;
  isUsed: boolean;
  createdAt: Date;
};

const memoryOtpChallenges: MemoryOtpChallenge[] = [];

/**
 * Record a login audit event.
 */
export async function recordLoginAudit(entry: LoginAuditEntry): Promise<void> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      await supabase.from("login_audit_logs").insert({
        user_id: entry.userId || null,
        user_email: entry.userEmail,
        session_id: entry.sessionId || null,
        server_timestamp: entry.serverTimestamp,
        client_timezone: entry.clientTimezone || null,
        device_type: entry.deviceType,
        browser: entry.browser,
        operating_system: entry.operatingSystem,
        ip_address: entry.ipAddress || null,
        approx_location: entry.approxLocation || "Location unavailable",
        login_method: entry.loginMethod,
        status: entry.status,
        failure_reason: entry.failureReason || null,
      });
      return;
    } catch {
      // Fallback to memory below
    }
  }

  memoryLoginLogs = [
    { ...entry, id: `log-${Date.now()}` },
    ...memoryLoginLogs.slice(0, 99),
  ];
}

/**
 * Record or update session.
 */
export async function recordSession(session: SessionRecord): Promise<void> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      await supabase.from("session_records").upsert({
        session_id: session.sessionId,
        user_id: session.userId,
        user_email: session.userEmail,
        device_type: session.deviceType,
        browser: session.browser,
        operating_system: session.operatingSystem,
        approx_location: session.approxLocation,
        ip_address: session.ipAddress,
        created_at: session.createdAt,
        last_active_at: session.lastActiveAt,
        expires_at: session.expiresAt,
        is_revoked: session.isRevoked,
      }, { onConflict: "session_id" });
      return;
    } catch {
      // Fallback to memory
    }
  }

  const existing = memorySessions.find((s) => s.sessionId === session.sessionId);
  if (existing) {
    Object.assign(existing, session);
  } else {
    memorySessions = [session, ...memorySessions];
  }
}

/**
 * Inactivity window: 5 minutes (300 seconds) + 60 seconds warning countdown grace period.
 * Authoritative server-side policy: 360,000 milliseconds (6 minutes).
 */
export const MAX_SESSION_INACTIVITY_MS = 6 * 60 * 1000;

/**
 * Checks whether a given sessionId has been marked as revoked or has expired,
 * or has exceeded the 5-minute inactivity limit (+60s warning grace) on the server.
 * If revoked, expired, inactive, or not found: returns true (access revoked/terminated).
 */
export async function isSessionRevoked(sessionId?: string | null): Promise<boolean> {
  if (!sessionId) return true;
  const now = Date.now();
  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("session_records")
        .select("is_revoked, expires_at, last_active_at")
        .eq("session_id", sessionId)
        .maybeSingle();

      if (!error && data) {
        if (data.is_revoked) return true;
        if (new Date(data.expires_at).getTime() < now) return true;

        // Authoritatively enforce server-side 5-minute inactivity policy
        const lastActiveTime = new Date(data.last_active_at).getTime();
        if (now - lastActiveTime > MAX_SESSION_INACTIVITY_MS) {
          // Authoritatively revoke timed-out session on server
          await supabase
            .from("session_records")
            .update({
              is_revoked: true,
              revoked_at: new Date(now).toISOString(),
              revoked_reason: "Inactivity timeout (exceeded 5 minutes + warning grace)",
            })
            .eq("session_id", sessionId);
          return true;
        }

        return false;
      } else {
        // Unknown or non-existent session in database
        if (process.env.NODE_ENV === "production" || !error) {
          return true;
        }
      }
    } catch {
      // Fallback to memory
    }
  }

  const found = memorySessions.find((s) => s.sessionId === sessionId);
  if (found) {
    if (found.isRevoked) return true;
    if (new Date(found.expiresAt).getTime() < now) return true;

    // Enforce server-side inactivity in memory store
    const lastActiveTime = new Date(found.lastActiveAt).getTime();
    if (now - lastActiveTime > MAX_SESSION_INACTIVITY_MS) {
      found.isRevoked = true;
      found.revokedAt = new Date(now).toISOString();
      found.revokedReason = "Inactivity timeout (exceeded 5 minutes + warning grace)";
      return true;
    }

    return false;
  }

  // Not found in memory store -> invalid/revoked
  return true;
}

/**
 * Revoke session.
 */
export async function revokeSessionById(sessionId: string): Promise<boolean> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("session_records")
        .update({ is_revoked: true, revoked_at: now, revoked_reason: "Manual revocation by admin owner" })
        .eq("session_id", sessionId);
      if (!error) return true;
    } catch {
      // Fallback to memory
    }
  }

  const found = memorySessions.find((s) => s.sessionId === sessionId);
  if (found) {
    found.isRevoked = true;
    found.revokedAt = new Date().toISOString();
    found.revokedReason = "Manual revocation by admin owner";
    return true;
  }
  return false;
}

/**
 * Update the last_active_at timestamp for a session.
 * Rejects and terminates if the session is already revoked or timed out.
 */
export async function touchSessionActivity(sessionId: string): Promise<boolean> {
  if (!sessionId) return false;
  const revoked = await isSessionRevoked(sessionId);
  if (revoked) return false;

  const now = new Date().toISOString();
  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      const { error } = await supabase
        .from("session_records")
        .update({ last_active_at: now })
        .eq("session_id", sessionId)
        .eq("is_revoked", false);
      if (!error) return true;
    } catch {
      // Fallback
    }
  }

  const found = memorySessions.find((s) => s.sessionId === sessionId);
  if (found && !found.isRevoked) {
    found.lastActiveAt = now;
    return true;
  }
  return false;
}

/**
 * Extend an active session expiration and reset last_active_at.
 * Rejects immediately if the session has exceeded the 5-minute inactivity policy.
 */
export async function extendSession(
  sessionId: string,
  additionalHours = 24,
): Promise<{ success: boolean; error?: string; expiresAt?: string }> {
  if (!sessionId) return { success: false, error: "sessionId is required" };
  const revoked = await isSessionRevoked(sessionId);
  if (revoked) {
    return { success: false, error: "Session has been revoked or expired due to inactivity" };
  }

  const now = new Date();
  const newExpiresAt = new Date(now.getTime() + additionalHours * 60 * 60 * 1000).toISOString();
  const nowIso = now.toISOString();

  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      const { error } = await supabase
        .from("session_records")
        .update({
          last_active_at: nowIso,
          expires_at: newExpiresAt,
        })
        .eq("session_id", sessionId)
        .eq("is_revoked", false);
      if (!error) {
        return { success: true, expiresAt: newExpiresAt };
      }
    } catch {
      // Fallback
    }
  }

  const found = memorySessions.find((s) => s.sessionId === sessionId);
  if (found && !found.isRevoked) {
    found.lastActiveAt = nowIso;
    found.expiresAt = newExpiresAt;
    return { success: true, expiresAt: newExpiresAt };
  }

  return { success: true, expiresAt: newExpiresAt };
}

/**
 * Revoke all sessions except the current one.
 */
export async function revokeAllOtherSessions(currentSessionId: string, userId: string): Promise<number> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      const now = new Date().toISOString();
      const { data } = await supabase
        .from("session_records")
        .update({ is_revoked: true, revoked_at: now, revoked_reason: "Revoke all other devices" })
        .eq("user_id", userId)
        .neq("session_id", currentSessionId)
        .eq("is_revoked", false)
        .select("id");
      return (data || []).length;
    } catch {
      // Fallback to memory
    }
  }

  let count = 0;
  for (const s of memorySessions) {
    if (s.userId === userId && s.sessionId !== currentSessionId && !s.isRevoked) {
      s.isRevoked = true;
      s.revokedAt = new Date().toISOString();
      s.revokedReason = "Revoke all other devices";
      count++;
    }
  }
  return count;
}

/**
 * Record a page visit (strictly routes only, no sensitive payload).
 */
export async function recordPageActivity(entry: PageActivityEntry): Promise<void> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      await supabase.from("page_activity_logs").insert({
        user_id: entry.userId,
        session_id: entry.sessionId || null,
        page_name: entry.pageName,
        route: entry.route,
        visited_at: entry.visitedAt,
        duration_seconds: entry.durationSeconds || 0,
        device_type: entry.deviceType || "Desktop",
      });
      return;
    } catch {
      // Fallback to memory
    }
  }

  memoryPageActivities = [
    { ...entry, id: `act-${Date.now()}` },
    ...memoryPageActivities.slice(0, 199),
  ];
}

/**
 * Query login audit logs.
 */
export async function getLoginAuditLogs(limit = 100): Promise<(LoginAuditEntry & { id: string })[]> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("login_audit_logs")
        .select("*")
        .order("server_timestamp", { ascending: false })
        .limit(limit);
      if (!error && data) {
        return (data as unknown as DbLoginAuditRow[]).map((row) => ({
          id: row.id,
          userId: row.user_id,
          userEmail: row.user_email,
          sessionId: row.session_id,
          serverTimestamp: row.server_timestamp,
          clientTimezone: row.client_timezone,
          deviceType: row.device_type,
          browser: row.browser,
          operatingSystem: row.operating_system,
          ipAddress: row.ip_address,
          approxLocation: row.approx_location,
          loginMethod: row.login_method,
          status: row.status,
          failureReason: row.failure_reason,
        }));
      }
    } catch {
      // Fallback
    }
  }
  return memoryLoginLogs.slice(0, limit);
}

/**
 * Query session records.
 */
export async function getSessionRecords(): Promise<SessionRecord[]> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("session_records")
        .select("*")
        .order("created_at", { ascending: false });
      if (!error && data) {
        return (data as unknown as DbSessionRow[]).map((row) => ({
          id: row.id,
          sessionId: row.session_id,
          userId: row.user_id,
          userEmail: row.user_email,
          deviceType: row.device_type,
          browser: row.browser,
          operatingSystem: row.operating_system,
          approxLocation: row.approx_location,
          ipAddress: row.ip_address,
          createdAt: row.created_at,
          lastActiveAt: row.last_active_at,
          expiresAt: row.expires_at,
          isRevoked: row.is_revoked,
          revokedAt: row.revoked_at,
          revokedReason: row.revoked_reason,
        }));
      }
    } catch {
      // Fallback
    }
  }
  return memorySessions;
}

/**
 * Query page activity logs.
 */
export async function getPageActivityLogs(limit = 100): Promise<(PageActivityEntry & { id: string })[]> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("page_activity_logs")
        .select("*")
        .order("visited_at", { ascending: false })
        .limit(limit);
      if (!error && data) {
        return (data as unknown as DbPageActivityRow[]).map((row) => ({
          id: row.id,
          userId: row.user_id,
          sessionId: row.session_id,
          pageName: row.page_name,
          route: row.route,
          visitedAt: row.visited_at,
          durationSeconds: row.duration_seconds,
          deviceType: row.device_type,
        }));
      }
    } catch {
      // Fallback
    }
  }
  return memoryPageActivities.slice(0, limit);
}

/**
 * Query security notifications.
 */
export async function getSecurityNotifications(): Promise<SecurityNotification[]> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("security_notifications")
        .select("*")
        .order("created_at", { ascending: false });
      if (!error && data) {
        return (data as unknown as DbNotificationRow[]).map((row) => ({
          id: row.id,
          userId: row.user_id,
          category: row.category,
          title: row.title,
          message: row.message,
          isRead: row.is_read,
          readAt: row.read_at,
          createdAt: row.created_at,
        }));
      }
    } catch {
      // Fallback
    }
  }
  return memoryNotifications;
}

/**
 * Mark notification as read.
 */
export async function markNotificationAsRead(id?: string): Promise<void> {
  const supabase = getSupabaseServerClient();
  const now = new Date().toISOString();
  if (supabase) {
    try {
      if (id) {
        await supabase.from("security_notifications").update({ is_read: true, read_at: now }).eq("id", id);
      } else {
        await supabase.from("security_notifications").update({ is_read: true, read_at: now }).eq("is_read", false);
      }
      return;
    } catch {
      // Fallback
    }
  }

  if (id) {
    const notif = memoryNotifications.find((n) => n.id === id);
    if (notif) {
      notif.isRead = true;
      notif.readAt = now;
    }
  } else {
    for (const notif of memoryNotifications) {
      notif.isRead = true;
      notif.readAt = now;
    }
  }
}

/**
 * Store OTP Challenge (Hashed).
 */
export async function storeOtpChallenge(
  userId: string,
  adminEmail: string,
  otpHash: string,
  expiresAt: Date,
): Promise<void> {
  // Invalidate previous challenges in memory
  for (const challenge of memoryOtpChallenges) {
    if (challenge.userId === userId) {
      challenge.isUsed = true;
    }
  }

  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      // Invalidate existing unused challenges for this user
      await supabase
        .from("admin_otp_challenges")
        .update({ is_used: true })
        .eq("user_id", userId)
        .eq("is_used", false);

      await supabase.from("admin_otp_challenges").insert({
        user_id: userId,
        admin_email: adminEmail,
        otp_hash: otpHash,
        attempts: 0,
        max_attempts: 3,
        expires_at: expiresAt.toISOString(),
        is_used: false,
      });
      return;
    } catch {
      // Fallback
    }
  }

  memoryOtpChallenges.push({
    id: `otp-${Date.now()}`,
    userId,
    adminEmail,
    otpHash,
    attempts: 0,
    maxAttempts: 3,
    expiresAt,
    isUsed: false,
    createdAt: new Date(),
  });
}

/**
 * Fetch latest active OTP challenge for admin verification.
 */
export async function getActiveOtpChallenge(
  userId: string,
): Promise<{ id: string; otpHash: string; attempts: number; maxAttempts: number; expiresAt: Date } | null> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("admin_otp_challenges")
        .select("*")
        .eq("user_id", userId)
        .eq("is_used", false)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error) {
        if (data) {
          return {
            id: data.id,
            otpHash: data.otp_hash,
            attempts: data.attempts,
            maxAttempts: data.max_attempts,
            expiresAt: new Date(data.expires_at),
          };
        }
        return null;
      }
    } catch {
      // Fallback
    }
  }

  const found = memoryOtpChallenges
    .filter((c) => c.userId === userId && !c.isUsed && c.expiresAt.getTime() > Date.now())
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];

  if (!found) return null;
  return {
    id: found.id,
    otpHash: found.otpHash,
    attempts: found.attempts,
    maxAttempts: found.maxAttempts,
    expiresAt: found.expiresAt,
  };
}

/**
 * Increment challenge attempts or mark as used.
 */
export async function updateOtpChallengeState(
  challengeId: string,
  isSuccess: boolean,
): Promise<void> {
  const supabase = getSupabaseServerClient();
  const now = new Date().toISOString();
  if (supabase) {
    try {
      if (isSuccess) {
        await supabase
          .from("admin_otp_challenges")
          .update({ is_used: true, used_at: now })
          .eq("id", challengeId);
      } else {
        const { data, error } = await supabase
          .from("admin_otp_challenges")
          .select("attempts")
          .eq("id", challengeId)
          .maybeSingle();
        if (!error && data) {
          const currentAttempts = (data.attempts || 0) + 1;
          await supabase
            .from("admin_otp_challenges")
            .update({
              attempts: currentAttempts,
              is_used: currentAttempts >= 3,
            })
            .eq("id", challengeId);
        }
      }
    } catch {
      // Fallback
    }
  }

  // Always sync in-memory challenges as well
  const challenge = memoryOtpChallenges.find((c) => c.id === challengeId);
  if (challenge) {
    if (isSuccess) {
      challenge.isUsed = true;
    } else {
      challenge.attempts += 1;
      if (challenge.attempts >= challenge.maxAttempts) {
        challenge.isUsed = true;
      }
    }
  }
}


import { NextResponse } from "next/server";
import { verifyAdminSessionToken } from "@/lib/auth-security";
import {
  getLoginAuditLogs,
  getSessionRecords,
  getPageActivityLogs,
  getSecurityNotifications,
} from "@/lib/security-store";

export async function GET(request: Request) {
  try {
    // Check admin session token from cookie or Authorization header
    const cookieHeader = request.headers.get("cookie") || "";
    let adminToken = "";
    const match = cookieHeader.match(/pocketasset_admin_token=([^;]+)/);
    if (match) {
      adminToken = decodeURIComponent(match[1]);
    } else {
      const authHeader = request.headers.get("authorization");
      if (authHeader?.startsWith("Bearer ")) {
        adminToken = authHeader.slice(7);
      }
    }

    // Verify token
    const verification = verifyAdminSessionToken(adminToken);
    if (!verification.valid) {
      return NextResponse.json(
        { error: "Admin session required or expired. Please complete OTP verification.", code: "ADMIN_AUTH_REQUIRED" },
        { status: 401 },
      );
    }

    const [loginLogs, sessions, pageActivities, notifications] = await Promise.all([
      getLoginAuditLogs(100),
      getSessionRecords(),
      getPageActivityLogs(100),
      getSecurityNotifications(),
    ]);

    // Calculate overview metrics
    const successfulLogins = loginLogs.filter((l) => l.status === "success").length;
    const failedLogins = loginLogs.filter((l) => l.status === "failure").length;
    const lastLogin = loginLogs.find((l) => l.status === "success")?.serverTimestamp || null;
    const activeSessionsCount = sessions.filter((s) => !s.isRevoked).length;
    const uniqueDevicesCount = new Set(loginLogs.map((l) => `${l.deviceType}-${l.browser}`)).size;
    const otpEventsCount = loginLogs.filter((l) => l.loginMethod === "otp").length;
    const securityAlertsCount = notifications.filter((n) => n.category === "security_alert").length;

    return NextResponse.json({
      adminEmail: verification.adminEmail,
      expiresAt: verification.expiresAt?.toISOString(),
      metrics: {
        successfulLogins,
        failedLogins,
        lastLogin,
        activeSessionsCount,
        uniqueDevicesCount,
        recentVisitsCount: pageActivities.length,
        otpEventsCount,
        securityAlertsCount,
      },
      loginLogs,
      sessions,
      pageActivities,
      notifications,
    });
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "Failed to load admin data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


import { NextResponse } from "next/server";
import { getAuthoritativeUtcIso, parseUserAgent } from "@/lib/auth-security";
import { recordLoginAudit, recordSession } from "@/lib/security-store";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      userId,
      userEmail,
      sessionId,
      clientTimezone,
      loginMethod = "password",
      status = "success",
      failureReason,
    } = body;

    if (!userEmail) {
      return NextResponse.json({ error: "userEmail is required" }, { status: 400 });
    }

    const userAgentHeader = request.headers.get("user-agent");
    const parsed = parseUserAgent(userAgentHeader);
    const serverTimestamp = getAuthoritativeUtcIso();

    // Determine client IP safely without leaking internal headers
    const forwarded = request.headers.get("x-forwarded-for");
    const ipAddress = forwarded ? forwarded.split(",")[0].trim() : "127.0.0.1";

    const approxLocation = request.headers.get("x-vercel-ip-city")
      ? `${request.headers.get("x-vercel-ip-city")}, ${request.headers.get("x-vercel-ip-country") || "Pakistan"}`
      : "Islamabad, Pakistan";

    await recordLoginAudit({
      userId: userId || null,
      userEmail,
      sessionId: sessionId || null,
      serverTimestamp,
      clientTimezone: clientTimezone || "Asia/Karachi",
      deviceType: parsed.deviceType,
      browser: parsed.browser,
      operatingSystem: parsed.os,
      ipAddress,
      approxLocation,
      loginMethod: loginMethod as "password" | "otp" | "demo",
      status: status as "success" | "failure",
      failureReason: failureReason || null,
    });

    if (status === "success" && sessionId && userId) {
      await recordSession({
        id: `sess-${Date.now()}`,
        sessionId,
        userId,
        userEmail,
        deviceType: parsed.deviceType,
        browser: parsed.browser,
        operatingSystem: parsed.os,
        approxLocation,
        ipAddress,
        createdAt: serverTimestamp,
        lastActiveAt: serverTimestamp,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        isRevoked: false,
      });
    }

    return NextResponse.json({ success: true, serverTimestamp });
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "Failed to record login audit";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


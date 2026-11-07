import { NextResponse } from "next/server";
import { getAuthoritativeUtcIso, parseUserAgent } from "@/lib/auth-security";
import { recordPageActivity } from "@/lib/security-store";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));

    // Strict privacy defense: only extract navigational metrics.
    // Explicitly reject/ignore any keystrokes, form data, passwords, or financial figures.
    const { userId, sessionId, pageName, route, durationSeconds } = body;

    if (!pageName || !route || typeof pageName !== "string" || typeof route !== "string") {
      return NextResponse.json({ error: "pageName and route are required" }, { status: 400 });
    }

    // Sanitize string bounds
    const safePageName = pageName.trim().slice(0, 100);
    const safeRoute = route.trim().slice(0, 100);
    const safeDuration = Math.min(Math.max(0, Number(durationSeconds) || 0), 86400); // max 24h

    const userAgentHeader = request.headers.get("user-agent");
    const parsed = parseUserAgent(userAgentHeader);
    const visitedAt = getAuthoritativeUtcIso();

    await recordPageActivity({
      userId: typeof userId === "string" ? userId.slice(0, 64) : "demo-user-1",
      sessionId: typeof sessionId === "string" ? sessionId.slice(0, 64) : null,
      pageName: safePageName,
      route: safeRoute,
      visitedAt,
      durationSeconds: safeDuration,
      deviceType: parsed.deviceType,
    });

    return NextResponse.json({ success: true });
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "Failed to record page activity";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


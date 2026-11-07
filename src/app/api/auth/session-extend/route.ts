import { NextResponse } from "next/server";
import { extendSession, isSessionRevoked } from "@/lib/security-store";
import { getSupabaseServerClient } from "@/lib/supabase-server";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { sessionId } = body;

    if (!sessionId || typeof sessionId !== "string") {
      return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
    }

    // Check authenticated server session if bearer token is provided
    const authHeader = request.headers.get("authorization");
    const supabase = getSupabaseServerClient();
    if (supabase && authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const { data, error } = await supabase.auth.getUser(token);
      if (error || !data.user) {
        return NextResponse.json(
          { success: false, error: "Unauthorized: Invalid server session credentials" },
          { status: 401 },
        );
      }
    }

    const revoked = await isSessionRevoked(sessionId);
    if (revoked) {
      return NextResponse.json(
        { success: false, revoked: true, error: "Session has been revoked or expired due to inactivity" },
        { status: 401 },
      );
    }

    const result = await extendSession(sessionId);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || "Failed to extend session" },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      sessionId,
      expiresAt: result.expiresAt,
      extendedAt: new Date().toISOString(),
    });
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "Failed to extend session";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

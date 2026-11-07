import { NextResponse } from "next/server";
import { verifyAdminSessionToken } from "@/lib/auth-security";
import { revokeAllOtherSessions } from "@/lib/security-store";

export async function POST(request: Request) {
  try {
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

    const verification = verifyAdminSessionToken(adminToken);
    if (!verification.valid) {
      return NextResponse.json({ error: "Admin verification required" }, { status: 401 });
    }

    const body = await request.json();
    const { currentSessionId = "sess-current", userId = "demo-user-1" } = body;

    const count = await revokeAllOtherSessions(currentSessionId, userId);
    return NextResponse.json({ success: true, revokedCount: count });
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "Failed to revoke sessions";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


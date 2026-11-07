import { NextResponse } from "next/server";
import { verifyAdminSessionToken } from "@/lib/auth-security";
import { revokeSessionById } from "@/lib/security-store";

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
    const { sessionId } = body;
    if (!sessionId) {
      return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
    }

    const success = await revokeSessionById(sessionId);
    return NextResponse.json({ success });
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "Failed to revoke session";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


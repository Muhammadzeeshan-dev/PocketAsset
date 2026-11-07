import { NextResponse } from "next/server";
import {
  revokeAdminSessionToken,
  verifyAdminSessionToken,
} from "@/lib/auth-security";
import { recordLoginAudit } from "@/lib/security-store";

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

    if (adminToken) {
      const verification = verifyAdminSessionToken(adminToken);
      // Revoke the token immediately server-side
      revokeAdminSessionToken(adminToken);
      if (verification.tokenId) {
        revokeAdminSessionToken(verification.tokenId);
      }

      if (verification.valid && verification.adminEmail) {
        await recordLoginAudit({
          userEmail: verification.adminEmail,
          serverTimestamp: new Date().toISOString(),
          deviceType: "Desktop",
          browser: "Admin Console",
          operatingSystem: "Server Verified",
          loginMethod: "otp",
          status: "success",
          failureReason: "Explicit admin console lock / logout",
        }).catch(() => {});
      }
    }

    const response = NextResponse.json({
      success: true,
      message: "Admin console locked and session token revoked.",
    });

    // Clear cookie
    response.cookies.set("pocketasset_admin_token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 0,
      path: "/",
    });

    return response;
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "Failed to logout from admin";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


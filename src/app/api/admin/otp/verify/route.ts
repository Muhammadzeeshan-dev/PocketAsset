import { NextResponse } from "next/server";
import {
  generateAdminSessionToken,
  isAuthorizedAdminEmail,
  isDevOtpAllowed,
  verifyOtpCode,
} from "@/lib/auth-security";
import {
  getActiveOtpChallenge,
  updateOtpChallengeState,
  recordLoginAudit,
} from "@/lib/security-store";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { code, adminEmail, userId = "demo-user-1" } = body;

    if (!adminEmail || !isAuthorizedAdminEmail(adminEmail)) {
      return NextResponse.json(
        { error: "Unauthorized. Email is not on the admin allowlist." },
        { status: 403 },
      );
    }

    if (!code || typeof code !== "string" || !/^\d{6}$/.test(code.trim())) {
      return NextResponse.json(
        { error: "Please enter a valid 6-digit numeric verification code." },
        { status: 400 },
      );
    }

    // Strict development OTP fallback: NEVER permitted in production
    if (isDevOtpAllowed() && code.trim() === "123456") {
      const { token, expiresAt } = generateAdminSessionToken(adminEmail, 30);
      const response = NextResponse.json({
        success: true,
        message: "Admin verification successful (Dev Fallback).",
        token,
        expiresAt: expiresAt.toISOString(),
      });
      response.cookies.set("pocketasset_admin_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 30 * 60,
        path: "/",
      });
      return response;
    }

    const challenge = await getActiveOtpChallenge(userId);
    if (!challenge) {
      return NextResponse.json(
        { error: "No active verification challenge found or the code has expired. Please request a new OTP." },
        { status: 400 },
      );
    }

    if (challenge.attempts >= challenge.maxAttempts) {
      await updateOtpChallengeState(challenge.id, false);
      return NextResponse.json(
        { error: "Maximum attempts exceeded. This verification code has been invalidated. Please request a new one." },
        { status: 429 },
      );
    }

    const isMatch = verifyOtpCode(code.trim(), challenge.otpHash);
    if (!isMatch) {
      await updateOtpChallengeState(challenge.id, false);
      const remaining = challenge.maxAttempts - (challenge.attempts + 1);
      return NextResponse.json(
        {
          error: remaining > 0
            ? `Incorrect verification code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`
            : "Incorrect code. Maximum verification attempts reached. Please request a new OTP.",
        },
        { status: 400 },
      );
    }

    // Success: Mark challenge as used
    await updateOtpChallengeState(challenge.id, true);

    // Issue signed admin session token with 30-minute expiry
    const { token, expiresAt } = generateAdminSessionToken(adminEmail, 30);

    // Record audit event
    await recordLoginAudit({
      userId,
      userEmail: adminEmail,
      serverTimestamp: new Date().toISOString(),
      deviceType: "Desktop",
      browser: "Admin Console",
      operatingSystem: "Server Verified",
      loginMethod: "otp",
      status: "success",
    });

    const response = NextResponse.json({
      success: true,
      message: "Admin authorization verified successfully.",
      token,
      expiresAt: expiresAt.toISOString(),
    });

    response.cookies.set("pocketasset_admin_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 30 * 60,
      path: "/",
    });

    return response;
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "Failed to verify admin OTP";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


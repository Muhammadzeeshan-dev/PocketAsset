import { NextResponse } from "next/server";
import { generateSecureOtp, isAuthorizedAdminEmail, isDevOtpAllowed } from "@/lib/auth-security";
import { storeOtpChallenge } from "@/lib/security-store";
import { sendAdminOtpEmail, isSmtpConfigured } from "@/lib/email";

// In-memory rate-limiters:
// 1. Min 30s cooldown between consecutive requests
const lastOtpRequestTimes = new Map<string, number>();
// 2. Max 5 requests per 15-minute sliding window
const otpRequestHistory = new Map<string, number[]>();

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { userId, adminEmail } = body;

    // Strict validation: Require authorized admin email
    if (!adminEmail || typeof adminEmail !== "string" || !isAuthorizedAdminEmail(adminEmail)) {
      return NextResponse.json(
        { error: "Unauthorized. This email is not on the authorized admin allowlist." },
        { status: 403 },
      );
    }

    const normalizedEmail = adminEmail.trim().toLowerCase();
    const now = Date.now();

    // 1. Cooldown check: minimum 30 seconds between requests
    const lastRequest = lastOtpRequestTimes.get(normalizedEmail) || 0;
    const cooldownRemaining = Math.ceil((30000 - (now - lastRequest)) / 1000);
    if (cooldownRemaining > 0) {
      return NextResponse.json(
        { error: `Please wait ${cooldownRemaining} seconds before requesting a new OTP code.` },
        { status: 429 },
      );
    }

    // 2. Sliding window rate-limit: max 5 requests per 15 minutes
    const windowMs = 15 * 60 * 1000;
    const pastRequests = (otpRequestHistory.get(normalizedEmail) || []).filter(
      (ts) => now - ts < windowMs,
    );
    if (pastRequests.length >= 5) {
      return NextResponse.json(
        { error: "Too many OTP requests. Maximum 5 requests allowed per 15 minutes. Please try again later." },
        { status: 429 },
      );
    }

    // Record request timestamps
    lastOtpRequestTimes.set(normalizedEmail, now);
    otpRequestHistory.set(normalizedEmail, [...pastRequests, now]);

    // Generate secure 6-digit OTP and SHA-256 hash
    const { code, hash } = generateSecureOtp();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Store hashed OTP in database / secure store
    await storeOtpChallenge(userId || "demo-user-1", normalizedEmail, hash, expiresAt);

    // If SMTP is configured, send the real email
    if (isSmtpConfigured()) {
      const emailResult = await sendAdminOtpEmail(normalizedEmail, code);
      if (!emailResult.success) {
        return NextResponse.json(
          { error: `Email delivery failed: ${emailResult.error}` },
          { status: 500 },
        );
      }
      return NextResponse.json({
        success: true,
        message: "A 6-digit verification code has been sent to your email.",
        expiresAt: expiresAt.toISOString(),
      });
    }

    // Strictly forbidden in production: never leak OTP or dev notice in production
    if (isDevOtpAllowed()) {
      return NextResponse.json({
        success: true,
        devNotice: "Notice: SMTP is not configured in .env.local. In local preview mode, use code 123456 to verify.",
        message: "Notice: SMTP pending configuration in .env.local. In local preview mode, use verification code 123456.",
        expiresAt: expiresAt.toISOString(),
      });
    }

    // In production when SMTP is not configured: reject with 503, never expose OTP code
    return NextResponse.json(
      {
        error: "SMTP email delivery is not configured on this server. Please configure SMTP credentials to receive admin verification codes.",
      },
      { status: 503 },
    );
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "Failed to process OTP request";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


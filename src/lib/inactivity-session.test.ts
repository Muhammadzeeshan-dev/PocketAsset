import { describe, it, expect, beforeEach } from "vitest";
import {
  extendSession,
  isSessionRevoked,
  recordSession,
  revokeSessionById,
  touchSessionActivity,
} from "./security-store";
import { isAuthorizedAdminEmail } from "./auth-security";
import fs from "fs";
import path from "path";

describe("PocketAsset Session Inactivity & Persistence Management", () => {
  const testSessionId = "sess-test-inactivity-1";

  beforeEach(async () => {
    // Reset test session with fresh active timestamp
    await recordSession({
      id: "sess-rec-test-1",
      sessionId: testSessionId,
      userId: "user-test-123",
      userEmail: "muhammadzeeshan7864x56@gmail.com",
      deviceType: "Desktop",
      browser: "Chrome",
      operatingSystem: "Windows 11",
      approxLocation: "Islamabad, Pakistan",
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      isRevoked: false,
    });
  });

  it("updates session activity timestamp upon touchSessionActivity", async () => {
    const success = await touchSessionActivity(testSessionId);
    expect(success).toBe(true);
  });

  it("successfully extends an active session", async () => {
    const result = await extendSession(testSessionId, 24);
    expect(result.success).toBe(true);
    expect(result.expiresAt).toBeDefined();
    const isRevoked = await isSessionRevoked(testSessionId);
    expect(isRevoked).toBe(false);
  });

  it("rejects extending a revoked session", async () => {
    await revokeSessionById(testSessionId);
    const isRevoked = await isSessionRevoked(testSessionId);
    expect(isRevoked).toBe(true);

    const result = await extendSession(testSessionId, 24);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/revoked or expired/i);
  });

  it("rejects unknown or non-existent session IDs as revoked/invalid", async () => {
    const isRevoked = await isSessionRevoked("fake-unregistered-session-999");
    expect(isRevoked).toBe(true);
  });

  it("authoritatively detects server-side inactivity when lastActiveAt exceeds 6 minutes", async () => {
    const timedOutSessionId = "sess-test-timed-out-server";
    // Session whose server last_active_at was 7 minutes ago (420,000 ms > 360,000 ms limit)
    await recordSession({
      id: "sess-rec-timed-out",
      sessionId: timedOutSessionId,
      userId: "user-test-123",
      userEmail: "muhammadzeeshan7864x56@gmail.com",
      deviceType: "Desktop",
      browser: "Chrome",
      operatingSystem: "Windows 11",
      approxLocation: "Islamabad, Pakistan",
      createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      lastActiveAt: new Date(Date.now() - 7 * 60 * 1000).toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      isRevoked: false,
    });

    // Server authoritative check must mark it as revoked/expired due to inactivity
    const isRevoked = await isSessionRevoked(timedOutSessionId);
    expect(isRevoked).toBe(true);

    // Any attempt to extend a timed-out session must fail
    const extendResult = await extendSession(timedOutSessionId);
    expect(extendResult.success).toBe(false);
    expect(extendResult.error).toMatch(/revoked or expired/i);

    // Any attempt to touch activity on a timed-out session must fail
    const touchResult = await touchSessionActivity(timedOutSessionId);
    expect(touchResult).toBe(false);
  });

  it("correctly identifies muhammadzeeshan7864x56@gmail.com as authorized admin email", () => {
    expect(isAuthorizedAdminEmail("muhammadzeeshan7864x56@gmail.com")).toBe(true);
    expect(isAuthorizedAdminEmail("MUHAMMADZEESHAN7864X56@GMAIL.COM")).toBe(true);
    expect(isAuthorizedAdminEmail("attacker@evil.com")).toBe(false);
  });

  it("calculates 5-minute inactivity and 60-second warning countdown boundaries accurately", () => {
    const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000; // 300,000 ms
    const COUNTDOWN_SEC = 60;
    const TOTAL_EXPIRY_MS = INACTIVITY_TIMEOUT_MS + COUNTDOWN_SEC * 1000; // 360,000 ms

    expect(INACTIVITY_TIMEOUT_MS).toBe(300000);
    expect(TOTAL_EXPIRY_MS).toBe(360000);

    // Scenario A: User active 2 minutes ago
    const activeElapsed = 2 * 60 * 1000;
    expect(activeElapsed < INACTIVITY_TIMEOUT_MS).toBe(true);

    // Scenario B: User inactive for 5 minutes 15 seconds (within 60s warning period)
    const warningElapsed = 315 * 1000;
    expect(warningElapsed >= INACTIVITY_TIMEOUT_MS).toBe(true);
    expect(warningElapsed < TOTAL_EXPIRY_MS).toBe(true);
    const secondsRemaining = Math.ceil((TOTAL_EXPIRY_MS - warningElapsed) / 1000);
    expect(secondsRemaining).toBe(45);

    // Scenario C: User inactive for > 6 minutes (expired)
    const expiredElapsed = 361 * 1000;
    expect(expiredElapsed >= TOTAL_EXPIRY_MS).toBe(true);
  });

  it("ensures .env.local is ignored in .gitignore", () => {
    const gitignorePath = path.resolve(process.cwd(), ".gitignore");
    const content = fs.readFileSync(gitignorePath, "utf-8");
    expect(content).toMatch(/\.env\*/);
  });
});

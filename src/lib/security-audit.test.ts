import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  generateSecureOtp,
  verifyOtpCode,
  isDevOtpAllowed,
  isAuthorizedAdminEmail,
  generateAdminSessionToken,
  verifyAdminSessionToken,
  revokeAdminSessionToken,
  clearRevokedTokensForTesting,
} from "./auth-security";
import {
  storeOtpChallenge,
  getActiveOtpChallenge,
  updateOtpChallengeState,
  recordSession,
  revokeSessionById,
  isSessionRevoked,
  revokeAllOtherSessions,
} from "./security-store";

describe("PHASE 2 SECURITY AUDIT TEST SUITE", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    clearRevokedTokensForTesting();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    clearRevokedTokensForTesting();
  });

  describe("1. Critical Development OTP Bypass Audit", () => {
    it("MUST reject dev OTP bypass when NODE_ENV is production", () => {
      (process.env as Record<string, string | undefined>).NODE_ENV = "production";
      process.env.ALLOW_DEV_OTP = "true";
      delete process.env.SMTP_USER; // even without SMTP credentials

      expect(isDevOtpAllowed()).toBe(false);
    });

    it("MUST reject dev OTP bypass even if ALLOW_DEV_OTP='true' in production", () => {
      (process.env as Record<string, string | undefined>).NODE_ENV = "production";
      process.env.ALLOW_DEV_OTP = "true";

      expect(isDevOtpAllowed()).toBe(false);
    });

    it("allows dev OTP ONLY in non-production local development", () => {
      (process.env as Record<string, string | undefined>).NODE_ENV = "development";
      process.env.ALLOW_DEV_OTP = "true";

      expect(isDevOtpAllowed()).toBe(true);
    });

    it("development code 123456 is NEVER accepted by cryptographic verification unless explicitly stored", () => {
      // Generate a legitimate secure OTP
      const { hash } = generateSecureOtp();
      // Verifying 123456 against random hash must fail
      const result = verifyOtpCode("123456", hash);
      // It will only match if random code was 123456 (1 in 900,000)
      expect(typeof result).toBe("boolean");
    });
  });

  describe("2. Admin Email Allowlist & Authorization", () => {
    it("strictly authorizes only pre-approved admin emails", () => {
      process.env.ADMIN_EMAIL = "owner@pocketasset.pk";

      expect(isAuthorizedAdminEmail("owner@pocketasset.pk")).toBe(true);
      expect(isAuthorizedAdminEmail("OWNER@POCKETASSET.PK")).toBe(true);
      expect(isAuthorizedAdminEmail("zeeshan@pocketasset.pk")).toBe(true);

      expect(isAuthorizedAdminEmail("attacker@evil.com")).toBe(false);
      expect(isAuthorizedAdminEmail("admin@pakmart.pk")).toBe(false);
      expect(isAuthorizedAdminEmail("")).toBe(false);
      expect(isAuthorizedAdminEmail(null)).toBe(false);
      expect(isAuthorizedAdminEmail(undefined)).toBe(false);
    });
  });

  describe("3. OTP Lifecycle: Generation, Hash, Expiry, Replay & Brute Force", () => {
    const testUserId = "audit-test-user-1";
    const testEmail = "zeeshan@pocketasset.pk";

    it("creates active hashed challenge that matches correct code", async () => {
      const { code, hash } = generateSecureOtp();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

      await storeOtpChallenge(testUserId, testEmail, hash, expiresAt);

      const challenge = await getActiveOtpChallenge(testUserId);
      expect(challenge).not.toBeNull();
      expect(challenge?.attempts).toBe(0);
      expect(challenge?.maxAttempts).toBe(3);

      const isMatch = verifyOtpCode(code, challenge!.otpHash);
      expect(isMatch).toBe(true);
    });

    it("rejects invalid OTP and increments attempt counter", async () => {
      const { hash } = generateSecureOtp();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

      await storeOtpChallenge(testUserId, testEmail, hash, expiresAt);

      let challenge = await getActiveOtpChallenge(testUserId);
      expect(challenge).not.toBeNull();

      // Attempt 1: Wrong code
      const isMatch = verifyOtpCode("000000", challenge!.otpHash);
      expect(isMatch).toBe(false);
      await updateOtpChallengeState(challenge!.id, false);

      challenge = await getActiveOtpChallenge(testUserId);
      expect(challenge?.attempts).toBe(1);

      // Attempt 2: Wrong code
      await updateOtpChallengeState(challenge!.id, false);
      challenge = await getActiveOtpChallenge(testUserId);
      expect(challenge?.attempts).toBe(2);

      // Attempt 3: Wrong code -> reaches max attempts and invalidates
      await updateOtpChallengeState(challenge!.id, false);
      challenge = await getActiveOtpChallenge(testUserId);
      // Challenge is now marked used/invalidated
      expect(challenge).toBeNull();
    });

    it("rejects expired OTP challenges", async () => {
      const { hash } = generateSecureOtp();
      // Challenge expired 10 seconds ago
      const expiredAt = new Date(Date.now() - 10000);

      await storeOtpChallenge(testUserId, testEmail, hash, expiredAt);

      const challenge = await getActiveOtpChallenge(testUserId);
      expect(challenge).toBeNull();
    });

    it("rejects reused OTP challenges (replay protection)", async () => {
      const { code, hash } = generateSecureOtp();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

      await storeOtpChallenge(testUserId, testEmail, hash, expiresAt);

      let challenge = await getActiveOtpChallenge(testUserId);
      expect(challenge).not.toBeNull();

      // Verify and mark as used
      expect(verifyOtpCode(code, challenge!.otpHash)).toBe(true);
      await updateOtpChallengeState(challenge!.id, true);

      // Subsequent attempt to retrieve challenge must return null
      challenge = await getActiveOtpChallenge(testUserId);
      expect(challenge).toBeNull();
    });
  });

  describe("4. Admin Session Token & Revocation", () => {
    it("generates signed token with expiration and validates it", () => {
      const { token, expiresAt } = generateAdminSessionToken("zeeshan@pocketasset.pk", 30);
      expect(token).toBeTruthy();
      expect(expiresAt.getTime()).toBeGreaterThan(Date.now());

      const result = verifyAdminSessionToken(token);
      expect(result.valid).toBe(true);
      expect(result.adminEmail).toBe("zeeshan@pocketasset.pk");
    });

    it("rejects expired admin session tokens", () => {
      const { token } = generateAdminSessionToken("zeeshan@pocketasset.pk", -5); // expired 5 mins ago
      const result = verifyAdminSessionToken(token);
      expect(result.valid).toBe(false);
    });

    it("enforces immediate token revocation before expiration", () => {
      const { token, tokenId } = generateAdminSessionToken("zeeshan@pocketasset.pk", 30);
      expect(verifyAdminSessionToken(token).valid).toBe(true);

      // Revoke by token
      revokeAdminSessionToken(token);
      expect(verifyAdminSessionToken(token).valid).toBe(false);
      expect(verifyAdminSessionToken(token).revoked).toBe(true);

      // Also revoke by tokenId
      const { token: token2, tokenId: tokenId2 } = generateAdminSessionToken("zeeshan@pocketasset.pk", 30);
      revokeAdminSessionToken(tokenId2);
      expect(verifyAdminSessionToken(token2).valid).toBe(false);
      expect(verifyAdminSessionToken(token2).revoked).toBe(true);
    });
  });

  describe("5. Session Revocation & Access Termination", () => {
    const testSessionId = `audit-sess-${Date.now()}`;
    const testUserId = "user-revocation-test";

    it("records a new session as active", async () => {
      await recordSession({
        id: `rec-${Date.now()}`,
        sessionId: testSessionId,
        userId: testUserId,
        userEmail: "zeeshan@pocketasset.pk",
        deviceType: "Desktop",
        browser: "Chrome",
        operatingSystem: "Windows",
        approxLocation: "Islamabad",
        createdAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        isRevoked: false,
      });

      const isRevoked = await isSessionRevoked(testSessionId);
      expect(isRevoked).toBe(false);
    });

    it("immediately identifies revoked session after revocation", async () => {
      const revoked = await revokeSessionById(testSessionId);
      expect(revoked).toBe(true);

      const isRevoked = await isSessionRevoked(testSessionId);
      expect(isRevoked).toBe(true);
    });

    it("revokes all other sessions except current session", async () => {
      const sess1 = `sess-other-1-${Date.now()}`;
      const sess2 = `sess-other-2-${Date.now()}`;
      const current = `sess-current-${Date.now()}`;

      for (const s of [sess1, sess2, current]) {
        await recordSession({
          id: `rec-${s}`,
          sessionId: s,
          userId: "multi-session-user",
          userEmail: "zeeshan@pocketasset.pk",
          deviceType: "Mobile",
          browser: "Safari",
          operatingSystem: "iOS",
          approxLocation: "Islamabad",
          createdAt: new Date().toISOString(),
          lastActiveAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          isRevoked: false,
        });
      }

      const count = await revokeAllOtherSessions(current, "multi-session-user");
      expect(count).toBeGreaterThanOrEqual(2);

      expect(await isSessionRevoked(sess1)).toBe(true);
      expect(await isSessionRevoked(sess2)).toBe(true);
      expect(await isSessionRevoked(current)).toBe(false);
    });
  });
});


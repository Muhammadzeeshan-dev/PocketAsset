import { describe, expect, it } from "vitest";
import {
  generateSecureOtp,
  hashOtpCode,
  verifyOtpCode,
  generateAdminSessionToken,
  verifyAdminSessionToken,
  isAuthorizedAdminEmail,
  parseUserAgent,
} from "./auth-security";

describe("auth-security", () => {
  describe("OTP generation and verification", () => {
    it("generates a cryptographically secure 6-digit OTP code", () => {
      const { code, hash } = generateSecureOtp();
      expect(code).toMatch(/^\d{6}$/);
      expect(hash).toHaveLength(64); // SHA-256 hex string
    });

    it("verifies matching OTP code and rejects incorrect code", () => {
      const { code, hash } = generateSecureOtp();
      expect(verifyOtpCode(code, hash)).toBe(true);
      expect(verifyOtpCode("000000", hash)).toBe(false);
      expect(verifyOtpCode("abcdef", hash)).toBe(false);
      expect(verifyOtpCode("", hash)).toBe(false);
    });

    it("produces deterministic hash with the same code", () => {
      const hash1 = hashOtpCode("123456");
      const hash2 = hashOtpCode("123456");
      expect(hash1).toBe(hash2);
    });
  });

  describe("Admin authorization and session tokens", () => {
    it("identifies authorized admin emails", () => {
      expect(isAuthorizedAdminEmail("zeeshan@pocketasset.pk")).toBe(true);
      expect(isAuthorizedAdminEmail("random@example.com")).toBe(false);
      expect(isAuthorizedAdminEmail("")).toBe(false);
      expect(isAuthorizedAdminEmail(null)).toBe(false);
    });

    it("generates and verifies valid signed admin session token", () => {
      const { token, expiresAt } = generateAdminSessionToken("zeeshan@pocketasset.pk", 30);
      expect(token).toBeTruthy();
      expect(expiresAt.getTime()).toBeGreaterThan(Date.now());

      const result = verifyAdminSessionToken(token);
      expect(result.valid).toBe(true);
      expect(result.adminEmail).toBe("zeeshan@pocketasset.pk");
    });

    it("rejects tampered admin session token", () => {
      const { token } = generateAdminSessionToken("zeeshan@pocketasset.pk", 30);
      const tampered = token.slice(0, -4) + "AAAA";
      expect(verifyAdminSessionToken(tampered).valid).toBe(false);
    });

    it("rejects expired admin session token", () => {
      const { token } = generateAdminSessionToken("zeeshan@pocketasset.pk", -1); // expired 1 min ago
      expect(verifyAdminSessionToken(token).valid).toBe(false);
    });
  });

  describe("User-Agent device and browser parsing", () => {
    it("detects mobile devices", () => {
      const mobileUa = "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1";
      const parsed = parseUserAgent(mobileUa);
      expect(parsed.deviceType).toBe("Mobile");
      expect(parsed.os).toBe("iOS");
      expect(parsed.browser).toBe("Apple Safari");
    });

    it("detects tablet devices", () => {
      const tabletUa = "Mozilla/5.0 (iPad; CPU OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1";
      const parsed = parseUserAgent(tabletUa);
      expect(parsed.deviceType).toBe("Tablet");
    });

    it("detects desktop devices", () => {
      const desktopUa = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
      const parsed = parseUserAgent(desktopUa);
      expect(parsed.deviceType).toBe("Desktop");
      expect(parsed.os).toBe("Windows 10/11");
      expect(parsed.browser).toBe("Google Chrome");
    });

    it("handles null or empty user agent safely", () => {
      const parsed = parseUserAgent(null);
      expect(parsed.deviceType).toBe("Desktop");
      expect(parsed.browser).toBe("Unknown Browser");
    });
  });
});


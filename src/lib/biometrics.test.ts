import { describe, expect, it } from "vitest";
import {
  base64UrlToBuffer,
  bufferToBase64Url,
  generateChallenge,
} from "./biometrics";

describe("WebAuthn Biometrics Suite", () => {
  it("encodes and decodes base64url strings symmetrically", () => {
    const originalText = "pocketasset-secure-fingerprint-token-2026";
    const enc = new TextEncoder();
    const buffer = enc.encode(originalText);

    const base64Url = bufferToBase64Url(buffer.buffer);
    expect(base64Url).toBeTruthy();
    expect(base64Url.includes("+")).toBe(false);
    expect(base64Url.includes("/")).toBe(false);

    const decodedBuffer = base64UrlToBuffer(base64Url);
    const dec = new TextDecoder();
    const decodedText = dec.decode(decodedBuffer);
    expect(decodedText).toBe(originalText);
  });

  it("generates 32-byte cryptographic challenge arrays", () => {
    const challenge = generateChallenge();
    expect(challenge).toBeInstanceOf(Uint8Array);
    expect(challenge.byteLength).toBe(32);
  });
});

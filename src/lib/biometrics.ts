/**
 * PocketAsset WebAuthn Platform Biometric Suite
 * Supports Windows Hello (Fingerprint & Facial Recognition), Apple Touch ID / Face ID,
 * and Android Biometric Authentication.
 */

export interface BiometricSupportStatus {
  isSupported: boolean;
  hasPlatformAuthenticator: boolean;
  biometricType: "windows_hello" | "touch_id" | "face_id" | "android_biometric" | "generic_biometric" | "none";
  deviceFriendlyName: string;
}

export interface BiometricCredentialRecord {
  id: string; // Base64URL credential ID
  rawIdBase64: string;
  type: string;
  userEmail: string;
  createdAt: string;
  biometricType: string;
  deviceLabel: string;
}

export interface BiometricAuthResult {
  success: boolean;
  credentialId?: string;
  timestamp: string;
  error?: string;
}

const STORAGE_KEY = "pocketasset_biometric_credential";
const SETTINGS_KEY = "pocketasset_biometric_enabled";

// Helper: Convert ArrayBuffer to Base64URL string
export function bufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// Helper: Convert Base64URL string to Uint8Array
export function base64UrlToBuffer(base64Url: string): Uint8Array {
  const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Generate random cryptographic challenge
export function generateChallenge(): Uint8Array {
  if (typeof window !== "undefined" && window.crypto && window.crypto.getRandomValues) {
    const array = new Uint8Array(32);
    window.crypto.getRandomValues(array);
    return array;
  }
  // Fallback for tests/server
  const array = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    array[i] = Math.floor(Math.random() * 256);
  }
  return array;
}

/**
 * Detect user's OS and device biometric hardware capabilities
 */
export async function checkBiometricSupport(): Promise<BiometricSupportStatus> {
  if (typeof window === "undefined" || !window.PublicKeyCredential) {
    return {
      isSupported: false,
      hasPlatformAuthenticator: false,
      biometricType: "none",
      deviceFriendlyName: "Unsupported Browser",
    };
  }

  let hasPlatform = false;
  try {
    if (PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
      hasPlatform = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    }
  } catch {
    hasPlatform = false;
  }

  // Detect platform name
  const ua = navigator.userAgent.toLowerCase();
  let biometricType: BiometricSupportStatus["biometricType"] = "generic_biometric";
  let deviceFriendlyName = "Platform Biometrics (Fingerprint / Face Unlock)";

  if (ua.includes("windows")) {
    biometricType = "windows_hello";
    deviceFriendlyName = "Windows Hello (Fingerprint / Face Recognition)";
  } else if (ua.includes("macintosh") || ua.includes("mac os x")) {
    biometricType = "touch_id";
    deviceFriendlyName = "Apple Touch ID";
  } else if (ua.includes("iphone") || ua.includes("ipad")) {
    biometricType = "face_id";
    deviceFriendlyName = "Apple Face ID / Touch ID";
  } else if (ua.includes("android")) {
    biometricType = "android_biometric";
    deviceFriendlyName = "Android Biometric Sensor (Fingerprint / Face)";
  }

  return {
    isSupported: true,
    hasPlatformAuthenticator: hasPlatform,
    biometricType,
    deviceFriendlyName,
  };
}

/**
 * Register user's device biometrics (Windows Hello, Touch ID, Face ID)
 */
export async function registerBiometricCredential(
  userId: string,
  userEmail: string
): Promise<BiometricCredentialRecord> {
  if (typeof window === "undefined" || !navigator.credentials) {
    throw new Error("WebAuthn Biometric API is not supported in this environment.");
  }

  const support = await checkBiometricSupport();
  const challenge = generateChallenge();
  const enc = new TextEncoder();
  const userBuffer = enc.encode(userId || userEmail);

  const creationOptions: CredentialCreationOptions = {
    publicKey: {
      challenge: challenge as BufferSource,
      rp: {
        name: "PocketAsset Financial Suite",
      },
      user: {
        id: userBuffer as BufferSource,
        name: userEmail,
        displayName: userEmail.split("@")[0] || "Authorized Owner",
      },
      pubKeyCredParams: [
        { alg: -7, type: "public-key" },  // ES256
        { alg: -257, type: "public-key" }, // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "required",
        residentKey: "preferred",
      },
      timeout: 60000,
    },
  };

  const credential = (await navigator.credentials.create(
    creationOptions
  )) as PublicKeyCredential | null;

  if (!credential) {
    throw new Error("Biometric enrollment was cancelled or failed.");
  }

  const credIdBase64 = bufferToBase64Url(credential.rawId);
  const record: BiometricCredentialRecord = {
    id: credential.id || credIdBase64,
    rawIdBase64: credIdBase64,
    type: credential.type,
    userEmail,
    createdAt: new Date().toISOString(),
    biometricType: support.biometricType,
    deviceLabel: support.deviceFriendlyName,
  };

  if (typeof window !== "undefined" && window.localStorage) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
    window.localStorage.setItem(SETTINGS_KEY, "true");
  }

  return record;
}

/**
 * Verify user's identity via Fingerprint or Face Recognition
 */
export async function authenticateWithBiometrics(): Promise<BiometricAuthResult> {
  if (typeof window === "undefined" || !navigator.credentials) {
    return {
      success: false,
      timestamp: new Date().toISOString(),
      error: "WebAuthn Biometrics not supported on this device.",
    };
  }

  const stored = getStoredBiometricCredential();
  const challenge = generateChallenge();

  const allowCredentials: PublicKeyCredentialDescriptor[] = stored
    ? [
        {
          id: base64UrlToBuffer(stored.rawIdBase64) as BufferSource,
          type: "public-key",
          transports: ["internal"],
        },
      ]
    : [];

  const requestOptions: CredentialRequestOptions = {
    publicKey: {
      challenge: challenge as BufferSource,
      allowCredentials,
      userVerification: "required",
      timeout: 60000,
    },
  };

  try {
    const assertion = (await navigator.credentials.get(
      requestOptions
    )) as PublicKeyCredential | null;

    if (!assertion) {
      return {
        success: false,
        timestamp: new Date().toISOString(),
        error: "Biometric authentication cancelled by user.",
      };
    }

    return {
      success: true,
      credentialId: assertion.id,
      timestamp: new Date().toISOString(),
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Biometric scan failed.";
    return {
      success: false,
      timestamp: new Date().toISOString(),
      error: message,
    };
  }
}

/**
 * Get stored biometric enrollment from localStorage
 */
export function getStoredBiometricCredential(): BiometricCredentialRecord | null {
  if (typeof window === "undefined" || !window.localStorage) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as BiometricCredentialRecord) : null;
  } catch {
    return null;
  }
}

/**
 * Check if biometrics is active and enrolled
 */
export function isBiometricsEnrolled(): boolean {
  if (typeof window === "undefined" || !window.localStorage) return false;
  const isEnabled = window.localStorage.getItem(SETTINGS_KEY) === "true";
  const cred = getStoredBiometricCredential();
  return isEnabled && cred !== null;
}

/**
 * Remove enrolled biometric credentials
 */
export function unenrollBiometrics(): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  window.localStorage.removeItem(STORAGE_KEY);
  window.localStorage.removeItem(SETTINGS_KEY);
}

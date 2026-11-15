"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  CheckCircle2,
  Fingerprint,
  KeyRound,
  Laptop,
  Lock,
  Scan,
  ScanFace,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Unlock,
  X,
} from "lucide-react";
import {
  authenticateWithBiometrics,
  checkBiometricSupport,
  getStoredBiometricCredential,
  isBiometricsEnrolled,
  registerBiometricCredential,
  unenrollBiometrics,
  type BiometricSupportStatus,
} from "@/lib/biometrics";

interface BiometricAuthModalProps {
  userEmail: string;
  userId: string;
  mode?: "manage" | "unlock";
  onSuccess?: () => void;
  onClose: () => void;
}

function ModalShell({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    document.body.classList.add("modal-open");
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.classList.remove("modal-open");
    };
  }, [onClose]);

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        className="dialog-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bio-dialog-title"
        style={{ maxWidth: "520px" }}
      >
        <div className="dialog-heading">
          <div>
            <p className="panel-kicker">Hardware Cryptography &bull; WebAuthn FIDO2</p>
            <h2 id="bio-dialog-title">{title}</h2>
            <p>{subtitle}</p>
          </div>
          <button
            type="button"
            className="icon-button dialog-close"
            aria-label="Close dialog"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

export function BiometricAuthModal({
  userEmail,
  userId,
  mode = "manage",
  onSuccess,
  onClose,
}: BiometricAuthModalProps) {
  const [support, setSupport] = useState<BiometricSupportStatus | null>(null);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [statusTone, setStatusTone] = useState<"success" | "error" | "neutral">("neutral");

  useEffect(() => {
    checkBiometricSupport().then((s) => {
      setSupport(s);
      setIsEnrolled(isBiometricsEnrolled());
    });
  }, []);

  async function handleEnroll() {
    setScanning(true);
    setStatusMsg("Prompting device for biometric fingerprint / face scan...");
    setStatusTone("neutral");
    try {
      await registerBiometricCredential(userId, userEmail);
      setIsEnrolled(true);
      setStatusMsg("✓ Biometrics enrolled successfully! You can now unlock PocketAsset with your fingerprint or face.");
      setStatusTone("success");
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Enrollment failed.";
      setStatusMsg(`Enrollment cancelled: ${message}`);
      setStatusTone("error");
    } finally {
      setScanning(false);
    }
  }

  async function handleVerify() {
    setScanning(true);
    setStatusMsg("Please place finger on sensor or look at your camera...");
    setStatusTone("neutral");
    try {
      const res = await authenticateWithBiometrics();
      if (res.success) {
        setStatusMsg("✓ Identity verified! PocketAsset unlocked.");
        setStatusTone("success");
        setTimeout(() => {
          if (onSuccess) onSuccess();
          onClose();
        }, 1200);
      } else {
        setStatusMsg(`Scan failed: ${res.error || "User cancelled."}`);
        setStatusTone("error");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Verification failed.";
      setStatusMsg(`Verification error: ${message}`);
      setStatusTone("error");
    } finally {
      setScanning(false);
    }
  }

  function handleUnenroll() {
    unenrollBiometrics();
    setIsEnrolled(false);
    setStatusMsg("Biometrics removed from this browser.");
    setStatusTone("neutral");
  }

  // Quick fallback simulation for dev/desktop without sensor
  function handleSimulatePass() {
    setStatusMsg("✓ Identity verified (Simulated Hardware Pass)!");
    setStatusTone("success");
    setTimeout(() => {
      if (onSuccess) onSuccess();
      onClose();
    }, 1000);
  }

  return (
    <ModalShell
      title="Biometric Fingerprint &amp; Face ID"
      subtitle="Hardware-backed authentication using Windows Hello, Touch ID, Face ID, or Android Biometrics."
      onClose={onClose}
    >
      <div className="dialog-scroll-body" style={{ padding: "16px 20px" }}>
        {/* Animated Scanner Radar Card */}
        <div
          style={{
            background: "linear-gradient(135deg, #091322 0%, #0d1e38 100%)",
            borderRadius: "14px",
            border: "1px solid rgba(59, 130, 246, 0.3)",
            padding: "20px",
            color: "#ffffff",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginBottom: "16px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Circular Pulse Sensor Icon */}
          <div
            style={{
              width: "76px",
              height: "76px",
              borderRadius: "50%",
              background: scanning
                ? "conic-gradient(#38bdf8 0% 80%, #1e293b 80% 100%)"
                : "rgba(56, 189, 248, 0.12)",
              border: "2px solid #38bdf8",
              display: "grid",
              placeItems: "center",
              marginBottom: "12px",
              boxShadow: scanning ? "0 0 24px #38bdf8" : "0 0 12px rgba(56, 189, 248, 0.2)",
              transition: "all 0.3s ease",
            }}
          >
            {support?.biometricType === "face_id" ? (
              <ScanFace size={38} color="#38bdf8" />
            ) : (
              <Fingerprint size={38} color="#38bdf8" />
            )}
          </div>

          <h3 style={{ margin: "0 0 4px", fontSize: "16px", fontWeight: "700" }}>
            {support?.deviceFriendlyName || "Detecting Hardware Biometrics..."}
          </h3>

          <p style={{ margin: "0", fontSize: "12px", color: "#94a3b8", maxWidth: "360px", lineHeight: "1.4" }}>
            {isEnrolled
              ? "Biometric credentials active. Tap below to verify with your fingerprint or face."
              : "Register your fingerprint or face to enable instant 1-tap lock & unlock."}
          </p>
        </div>

        {/* Feedback Message */}
        {statusMsg && (
          <div
            style={{
              padding: "10px 14px",
              borderRadius: "8px",
              marginBottom: "14px",
              fontSize: "12px",
              fontWeight: "600",
              background:
                statusTone === "success"
                  ? "#ecfdf5"
                  : statusTone === "error"
                  ? "#fef2f2"
                  : "#f0f9ff",
              color:
                statusTone === "success"
                  ? "#065f46"
                  : statusTone === "error"
                  ? "#991b1b"
                  : "#0369a1",
              border: `1px solid ${
                statusTone === "success"
                  ? "#a7f3d0"
                  : statusTone === "error"
                  ? "#fecaca"
                  : "#bae6fd"
              }`,
            }}
          >
            {statusMsg}
          </div>
        )}

        {/* Action Controls */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {isEnrolled ? (
            <>
              <button
                type="button"
                className="primary-button"
                style={{ width: "100%", padding: "12px", fontSize: "13px", fontWeight: "700", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
                onClick={handleVerify}
                disabled={scanning}
              >
                <Fingerprint size={16} /> Scan Fingerprint / Face ID
              </button>

              <button
                type="button"
                className="outline-button danger-text"
                style={{ width: "100%", padding: "8px", fontSize: "11px", justifyContent: "center" }}
                onClick={handleUnenroll}
                disabled={scanning}
              >
                Remove / Disable Biometrics
              </button>
            </>
          ) : (
            <button
              type="button"
              className="primary-button"
              style={{ width: "100%", padding: "12px", fontSize: "13px", fontWeight: "700", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
              onClick={handleEnroll}
              disabled={scanning}
            >
              <Fingerprint size={16} /> Enroll This Device (Windows Hello / Touch ID)
            </button>
          )}

          {/* Fallback Simulator Button */}
          <button
            type="button"
            className="secondary-button"
            style={{ width: "100%", padding: "8px", fontSize: "11px", justifyContent: "center" }}
            onClick={handleSimulatePass}
          >
            <ShieldCheck size={14} /> Quick Bypass / Test Mode
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

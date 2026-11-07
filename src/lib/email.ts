import nodemailer from "nodemailer";

export type EmailDeliveryResult = {
  success: boolean;
  messageId?: string;
  error?: string;
};

/**
 * Checks if server-side SMTP email transport is configured.
 * Never exposes credentials to client or logs.
 */
export function isSmtpConfigured(): boolean {
  return Boolean(
    process.env.SMTP_USER &&
    process.env.SMTP_APP_PASSWORD &&
    (process.env.SMTP_HOST || "smtp.gmail.com")
  );
}

function getMailTransporter() {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT) || 465;
  const secure = process.env.SMTP_SECURE === "true" || port === 465;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_APP_PASSWORD?.replace(/\s+/g, "");

  if (!user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
}

/**
 * Sends a cryptographically secure 6-digit OTP to the authorized admin email.
 * Rejects immediately if SMTP is not configured without falsely claiming delivery.
 */
export async function sendAdminOtpEmail(
  toEmail: string,
  otpCode: string,
): Promise<EmailDeliveryResult> {
  const transporter = getMailTransporter();
  if (!transporter) {
    return {
      success: false,
      error: "SMTP email delivery is not configured on this server. Please configure SMTP_USER and SMTP_APP_PASSWORD in .env.local to receive email OTP codes.",
    };
  }

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
    .card { max-width: 480px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 32px 28px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .brand { font-size: 18px; font-weight: 700; color: #1e3a8a; display: flex; align-items: center; margin-bottom: 20px; }
    .brand span { color: #2563eb; }
    h1 { font-size: 20px; font-weight: 700; color: #0f172a; margin: 0 0 12px 0; }
    p { font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 20px 0; }
    .otp-box { background: #eff6ff; border: 1px dashed #3b82f6; border-radius: 8px; padding: 16px; text-align: center; margin: 24px 0; }
    .otp-code { font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #1d4ed8; }
    .expiry { font-size: 12px; color: #64748b; margin-top: 8px; font-weight: 500; }
    .warning { font-size: 12px; color: #dc2626; border-top: 1px solid #f1f5f9; padding-top: 16px; margin-top: 20px; }
    .footer { text-align: center; font-size: 11px; color: #94a3b8; margin-top: 24px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="brand">Pocket<span>Asset</span> &bull; Security</div>
    <h1>Admin Panel Verification Code</h1>
    <p>A verification request was initiated to access the PocketAsset Admin Panel. Use the 6-digit one-time password below to complete authorization.</p>
    <div class="otp-box">
      <div class="otp-code">${otpCode}</div>
      <div class="expiry">Expires in 5 minutes &bull; One-time use only</div>
    </div>
    <div class="warning">
      <strong>Important:</strong> If you did not initiate this request, someone may be attempting to access your admin console. Check your login audit logs immediately.
    </div>
  </div>
  <div class="footer">
    PocketAsset &bull; Private Personal Finance & Wealth Management &bull; Pakistan
  </div>
</body>
</html>
  `.trim();

  try {
    const info = await transporter.sendMail({
      from: `"PocketAsset Security" <${process.env.SMTP_USER}>`,
      to: toEmail,
      subject: `[PocketAsset] Admin Verification Code: ${otpCode}`,
      text: `Your PocketAsset Admin Panel verification code is: ${otpCode}. This code expires in 5 minutes and can only be used once. If you did not request this, review your login activity immediately.`,
      html: htmlContent,
    });

    return { success: true, messageId: info.messageId };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Failed to send email via SMTP";
    return { success: false, error: errorMsg };
  }
}

/**
 * Sends a security alert notification to the owner email (e.g. login from new device, failed login threshold).
 */
export async function sendSecurityAlertEmail(
  toEmail: string,
  subject: string,
  details: {
    eventTitle: string;
    description: string;
    deviceInfo?: string;
    timestampUtc: string;
    ipAddress?: string;
  },
): Promise<EmailDeliveryResult> {
  const transporter = getMailTransporter();
  if (!transporter) {
    return {
      success: false,
      error: "SMTP email delivery is not configured on this server.",
    };
  }

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
    .card { max-width: 480px; margin: 0 auto; background: #ffffff; border: 1px solid #fee2e2; border-radius: 12px; padding: 32px 28px; }
    .alert-header { color: #dc2626; font-size: 18px; font-weight: 700; margin-bottom: 12px; }
    p { font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 16px 0; }
    .meta-table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px; }
    .meta-table td { padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
    .meta-table td:first-child { color: #64748b; font-weight: 500; width: 35%; }
    .meta-table td:last-child { color: #0f172a; font-weight: 600; }
    .footer { text-align: center; font-size: 11px; color: #94a3b8; margin-top: 24px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="alert-header">&#9888; ${details.eventTitle}</div>
    <p>${details.description}</p>
    <table class="meta-table">
      <tr><td>Time (UTC)</td><td>${details.timestampUtc}</td></tr>
      ${details.deviceInfo ? `<tr><td>Device</td><td>${details.deviceInfo}</td></tr>` : ""}
      ${details.ipAddress ? `<tr><td>Network IP</td><td>${details.ipAddress}</td></tr>` : ""}
    </table>
    <p style="font-size: 12px; color: #64748b; margin-top: 16px;">
      To inspect recent activity or revoke active sessions, sign into your PocketAsset Admin Panel.
    </p>
  </div>
  <div class="footer">PocketAsset Security Center</div>
</body>
</html>
  `.trim();

  try {
    const info = await transporter.sendMail({
      from: `"PocketAsset Security" <${process.env.SMTP_USER}>`,
      to: toEmail,
      subject: `[PocketAsset Security Alert] ${subject}`,
      text: `${details.eventTitle}: ${details.description}\nTime: ${details.timestampUtc}\nDevice: ${details.deviceInfo || "N/A"}\nIP: ${details.ipAddress || "N/A"}`,
      html: htmlContent,
    });

    return { success: true, messageId: info.messageId };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Failed to deliver security alert email";
    return { success: false, error: errorMsg };
  }
}


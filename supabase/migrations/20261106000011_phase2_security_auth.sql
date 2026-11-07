-- POCKETASSET PHASE 2: SECURE AUTHENTICATION, ADMIN PANEL, OTP & ACTIVITY MONITORING
-- Migration: 20261106000011_phase2_security_auth.sql
-- Description: Security tables, immutable audit logs, session records, admin OTP challenges, security notifications, RLS

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- 2. Authorized Admins Table (Server allowlist & DB record)
CREATE TABLE IF NOT EXISTS public.authorized_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  added_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

ALTER TABLE public.authorized_admins ENABLE ROW LEVEL SECURITY;

-- Only authenticated users can verify if their own email is an authorized admin
CREATE POLICY "Admins can check own authorization"
  ON public.authorized_admins FOR SELECT
  TO authenticated
  USING (lower(email) = lower(auth.jwt() ->> 'email'));

-- Seed default authorized admin (Private single-owner)
INSERT INTO public.authorized_admins (email, is_active)
VALUES ('zeeshan@pocketasset.pk', true)
ON CONFLICT (email) DO NOTHING;

-- 3. Login Audit Logs Table (Immutable audit trail)
CREATE TABLE IF NOT EXISTS public.login_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT NOT NULL,
  session_id TEXT,
  server_timestamp TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  client_timezone TEXT,
  device_type TEXT NOT NULL DEFAULT 'Desktop',
  browser TEXT,
  operating_system TEXT,
  ip_address TEXT,
  approx_location TEXT DEFAULT 'Location unavailable',
  login_method TEXT NOT NULL DEFAULT 'password',
  status TEXT NOT NULL DEFAULT 'success',
  failure_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_login_audit_user_id ON public.login_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_login_audit_server_timestamp ON public.login_audit_logs(server_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_login_audit_status ON public.login_audit_logs(status);

ALTER TABLE public.login_audit_logs ENABLE ROW LEVEL SECURITY;

-- Owner can read their own login audit logs
CREATE POLICY "Users can view own login logs"
  ON public.login_audit_logs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR lower(user_email) = lower(auth.jwt() ->> 'email'));

-- Authenticated users or server can insert login logs
CREATE POLICY "Users can insert own login logs"
  ON public.login_audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- Immutable: No client update or delete
-- (Service role key or superuser bypasses RLS for maintenance)

-- 4. Session Records Table (Active & Revoked Sessions)
CREATE TABLE IF NOT EXISTS public.session_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  device_type TEXT NOT NULL DEFAULT 'Desktop',
  browser TEXT,
  operating_system TEXT,
  approx_location TEXT DEFAULT 'Location unavailable',
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  expires_at TIMESTAMPTZ NOT NULL,
  is_revoked BOOLEAN NOT NULL DEFAULT false,
  revoked_at TIMESTAMPTZ,
  revoked_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_session_records_user ON public.session_records(user_id);
CREATE INDEX IF NOT EXISTS idx_session_records_session_id ON public.session_records(session_id);
CREATE INDEX IF NOT EXISTS idx_session_records_is_revoked ON public.session_records(is_revoked);

ALTER TABLE public.session_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions"
  ON public.session_records FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own sessions (e.g. revoke)"
  ON public.session_records FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can insert own sessions"
  ON public.session_records FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 5. Page Activity Logs Table (Navigation Events Only - Privacy Preserved)
CREATE TABLE IF NOT EXISTS public.page_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT,
  page_name TEXT NOT NULL,
  route TEXT NOT NULL,
  visited_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  duration_seconds INTEGER DEFAULT 0,
  device_type TEXT DEFAULT 'Desktop',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_page_activity_user ON public.page_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_page_activity_visited_at ON public.page_activity_logs(visited_at DESC);

ALTER TABLE public.page_activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own page activity"
  ON public.page_activity_logs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own page activity"
  ON public.page_activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 6. Admin OTP Challenges Table (Hashed OTP, Expiry, Rate Limit)
CREATE TABLE IF NOT EXISTS public.admin_otp_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  admin_email TEXT NOT NULL,
  otp_hash TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  expires_at TIMESTAMPTZ NOT NULL,
  is_used BOOLEAN NOT NULL DEFAULT false,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_admin_otp_user_id ON public.admin_otp_challenges(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_otp_expires_at ON public.admin_otp_challenges(expires_at);

ALTER TABLE public.admin_otp_challenges ENABLE ROW LEVEL SECURITY;

-- Client roles (anon and authenticated) CANNOT read, insert, update or delete OTP challenges directly!
-- This table is strictly server-side access only via server action/API with service role key or internal procedures.

-- 7. Security Notifications Table
CREATE TABLE IF NOT EXISTS public.security_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL, -- 'login', 'new_device', 'admin_otp', 'session_revocation', 'security_alert'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_security_notifications_user ON public.security_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_security_notifications_read ON public.security_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_security_notifications_created_at ON public.security_notifications(created_at DESC);

ALTER TABLE public.security_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON public.security_notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications (mark read)"
  ON public.security_notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can insert own notifications"
  ON public.security_notifications FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 8. Security Settings Table
CREATE TABLE IF NOT EXISTS public.security_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  otp_expiry_minutes INTEGER NOT NULL DEFAULT 5,
  session_timeout_hours INTEGER NOT NULL DEFAULT 24,
  admin_session_timeout_minutes INTEGER NOT NULL DEFAULT 30,
  notify_new_device BOOLEAN NOT NULL DEFAULT true,
  notify_failed_login BOOLEAN NOT NULL DEFAULT true,
  notify_admin_otp BOOLEAN NOT NULL DEFAULT true,
  failed_login_threshold INTEGER NOT NULL DEFAULT 5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

ALTER TABLE public.security_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own security settings"
  ON public.security_settings FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own security settings"
  ON public.security_settings FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can insert own security settings"
  ON public.security_settings FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());


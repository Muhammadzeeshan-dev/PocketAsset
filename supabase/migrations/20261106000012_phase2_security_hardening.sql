-- POCKETASSET PHASE 2: SECURITY HARDENING & AUDIT MIGRATION
-- Migration: 20261106000012_phase2_security_hardening.sql
-- Description: Closes RLS spoofing vectors, enforces audit log authenticity, creates composite indexes for session revocation

-- 1. Tighten Login Audit Log Insertion RLS
-- Prevent authenticated users from inserting audit logs claiming user_id is NULL or spoofing other emails
DROP POLICY IF EXISTS "Users can insert own login logs" ON public.login_audit_logs;

CREATE POLICY "Users can insert own login logs strictly"
  ON public.login_audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    lower(user_email) = lower(auth.jwt() ->> 'email')
  );

-- 2. Ensure session revocation index exists for rapid revocation checks
CREATE INDEX IF NOT EXISTS idx_session_records_lookup
  ON public.session_records(session_id, is_revoked);

-- 3. Verify admin_otp_challenges remains strictly server-side
-- Default deny for anon & authenticated roles is preserved (no client policies)
ALTER TABLE public.admin_otp_challenges ENABLE ROW LEVEL SECURITY;

-- 4. Ensure Immutable Audit Logs Trigger
-- Create a trigger that prevents updates or deletes even if an authenticated user attempts it
CREATE OR REPLACE FUNCTION public.prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit logs are immutable and cannot be updated or deleted.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_immutable_login_audit ON public.login_audit_logs;
CREATE TRIGGER trg_immutable_login_audit
  BEFORE UPDATE OR DELETE ON public.login_audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_audit_log_modification();

DROP TRIGGER IF EXISTS trg_immutable_page_activity ON public.page_activity_logs;
CREATE TRIGGER trg_immutable_page_activity
  BEFORE UPDATE OR DELETE ON public.page_activity_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_audit_log_modification();


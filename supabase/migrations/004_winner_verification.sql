-- ============================================================
-- DigiHeroes - Winner Verification & Payment Tracking
-- Migration: 004_winner_verification.sql
-- ============================================================

-- ── Extend draw_winners ──────────────────────────────────────
ALTER TABLE draw_winners
  ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (verification_status IN ('pending', 'submitted', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'paid')),
  ADD COLUMN IF NOT EXISTS proof_url           TEXT,
  ADD COLUMN IF NOT EXISTS proof_submitted_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reviewed_at         TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reviewed_by         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rejection_reason    TEXT;

-- ── Indexes ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_draw_winners_verification ON draw_winners(verification_status);
CREATE INDEX IF NOT EXISTS idx_draw_winners_payment      ON draw_winners(payment_status);

-- ── Admin can view and update all winners ────────────────────
-- (supabaseAdmin bypasses RLS; these policies are for direct client access)
CREATE POLICY "Admins can manage draw winners"
  ON draw_winners FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

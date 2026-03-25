-- ============================================================
-- DigiHeroes - Draw & Charity System Overhaul
-- Migration: 003_draw_charity_overhaul.sql
-- ============================================================

-- ── Extend monthly_draws ──────────────────────────────────────
ALTER TABLE monthly_draws
  ADD COLUMN IF NOT EXISTS draw_type          TEXT NOT NULL DEFAULT 'random'
    CHECK (draw_type IN ('random', 'algorithmic')),
  ADD COLUMN IF NOT EXISTS drawn_numbers      INTEGER[],          -- 5 winning numbers
  ADD COLUMN IF NOT EXISTS jackpot_amount     NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS pool_5match        NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS pool_4match        NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS pool_3match        NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS simulation_numbers INTEGER[],
  ADD COLUMN IF NOT EXISTS simulation_result  JSONB,
  ADD COLUMN IF NOT EXISTS published          BOOLEAN NOT NULL DEFAULT FALSE;

-- ── user_draw_picks ───────────────────────────────────────────
-- Stores each user's 5 chosen numbers per draw
CREATE TABLE IF NOT EXISTS user_draw_picks (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  draw_id        UUID NOT NULL REFERENCES monthly_draws(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  picked_numbers INTEGER[] NOT NULL,   -- exactly 5 numbers from 1–45
  match_count    INTEGER,              -- filled after draw runs (0–5)
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(draw_id, user_id)
);

-- ── draw_winners ──────────────────────────────────────────────
-- One row per winner per tier (multiple rows if multiple winners)
CREATE TABLE IF NOT EXISTS draw_winners (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  draw_id      UUID NOT NULL REFERENCES monthly_draws(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_type   INTEGER NOT NULL CHECK (match_type IN (3, 4, 5)),
  prize_amount NUMERIC(10,2) NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Extend charities ─────────────────────────────────────────
ALTER TABLE charities
  ADD COLUMN IF NOT EXISTS image_url    TEXT,
  ADD COLUMN IF NOT EXISTS is_featured  BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS events       JSONB NOT NULL DEFAULT '[]'::jsonb;
  -- events format: [{"title":"Golf Day","date":"2026-05-10","description":"...","location":"..."}]

-- ── Extend user_charities ─────────────────────────────────────
-- Minimum 10%, users can voluntarily increase
ALTER TABLE user_charities
  ADD COLUMN IF NOT EXISTS charity_percentage INTEGER NOT NULL DEFAULT 10
    CHECK (charity_percentage >= 10 AND charity_percentage <= 100);

-- ── independent_donations ─────────────────────────────────────
-- Records voluntary donations outside of subscription
CREATE TABLE IF NOT EXISTS independent_donations (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  charity_id UUID NOT NULL REFERENCES charities(id) ON DELETE RESTRICT,
  amount     NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  message    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Indexes ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_user_draw_picks_draw_id  ON user_draw_picks(draw_id);
CREATE INDEX IF NOT EXISTS idx_user_draw_picks_user_id  ON user_draw_picks(user_id);
CREATE INDEX IF NOT EXISTS idx_draw_winners_draw_id     ON draw_winners(draw_id);
CREATE INDEX IF NOT EXISTS idx_draw_winners_user_id     ON draw_winners(user_id);
CREATE INDEX IF NOT EXISTS idx_indep_donations_user     ON independent_donations(user_id);
CREATE INDEX IF NOT EXISTS idx_indep_donations_charity  ON independent_donations(charity_id);

-- ── Updated_at trigger for picks ─────────────────────────────
CREATE TRIGGER user_draw_picks_updated_at
  BEFORE UPDATE ON user_draw_picks
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- ── RLS ───────────────────────────────────────────────────────
ALTER TABLE user_draw_picks       ENABLE ROW LEVEL SECURITY;
ALTER TABLE draw_winners          ENABLE ROW LEVEL SECURITY;
ALTER TABLE independent_donations ENABLE ROW LEVEL SECURITY;

-- user_draw_picks: users see/manage their own
CREATE POLICY "Users can view their own picks"
  ON user_draw_picks FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their picks"
  ON user_draw_picks FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their picks"
  ON user_draw_picks FOR UPDATE USING (auth.uid() = user_id);

-- draw_winners: publicly readable so users can see who won
CREATE POLICY "Anyone can view draw winners"
  ON draw_winners FOR SELECT USING (TRUE);

-- independent_donations: users see their own
CREATE POLICY "Users can view their own donations"
  ON independent_donations FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert donations"
  ON independent_donations FOR INSERT WITH CHECK (auth.uid() = user_id);

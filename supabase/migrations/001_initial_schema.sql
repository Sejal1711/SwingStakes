-- ============================================================
-- DigiHeroes - Initial Database Schema
-- Migration: 001_initial_schema.sql
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLES
-- ============================================================

-- ── profiles ─────────────────────────────────────────────────
-- One profile per auth user. Created on registration.
CREATE TABLE IF NOT EXISTS profiles (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  username        TEXT NOT NULL,
  avatar_url      TEXT,
  handicap        NUMERIC(4, 1) CHECK (handicap >= 0 AND handicap <= 54),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── subscriptions ─────────────────────────────────────────────
-- Tracks Stripe subscription state per user.
CREATE TABLE IF NOT EXISTS subscriptions (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_type               TEXT NOT NULL CHECK (plan_type IN ('monthly', 'yearly')),
  status                  TEXT NOT NULL DEFAULT 'inactive'
                            CHECK (status IN ('active', 'inactive', 'cancelled', 'past_due', 'trialing')),
  stripe_subscription_id  TEXT UNIQUE,
  current_period_end      TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── golf_scores ───────────────────────────────────────────────
-- One row per round played. Stableford scoring system.
CREATE TABLE IF NOT EXISTS golf_scores (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score_date        DATE NOT NULL,
  course_name       TEXT NOT NULL,
  stableford_points INTEGER NOT NULL CHECK (stableford_points >= 0 AND stableford_points <= 72),
  gross_score       INTEGER CHECK (gross_score >= 50 AND gross_score <= 150),
  handicap_at_time  NUMERIC(4, 1) CHECK (handicap_at_time >= 0 AND handicap_at_time <= 54),
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── charities ─────────────────────────────────────────────────
-- Curated list of charities available for selection.
CREATE TABLE IF NOT EXISTS charities (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  description TEXT,
  logo_url    TEXT,
  website     TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── user_charities ────────────────────────────────────────────
-- Maps users to their chosen charity (one active charity per user).
CREATE TABLE IF NOT EXISTS user_charities (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  charity_id  UUID NOT NULL REFERENCES charities(id) ON DELETE RESTRICT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── monthly_draws ─────────────────────────────────────────────
-- One draw per calendar month. Admin-managed.
CREATE TABLE IF NOT EXISTS monthly_draws (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  month_year        TEXT NOT NULL UNIQUE,   -- format: 'YYYY-MM'
  prize_pool_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  status            TEXT NOT NULL DEFAULT 'open'
                      CHECK (status IN ('open', 'closed', 'drawn')),
  winner_user_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  drawn_at          TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── draw_entries ──────────────────────────────────────────────
-- Tracks each user's entry count per draw.
CREATE TABLE IF NOT EXISTS draw_entries (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  draw_id       UUID NOT NULL REFERENCES monthly_draws(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entries_count INTEGER NOT NULL DEFAULT 1 CHECK (entries_count >= 1),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (draw_id, user_id)
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_profiles_user_id         ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id    ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status     ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_golf_scores_user_id      ON golf_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_golf_scores_score_date   ON golf_scores(score_date DESC);
CREATE INDEX IF NOT EXISTS idx_user_charities_user_id   ON user_charities(user_id);
CREATE INDEX IF NOT EXISTS idx_draw_entries_draw_id     ON draw_entries(draw_id);
CREATE INDEX IF NOT EXISTS idx_draw_entries_user_id     ON draw_entries(user_id);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER golf_scores_updated_at
  BEFORE UPDATE ON golf_scores
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER monthly_draws_updated_at
  BEFORE UPDATE ON monthly_draws
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE golf_scores    ENABLE ROW LEVEL SECURITY;
ALTER TABLE charities      ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_charities ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_draws  ENABLE ROW LEVEL SECURITY;
ALTER TABLE draw_entries   ENABLE ROW LEVEL SECURITY;

-- ── profiles ──────────────────────────────────────────────────
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ── subscriptions ─────────────────────────────────────────────
CREATE POLICY "Users can view their own subscription"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- ── golf_scores ───────────────────────────────────────────────
CREATE POLICY "Users can view their own scores"
  ON golf_scores FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own scores"
  ON golf_scores FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scores"
  ON golf_scores FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scores"
  ON golf_scores FOR DELETE
  USING (auth.uid() = user_id);

-- ── charities ─────────────────────────────────────────────────
-- Charities are publicly readable
CREATE POLICY "Anyone can view active charities"
  ON charities FOR SELECT
  USING (is_active = TRUE);

-- ── user_charities ────────────────────────────────────────────
CREATE POLICY "Users can view their own charity selection"
  ON user_charities FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their charity selection"
  ON user_charities FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their charity selection"
  ON user_charities FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── monthly_draws ─────────────────────────────────────────────
-- Draws are publicly readable
CREATE POLICY "Anyone can view draws"
  ON monthly_draws FOR SELECT
  USING (TRUE);

-- ── draw_entries ──────────────────────────────────────────────
CREATE POLICY "Users can view their own draw entries"
  ON draw_entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own draw entries"
  ON draw_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- SEED DATA — Sample Charities
-- ============================================================

INSERT INTO charities (name, description, website, is_active) VALUES
  (
    'Macmillan Cancer Support',
    'Providing physical, financial, and emotional support to people affected by cancer.',
    'https://www.macmillan.org.uk',
    TRUE
  ),
  (
    'British Heart Foundation',
    'Funding research to prevent and treat heart and circulatory diseases.',
    'https://www.bhf.org.uk',
    TRUE
  ),
  (
    'RNLI',
    'The Royal National Lifeboat Institution saves lives at sea.',
    'https://rnli.org',
    TRUE
  ),
  (
    'Age UK',
    'Supporting older people to live well and independently.',
    'https://www.ageuk.org.uk',
    TRUE
  ),
  (
    'Mind',
    'Mental health charity offering information and support to those who need it.',
    'https://www.mind.org.uk',
    TRUE
  )
ON CONFLICT DO NOTHING;

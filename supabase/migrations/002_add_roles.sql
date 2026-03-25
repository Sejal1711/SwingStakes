-- ============================================================
-- Migration: 002_add_roles.sql
-- Adds role column to profiles and auto-create profile trigger
-- ============================================================

-- 1. Add role column to profiles
--    'visitor' = not logged in (handled at app level, no DB row)
--    'subscriber' = default for all registered users
--    'admin' = full platform control
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'subscriber'
    CHECK (role IN ('subscriber', 'admin'));

-- 2. Auto-create profile when a new user signs up
--    This fires after every INSERT into auth.users (Supabase's auth table)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    'subscriber'
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if it already exists, then recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 3. Allow admins to read all profiles (needed for admin dashboard later)
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM profiles WHERE role = 'admin'
    )
  );

-- 4. Allow admins to update any profile (e.g. change someone's role)
CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT user_id FROM profiles WHERE role = 'admin'
    )
  );

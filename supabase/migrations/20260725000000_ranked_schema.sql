-- KeyFury v1 Ranked & Profiles Schema Migration

-- 1. Extend profiles table with ranked and cosmetic columns
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS mmr INT NOT NULL DEFAULT 1000,
  ADD COLUMN IF NOT EXISTS rank_tier TEXT NOT NULL DEFAULT 'Bronze',
  ADD COLUMN IF NOT EXISTS rank_division TEXT NOT NULL DEFAULT 'I',
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS keycap_theme TEXT NOT NULL DEFAULT 'default',
  ADD COLUMN IF NOT EXISTS accent_color TEXT NOT NULL DEFAULT '#00ffcc',
  ADD COLUMN IF NOT EXISTS matches_played INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS wins INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS losses INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS placement_remaining INT NOT NULL DEFAULT 5;

-- 2. Leaderboard indexes
CREATE INDEX IF NOT EXISTS idx_profiles_mmr ON profiles(mmr DESC);

-- 3. Stored function to calculate rank tier and division based on MMR
CREATE OR REPLACE FUNCTION calculate_rank_tier(p_mmr INT)
RETURNS JSONB AS $$
DECLARE
  v_tier TEXT;
  v_division TEXT;
BEGIN
  IF p_mmr < 800 THEN
    v_tier := 'Bronze'; v_division := 'III';
  ELSIF p_mmr < 1000 THEN
    v_tier := 'Bronze'; v_division := 'II';
  ELSIF p_mmr < 1200 THEN
    v_tier := 'Bronze'; v_division := 'I';
  ELSIF p_mmr < 1400 THEN
    v_tier := 'Silver'; v_division := 'III';
  ELSIF p_mmr < 1600 THEN
    v_tier := 'Silver'; v_division := 'II';
  ELSIF p_mmr < 1800 THEN
    v_tier := 'Silver'; v_division := 'I';
  ELSIF p_mmr < 2000 THEN
    v_tier := 'Gold'; v_division := 'III';
  ELSIF p_mmr < 2200 THEN
    v_tier := 'Gold'; v_division := 'II';
  ELSIF p_mmr < 2400 THEN
    v_tier := 'Gold'; v_division := 'I';
  ELSIF p_mmr < 2600 THEN
    v_tier := 'Platinum'; v_division := 'III';
  ELSIF p_mmr < 2800 THEN
    v_tier := 'Platinum'; v_division := 'II';
  ELSIF p_mmr < 3000 THEN
    v_tier := 'Platinum'; v_division := 'I';
  ELSIF p_mmr < 3300 THEN
    v_tier := 'Diamond'; v_division := 'III';
  ELSIF p_mmr < 3600 THEN
    v_tier := 'Diamond'; v_division := 'II';
  ELSIF p_mmr < 4000 THEN
    v_tier := 'Diamond'; v_division := 'I';
  ELSIF p_mmr < 4500 THEN
    v_tier := 'Master'; v_division := 'I';
  ELSE
    v_tier := 'Grandmaster'; v_division := 'I';
  END IF;

  RETURN jsonb_build_object('tier', v_tier, 'division', v_division);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 4. Update save_match_result stored procedure to update profiles stats and handle ELO deltas
CREATE OR REPLACE FUNCTION save_match_result(
  p_match JSONB,
  p_players JSONB,
  p_events JSONB DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
  p_elem JSONB;
  v_profile_id UUID;
  v_elo_delta INT;
  v_is_win BOOLEAN;
  v_is_loss BOOLEAN;
  v_new_mmr INT;
  v_rank JSONB;
  v_match_already_saved BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM matches WHERE id = p_match->>'id'
  ) INTO v_match_already_saved;

  INSERT INTO matches (
    id, rules_version, deck_seed, status, started_at, ended_at, winner_profile_id, end_reason, integrity_status
  ) VALUES (
    p_match->>'id',
    p_match->>'rules_version',
    p_match->>'deck_seed',
    p_match->>'status',
    (p_match->>'started_at')::timestamptz,
    (p_match->>'ended_at')::timestamptz,
    CASE WHEN p_match->>'winner_profile_id' IS NULL THEN NULL ELSE (p_match->>'winner_profile_id')::uuid END,
    p_match->>'end_reason',
    COALESCE(p_match->>'integrity_status', 'normal')
  ) ON CONFLICT (id) DO UPDATE SET
    status = EXCLUDED.status,
    ended_at = EXCLUDED.ended_at,
    winner_profile_id = EXCLUDED.winner_profile_id,
    end_reason = EXCLUDED.end_reason,
    integrity_status = EXCLUDED.integrity_status;

  IF jsonb_typeof(p_players) = 'array' THEN
    FOR p_elem IN SELECT * FROM jsonb_array_elements(p_players) LOOP
      v_profile_id := (p_elem->>'profile_id')::uuid;
      v_elo_delta := COALESCE((p_elem->>'elo_delta')::int, (p_elem->>'mmr_delta')::int, 0);

      INSERT INTO match_players (
        match_id, profile_id, side, joined_at, left_at, final_health, accepted_wpm, accuracy, highest_combo, words_completed, result
      ) VALUES (
        p_match->>'id',
        v_profile_id,
        p_elem->>'side',
        COALESCE((p_elem->>'joined_at')::timestamptz, now()),
        (p_elem->>'left_at')::timestamptz,
        (p_elem->>'final_health')::int,
        (p_elem->>'accepted_wpm')::numeric,
        (p_elem->>'accuracy')::numeric,
        (p_elem->>'highest_combo')::int,
        (p_elem->>'words_completed')::int,
        p_elem->>'result'
      ) ON CONFLICT DO NOTHING;

      -- Atomically update profile stats if match was not previously recorded
      IF NOT v_match_already_saved THEN
        v_is_win := (p_elem->>'result' = 'win') OR (p_match->>'winner_profile_id' IS NOT NULL AND (p_match->>'winner_profile_id')::uuid = v_profile_id);
        v_is_loss := (p_elem->>'result' = 'loss') OR (p_match->>'winner_profile_id' IS NOT NULL AND (p_match->>'winner_profile_id')::uuid != v_profile_id AND NOT v_is_win);

        SELECT GREATEST(0, mmr + v_elo_delta) INTO v_new_mmr FROM profiles WHERE id = v_profile_id;
        IF v_new_mmr IS NULL THEN
          v_new_mmr := GREATEST(0, 1000 + v_elo_delta);
        END IF;

        v_rank := calculate_rank_tier(v_new_mmr);

        UPDATE profiles SET
          matches_played = matches_played + 1,
          wins = wins + CASE WHEN v_is_win THEN 1 ELSE 0 END,
          losses = losses + CASE WHEN v_is_loss THEN 1 ELSE 0 END,
          placement_remaining = GREATEST(0, placement_remaining - 1),
          mmr = v_new_mmr,
          rank_tier = v_rank->>'tier',
          rank_division = v_rank->>'division',
          last_seen_at = now()
        WHERE id = v_profile_id;
      END IF;
    END LOOP;
  END IF;

  IF p_events IS NOT NULL THEN
    INSERT INTO match_events (match_id, event_version, event_data)
    VALUES (
      p_match->>'id',
      COALESCE(p_events->>'event_version', '1.0'),
      p_events->'event_data'
    ) ON CONFLICT DO NOTHING;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. RLS Policies update for Profiles
DROP POLICY IF EXISTS "Public read display names" ON profiles;
DROP POLICY IF EXISTS "Users can read/update own profile" ON profiles;
DROP POLICY IF EXISTS "Public read profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

CREATE POLICY "Public read profiles" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

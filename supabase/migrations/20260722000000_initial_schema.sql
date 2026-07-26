-- KeyFury v1 Initial Schema Migration

-- Profiles Table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Matches Table
CREATE TABLE IF NOT EXISTS matches (
  id TEXT PRIMARY KEY,
  rules_version TEXT NOT NULL,
  deck_seed TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  winner_profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  end_reason TEXT NOT NULL,
  integrity_status TEXT NOT NULL DEFAULT 'normal'
);

-- Match Players Table
CREATE TABLE IF NOT EXISTS match_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id TEXT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  side TEXT NOT NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  left_at TIMESTAMPTZ,
  final_health INT NOT NULL,
  accepted_wpm NUMERIC NOT NULL,
  accuracy NUMERIC NOT NULL,
  highest_combo INT NOT NULL,
  words_completed INT NOT NULL,
  result TEXT NOT NULL
);

-- Match Events Table (Replay / Compact Log)
CREATE TABLE IF NOT EXISTS match_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id TEXT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  event_version TEXT NOT NULL DEFAULT '1.0',
  event_data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_match_players_profile ON match_players(profile_id, joined_at DESC);
CREATE INDEX IF NOT EXISTS idx_match_players_match ON match_players(match_id);

-- Enable Row-Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Profiles: Users read/update their own profile; public select allowed for match stats
CREATE POLICY "Users can read/update own profile" ON profiles
  FOR ALL USING (auth.uid() = id);

CREATE POLICY "Public read display names" ON profiles
  FOR SELECT USING (true);

-- Matches: Participating players can select matches
CREATE POLICY "Players can select their matches" ON matches
  FOR SELECT USING (
    id IN (SELECT match_id FROM match_players WHERE profile_id = auth.uid())
  );

-- Match Players: Participating players can select match player entries
CREATE POLICY "Players can select match player records" ON match_players
  FOR SELECT USING (
    profile_id = auth.uid() OR match_id IN (SELECT match_id FROM match_players WHERE profile_id = auth.uid())
  );

-- Match Events: Participating players can select event stream
CREATE POLICY "Players can select match events" ON match_events
  FOR SELECT USING (
    match_id IN (SELECT match_id FROM match_players WHERE profile_id = auth.uid())
  );

-- Stored Procedure for Idempotent Match Persistence (Executed by Service Role)
CREATE OR REPLACE FUNCTION save_match_result(
  p_match JSONB,
  p_players JSONB,
  p_events JSONB DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
  p_elem JSONB;
BEGIN
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
      INSERT INTO match_players (
        match_id, profile_id, side, joined_at, left_at, final_health, accepted_wpm, accuracy, highest_combo, words_completed, result
      ) VALUES (
        p_match->>'id',
        (p_elem->>'profile_id')::uuid,
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

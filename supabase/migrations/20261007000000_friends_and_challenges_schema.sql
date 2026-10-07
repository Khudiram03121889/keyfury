-- KeyFury Friends & Realtime Challenge Invites Schema Migration

-- 1. Friendships table
CREATE TABLE IF NOT EXISTS friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'declined'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT check_distinct_users CHECK (user_id <> friend_id),
  CONSTRAINT unique_friendship UNIQUE (user_id, friend_id)
);

CREATE INDEX IF NOT EXISTS idx_friendships_user ON friendships(user_id, status);
CREATE INDEX IF NOT EXISTS idx_friendships_friend ON friendships(friend_id, status);

-- 2. Challenge Invites table
CREATE TABLE IF NOT EXISTS challenge_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  room_code TEXT NOT NULL,
  arena_id TEXT NOT NULL DEFAULT 'cyber_rooftop',
  character_id TEXT NOT NULL DEFAULT 'shadow_ronin',
  match_duration INT NOT NULL DEFAULT 60,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'declined', 'expired'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '2 minutes'),
  CONSTRAINT check_distinct_challenge_users CHECK (sender_id <> receiver_id)
);

CREATE INDEX IF NOT EXISTS idx_challenge_invites_receiver ON challenge_invites(receiver_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_challenge_invites_sender ON challenge_invites(sender_id, status);

-- 3. Enable Row-Level Security
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_invites ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for friendships
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'friendships' AND policyname = 'Public read friendships') THEN
    CREATE POLICY "Public read friendships" ON friendships FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'friendships' AND policyname = 'Users can create friendship requests') THEN
    CREATE POLICY "Users can create friendship requests" ON friendships FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'friendships' AND policyname = 'Users can update friendships') THEN
    CREATE POLICY "Users can update friendships" ON friendships FOR UPDATE USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'friendships' AND policyname = 'Users can delete friendships') THEN
    CREATE POLICY "Users can delete friendships" ON friendships FOR DELETE USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'challenge_invites' AND policyname = 'Public read challenge invites') THEN
    CREATE POLICY "Public read challenge invites" ON challenge_invites FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'challenge_invites' AND policyname = 'Users can create challenge invites') THEN
    CREATE POLICY "Users can create challenge invites" ON challenge_invites FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'challenge_invites' AND policyname = 'Users can update challenge invites') THEN
    CREATE POLICY "Users can update challenge invites" ON challenge_invites FOR UPDATE USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'challenge_invites' AND policyname = 'Users can delete challenge invites') THEN
    CREATE POLICY "Users can delete challenge invites" ON challenge_invites FOR DELETE USING (true);
  END IF;
END $$;

-- 5. Realtime Publication
ALTER PUBLICATION supabase_realtime ADD TABLE friendships;
ALTER PUBLICATION supabase_realtime ADD TABLE challenge_invites;

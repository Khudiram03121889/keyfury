-- KeyFury Achievements Schema Migration

-- 1. Create achievements table
CREATE TABLE IF NOT EXISTS achievements (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'milestone',
  max_progress INT NOT NULL DEFAULT 1,
  reward_xp INT NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create user_achievements table
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  progress INT NOT NULL DEFAULT 0,
  unlocked BOOLEAN NOT NULL DEFAULT FALSE,
  unlocked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_user_achievement UNIQUE(profile_id, achievement_id)
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_user_achievements_profile ON user_achievements(profile_id);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
CREATE POLICY "Public read achievements" ON achievements FOR SELECT USING (true);
CREATE POLICY "Users view own achievements" ON user_achievements FOR SELECT USING (auth.uid() = profile_id OR profile_id IN (SELECT id FROM profiles WHERE is_guest = true));
CREATE POLICY "Users insert/update own achievements" ON user_achievements FOR ALL USING (auth.uid() = profile_id OR profile_id IN (SELECT id FROM profiles WHERE is_guest = true));

-- 6. Populate default achievements
INSERT INTO achievements (id, title, description, icon, category, max_progress, reward_xp) VALUES
  ('first_blood', 'First Blood', 'Complete your first 1v1 typing match.', '🥊', 'combat', 1, 50),
  ('speed_demon', 'Speed Demon', 'Reach 100+ WPM in a match.', '⚡', 'speed', 1, 100),
  ('hyper_typist', 'Hyper Typist', 'Reach 130+ WPM in a match.', '🚀', 'speed', 1, 200),
  ('combo_master', 'Combo Master', 'Achieve a 20+ combo streak in live combat.', '🔥', 'combat', 1, 150),
  ('first_victory', 'First Victory', 'Win your first Ranked Match.', '🏆', 'ranked', 1, 100),
  ('veteran_warrior', 'Veteran Warrior', 'Win 10 Ranked Matches.', '🥇', 'ranked', 10, 300),
  ('sharpshooter', 'Sharpshooter', 'Complete a match with 98%+ typing accuracy.', '🎯', 'skill', 1, 150),
  ('diamond_ascendant', 'Diamond Ascendant', 'Reach 2000+ MMR (Diamond Tier).', '💎', 'ranked', 1, 500),
  ('keyboard_god', 'Keyboard God', 'Win 25 Ranked Matches.', '👑', 'ranked', 25, 1000)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  max_progress = EXCLUDED.max_progress;

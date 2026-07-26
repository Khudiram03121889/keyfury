import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { RankTier, getRankTier } from '../components/ranked/RankBadge';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

export interface GuestProfile {
  id: string;
  displayName: string;
  email?: string;
  avatarUrl?: string;
  keycapTheme?: string;
  accentColor?: string;
  mmr?: number;
  rankTier?: RankTier;
  rankDivision?: string;
  wins?: number;
  losses?: number;
  matchesPlayed?: number;
  avgWpm?: number;
  peakWpm?: number;
  accuracy?: number;
  isGuest?: boolean;
}

export interface UserProfile {
  id: string;
  displayName: string;
  email?: string;
  avatarUrl: string;
  bio: string;
  keycapTheme: string;
  accentColor: string;
  mmr: number;
  rankTier: RankTier;
  rankDivision: string;
  matchesPlayed: number;
  wins: number;
  losses: number;
  placementRemaining?: number;
  avgWpm: number;
  peakWpm: number;
  accuracy: number;
  isGuest: boolean;
  createdAt?: string;
}

export interface MatchHistoryItem {
  id?: string;
  match_id: string;
  result: 'WIN' | 'LOSS' | 'DRAW' | 'win' | 'loss' | 'draw';
  final_health: number;
  accepted_wpm: number;
  accuracy: number;
  highest_combo: number;
  words_completed: number;
  joined_at: string;
  opponent_name?: string;
  mode?: string;
  mmr_delta?: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'combat' | 'speed' | 'ranked' | 'skill';
  maxProgress: number;
  rewardXp: number;
}

export interface UserAchievement {
  achievementId: string;
  progress: number;
  unlocked: boolean;
  unlockedAt?: string;
}

export const DEFAULT_ACHIEVEMENTS: Achievement[] = [
  // --- Beginner Tier (Easy & Onboarding) ---
  { id: 'first_blood', title: 'First Blood', description: 'Complete your first 1v1 typing duel.', icon: '🥊', category: 'combat', maxProgress: 1, rewardXp: 50 },
  { id: 'first_victory', title: 'First Victory', description: 'Win your first Ranked or Quick Duel match.', icon: '🏆', category: 'ranked', maxProgress: 1, rewardXp: 100 },
  { id: 'warmup', title: 'Warmup Specialist', description: 'Reach 40+ WPM in a live match.', icon: '⚡', category: 'speed', maxProgress: 1, rewardXp: 50 },
  { id: 'steady_fingers', title: 'Steady Fingers', description: 'Complete a match with 90%+ typing accuracy.', icon: '🎯', category: 'skill', maxProgress: 1, rewardXp: 50 },
  { id: 'combo_starter', title: 'Combo Starter', description: 'Achieve a 5x combo streak in live combat.', icon: '🔥', category: 'combat', maxProgress: 1, rewardXp: 50 },
  { id: 'clean_fight', title: 'Flawless Victory', description: 'Win a match with 90%+ final health remaining.', icon: '🛡️', category: 'combat', maxProgress: 1, rewardXp: 100 },
  { id: 'bot_slayer', title: 'Bot Crusher', description: 'Defeat an AI Bot opponent in practice mode.', icon: '🤖', category: 'combat', maxProgress: 1, rewardXp: 75 },

  // --- Intermediate Tier (Medium Challenge) ---
  { id: 'speed_demon', title: 'Speed Demon', description: 'Reach 80+ WPM in a live match.', icon: '⚡', category: 'speed', maxProgress: 1, rewardXp: 100 },
  { id: 'century_club', title: 'Century Club', description: 'Reach 100+ WPM in a live match.', icon: '💯', category: 'speed', maxProgress: 1, rewardXp: 150 },
  { id: 'combo_master', title: 'Combo Master', description: 'Achieve a 20x combo streak in live combat.', icon: '🔥', category: 'combat', maxProgress: 1, rewardXp: 150 },
  { id: 'sharpshooter', title: 'Sharpshooter', description: 'Complete a match with 98%+ typing accuracy.', icon: '🎯', category: 'skill', maxProgress: 1, rewardXp: 150 },
  { id: 'veteran_warrior', title: 'Veteran Warrior', description: 'Win 10 Ranked 1v1 matches.', icon: '🥇', category: 'ranked', maxProgress: 10, rewardXp: 300 },
  { id: 'silver_warrior', title: 'Silver Gladiator', description: 'Reach 1200+ MMR rating (Silver Tier).', icon: '⚔️', category: 'ranked', maxProgress: 1, rewardXp: 200 },
  { id: 'gold_champion', title: 'Gold Champion', description: 'Reach 1600+ MMR rating (Gold Tier).', icon: '🎖️', category: 'ranked', maxProgress: 1, rewardXp: 300 },
  { id: 'marathon_runner', title: 'Marathon Typist', description: 'Type 500 total words across all matches.', icon: '🏃', category: 'skill', maxProgress: 500, rewardXp: 250 },
  { id: 'comeback_kid', title: 'Comeback Kid', description: 'Win a match after dropping below 25% health.', icon: '💖', category: 'combat', maxProgress: 1, rewardXp: 200 },
  { id: 'bot_master', title: 'AI Dominator', description: 'Defeat a Pro or Adaptive AI Bot.', icon: '🧠', category: 'combat', maxProgress: 1, rewardXp: 150 },

  // --- High Level & Elite Tier (Advanced & Hardcore) ---
  { id: 'hyper_typist', title: 'Hyper Typist', description: 'Reach 130+ WPM in a live match.', icon: '🚀', category: 'speed', maxProgress: 1, rewardXp: 250 },
  { id: 'lightning_strike', title: 'Lightning Velocity', description: 'Reach 150+ WPM in a live match.', icon: '⚡', category: 'speed', maxProgress: 1, rewardXp: 500 },
  { id: 'perfectionist', title: 'Pure Perfection', description: 'Win a 1v1 match with 100% typing accuracy.', icon: '✨', category: 'skill', maxProgress: 1, rewardXp: 300 },
  { id: 'unbreakable', title: 'Unbreakable Combo', description: 'Achieve a 50x combo streak in a live duel.', icon: '💥', category: 'combat', maxProgress: 1, rewardXp: 350 },
  { id: 'platinum_elite', title: 'Platinum Elite', description: 'Reach 2000+ MMR rating (Platinum Tier).', icon: '💠', category: 'ranked', maxProgress: 1, rewardXp: 400 },
  { id: 'diamond_ascendant', title: 'Diamond Ascendant', description: 'Reach 2400+ MMR rating (Diamond Tier).', icon: '💎', category: 'ranked', maxProgress: 1, rewardXp: 500 },
  { id: 'master_realm', title: 'Master Realm', description: 'Reach 2800+ MMR rating (Master Tier).', icon: '⚡', category: 'ranked', maxProgress: 1, rewardXp: 750 },
  { id: 'grandmaster_god', title: 'Grandmaster Deity', description: 'Reach 3200+ MMR rating (Grandmaster Tier).', icon: '👑', category: 'ranked', maxProgress: 1, rewardXp: 1000 },
  { id: 'keyboard_god', title: 'Keyboard God', description: 'Win 25 Ranked 1v1 matches.', icon: '👑', category: 'ranked', maxProgress: 25, rewardXp: 500 },
  { id: 'legendary_warrior', title: 'Legendary Century', description: 'Win 100 Ranked 1v1 matches.', icon: '⚔️', category: 'ranked', maxProgress: 100, rewardXp: 1500 },
  { id: 'wordsmith_master', title: 'Word Titan', description: 'Type 2,500 total words across all matches.', icon: '📚', category: 'skill', maxProgress: 2500, rewardXp: 800 }
];

// Fallback profiles array for offline or fallback global leaderboard
const MOCK_LEADERBOARD: UserProfile[] = [];

export async function ensureGuestSession(): Promise<GuestProfile> {
  const localId = localStorage.getItem('keyfury_guest_id');
  const localName = localStorage.getItem('keyfury_guest_name');
  const localTheme = localStorage.getItem('keyfury_theme') || 'cyberpunk';
  const localAvatar = localStorage.getItem('keyfury_avatar') || '';

  if (localId && localName) {
    const savedProfile = localStorage.getItem(`keyfury_profile_${localId}`);
    let savedMmr = 1000;
    if (savedProfile) {
      try {
        const parsed = JSON.parse(savedProfile);
        if (typeof parsed?.mmr === 'number') savedMmr = parsed.mmr;
      } catch (_e) {}
    } else {
      const gMmr = localStorage.getItem('keyfury_guest_mmr');
      if (gMmr) savedMmr = parseInt(gMmr, 10) || 1000;
    }

    return {
      id: localId,
      displayName: localName,
      keycapTheme: localTheme,
      avatarUrl: localAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${localName}`,
      mmr: savedMmr,
      rankTier: getRankTier(savedMmr),
      rankDivision: 'I',
      isGuest: true
    };
  }

  if (supabase) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const profile = await getUserProfile(session.user.id);
        if (profile) {
          localStorage.setItem('keyfury_guest_id', profile.id);
          localStorage.setItem('keyfury_guest_name', profile.displayName);
          return profile;
        }
      }

      const { data: authData } = await supabase.auth.signInAnonymously();
      if (authData?.session?.user) {
        const generatedName = `Swift Falcon ${Math.floor(Math.random() * 900 + 100)}`;
        const g: GuestProfile = {
          id: authData.session.user.id,
          displayName: generatedName,
          keycapTheme: 'cyberpunk',
          avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${generatedName}`,
          mmr: 1000,
          rankTier: 'Bronze',
          rankDivision: 'I',
          isGuest: true
        };
        localStorage.setItem('keyfury_guest_id', g.id);
        localStorage.setItem('keyfury_guest_name', g.displayName);

        // Attempt creating profile in DB
        await supabase.from('profiles').insert([{
          id: g.id,
          display_name: g.displayName,
          avatar_url: g.avatarUrl,
          keycap_theme: g.keycapTheme || 'cyberpunk',
          mmr: 1000,
          rank_tier: 'Bronze',
          rank_division: 'I'
        }]);

        return g;
      }
    } catch (err) {
      console.warn('[Supabase] Anonymous session setup warning:', err);
    }
  }

  // Fallback guest UUID generation for offline / local mode
  const generatedName = `Swift Falcon ${Math.floor(Math.random() * 900 + 100)}`;
  const guestUuid = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `00000000-0000-4000-a000-${Date.now().toString(16).padStart(12, '0')}`;

  const g: GuestProfile = {
    id: guestUuid,
    displayName: generatedName,
    keycapTheme: 'cyberpunk',
    avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${generatedName}`,
    mmr: 1000,
    rankTier: 'Bronze',
    rankDivision: 'I',
    isGuest: true
  };
  localStorage.setItem('keyfury_guest_id', g.id);
  localStorage.setItem('keyfury_guest_name', g.displayName);
  return g;
}

export async function signUpWithEmail(email: string, pass: string, displayName?: string) {
  const finalName = displayName || email.split('@')[0];

  if (!supabase) {
    // Local fallback user registration
    const existingAccounts = JSON.parse(localStorage.getItem('keyfury_user_accounts') || '[]');
    const existing = existingAccounts.find((a: any) => a.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      throw new Error('An account with this email already exists. Please sign in instead.');
    }

    const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newAccount = {
      id: userId,
      email,
      password: pass,
      displayName: finalName,
      createdAt: new Date().toISOString()
    };
    existingAccounts.push(newAccount);
    localStorage.setItem('keyfury_user_accounts', JSON.stringify(existingAccounts));

    localStorage.setItem('keyfury_guest_id', userId);
    localStorage.setItem('keyfury_guest_name', finalName);

    // Initialize local profile
    const profile: UserProfile = {
      id: userId,
      displayName: finalName,
      email,
      avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${finalName}`,
      bio: 'KeyFury Competitive Warrior',
      keycapTheme: 'cyberpunk',
      accentColor: '#00ffcc',
      mmr: 1000,
      rankTier: 'Bronze',
      rankDivision: 'I',
      matchesPlayed: 0,
      wins: 0,
      losses: 0,
      avgWpm: 0,
      peakWpm: 0,
      accuracy: 0,
      isGuest: false,
      createdAt: new Date().toISOString()
    };
    localStorage.setItem(`keyfury_profile_${userId}`, JSON.stringify(profile));

    return { user: { id: userId, email }, session: { user: { id: userId } } };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password: pass,
    options: {
      data: {
        display_name: finalName
      }
    }
  });

  if (error) throw error;

  if (data.user) {
    localStorage.setItem('keyfury_guest_id', data.user.id);
    localStorage.setItem('keyfury_guest_name', finalName);

    // Save registered user profile locally to guarantee instant login
    const regProfile: UserProfile = {
      id: data.user.id,
      displayName: finalName,
      email,
      avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${finalName}`,
      bio: 'KeyFury Competitive Warrior',
      keycapTheme: 'cyberpunk',
      accentColor: '#00ffcc',
      mmr: 1000,
      rankTier: 'Bronze',
      rankDivision: 'I',
      matchesPlayed: 0,
      wins: 0,
      losses: 0,
      avgWpm: 0,
      peakWpm: 0,
      accuracy: 0,
      isGuest: false,
      createdAt: new Date().toISOString()
    };
    localStorage.setItem(`keyfury_profile_${data.user.id}`, JSON.stringify(regProfile));

    // Save to user accounts list for offline/local fallback login
    const existingAccounts = JSON.parse(localStorage.getItem('keyfury_user_accounts') || '[]');
    if (!existingAccounts.some((a: any) => a.email.toLowerCase() === email.toLowerCase())) {
      existingAccounts.push({ id: data.user.id, email, password: pass, displayName: finalName, createdAt: new Date().toISOString() });
      localStorage.setItem('keyfury_user_accounts', JSON.stringify(existingAccounts));
    }

    try {
      await supabase.from('profiles').upsert([{
        id: data.user.id,
        display_name: finalName,
        mmr: 1000,
        rank_tier: 'Bronze',
        rank_division: 'I'
      }]);
    } catch (_e) {
      // Ignore if table RLS prevents
    }

    // Try instant sign in
    if (!data.session) {
      try {
        const signin = await supabase.auth.signInWithPassword({ email, password: pass });
        if (signin.data?.session) return signin.data;
      } catch (_e) {
        // Fallback below
      }
    }
  }

  return { user: data.user, session: data.session || { user: data.user } };
}

export async function signInWithEmail(email: string, pass: string) {
  if (!supabase) {
    // Local fallback sign in
    const existingAccounts = JSON.parse(localStorage.getItem('keyfury_user_accounts') || '[]');
    const user = existingAccounts.find(
      (a: any) => a.email.toLowerCase() === email.toLowerCase() && a.password === pass
    );

    if (!user) {
      throw new Error('Invalid email or password. Please check your credentials.');
    }

    localStorage.setItem('keyfury_guest_id', user.id);
    localStorage.setItem('keyfury_guest_name', user.displayName);

    return { user: { id: user.id, email: user.email }, session: { user: { id: user.id } } };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: pass
  });

  if (error) throw error;

  if (data.user) {
    const profile = await getUserProfile(data.user.id);
    if (profile) {
      localStorage.setItem('keyfury_guest_id', profile.id);
      localStorage.setItem('keyfury_guest_name', profile.displayName);
    }
  }

  return data;
}

export async function signInWithOAuth(provider: 'github' | 'google' | 'discord') {
  if (!supabase) {
    throw new Error('Supabase client is not initialized.');
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: window.location.origin
    }
  });

  if (error) throw error;
  return data;
}

export async function convertGuestToAccount(email: string, pass: string, displayName?: string) {
  if (!supabase) {
    throw new Error('Supabase client is not configured.');
  }

  const currentGuestId = localStorage.getItem('keyfury_guest_id');
  const currentGuestName = localStorage.getItem('keyfury_guest_name');
  const finalDisplayName = displayName || currentGuestName || email.split('@')[0];

  // Try updating the current user session if already logged in anonymously
  const { data: sessionData } = await supabase.auth.getSession();

  if (sessionData?.session?.user?.is_anonymous) {
    const { data: updateData, error: updateError } = await supabase.auth.updateUser({
      email,
      password: pass,
      data: { display_name: finalDisplayName }
    });

    if (updateError) throw updateError;

    if (updateData.user) {
      await supabase.from('profiles').upsert([{
        id: updateData.user.id,
        display_name: finalDisplayName,
        mmr: 1000,
        rank_tier: 'Bronze',
        rank_division: 'I',
        placement_remaining: 5
      }]);
    }
    return updateData;
  }

  // Otherwise perform standard registration and transfer guest profile ID if applicable
  const signupResult: any = await signUpWithEmail(email, pass, finalDisplayName);
  const targetUser = signupResult?.user || signupResult?.data?.user;

  if (targetUser && currentGuestId && currentGuestId !== targetUser.id) {
    // Re-link match history from old guest ID to new registered user ID
    try {
      await supabase?.from('match_players').update({ profile_id: targetUser.id }).eq('profile_id', currentGuestId);
    } catch (_e) {
      // Ignore if table RLS prevents or legacy ID missing
    }
  }

  return signupResult;
}

export const upgradeGuestSession = convertGuestToAccount;

export async function signOut(): Promise<void> {
  if (supabase) {
    await supabase.auth.signOut();
  }
  localStorage.removeItem('keyfury_guest_id');
  localStorage.removeItem('keyfury_guest_name');
}

export async function getUserProfile(userId?: string): Promise<UserProfile | null> {
  const targetId = userId || localStorage.getItem('keyfury_guest_id');
  if (!targetId) return null;

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', targetId)
        .single();

      if (!error && data) {
        // ponytail: merge localStorage cosmetic & MMR overrides so profile changes appear immediately
        // even if Supabase update was slow or RLS blocked the anonymous write
        const localAvatar = localStorage.getItem('keyfury_avatar');
        const localTheme = localStorage.getItem('keyfury_theme');
        const localName = localStorage.getItem('keyfury_guest_name');
        const savedProfileStr = localStorage.getItem(`keyfury_profile_${targetId}`);
        const gMmrStr = localStorage.getItem('keyfury_guest_mmr');

        let mmr = data.mmr ?? 1000;
        let matchesPlayed = data.matches_played ?? 0;
        let wins = data.wins ?? 0;
        let losses = data.losses ?? 0;

        if (savedProfileStr) {
          try {
            const p = JSON.parse(savedProfileStr);
            if (typeof p.mmr === 'number' && p.mmr > mmr) mmr = p.mmr;
            if (typeof p.matchesPlayed === 'number' && p.matchesPlayed > matchesPlayed) matchesPlayed = p.matchesPlayed;
            if (typeof p.wins === 'number' && p.wins > wins) wins = p.wins;
            if (typeof p.losses === 'number' && p.losses > losses) losses = p.losses;
          } catch (_e) {}
        } else if (gMmrStr) {
          const parsed = parseInt(gMmrStr, 10);
          if (!isNaN(parsed) && parsed > mmr) mmr = parsed;
        }

        return {
          id: data.id,
          displayName: localName || data.display_name || 'Warrior',
          email: data.email || undefined,
          avatarUrl: localAvatar || data.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${data.display_name}`,
          bio: data.bio || '',
          keycapTheme: localTheme || data.keycap_theme || 'cyberpunk',
          accentColor: data.accent_color || '#00ffcc',
          mmr,
          rankTier: getRankTier(mmr),
          rankDivision: data.rank_division || 'I',
          matchesPlayed,
          wins,
          losses,
          placementRemaining: data.placement_remaining ?? 5,
          avgWpm: data.avg_wpm ? Number(data.avg_wpm) : 75,
          peakWpm: data.peak_wpm ? Number(data.peak_wpm) : 110,
          accuracy: data.accuracy ? Number(data.accuracy) : 95.0,
          isGuest: data.is_guest ?? false,
          createdAt: data.created_at
        };
      }
    } catch (_err) {
      // Fallback below
    }
  }

  // Local fallback profile
  const savedProfile = localStorage.getItem(`keyfury_profile_${targetId}`);
  if (savedProfile) {
    try {
      const parsed = JSON.parse(savedProfile);
      if (parsed) return parsed;
    } catch (_e) {}
  }

  const localName = localStorage.getItem('keyfury_guest_name') || 'Swift Falcon';
  const gMmr = parseInt(localStorage.getItem('keyfury_guest_mmr') || '1000', 10) || 1000;
  return {
    id: targetId,
    displayName: localName,
    avatarUrl: localStorage.getItem('keyfury_avatar') || `https://api.dicebear.com/7.x/bottts/svg?seed=${localName}`,
    bio: 'Competitive typing stick-fighter.',
    keycapTheme: localStorage.getItem('keyfury_theme') || 'cyberpunk',
    accentColor: '#00ffcc',
    mmr: gMmr,
    rankTier: getRankTier(gMmr),
    rankDivision: 'I',
    matchesPlayed: 0,
    wins: 0,
    losses: 0,
    placementRemaining: 5,
    avgWpm: 0,
    peakWpm: 0,
    accuracy: 0,
    isGuest: true
  };
}

export async function updateUserProfile(
  arg1: string | Partial<UserProfile>,
  arg2?: Partial<UserProfile>
): Promise<boolean> {
  let userId: string | undefined;
  let updates: Partial<UserProfile>;

  if (typeof arg1 === 'string') {
    userId = arg1;
    updates = arg2 || {};
  } else {
    updates = arg1;
    userId = updates.id || localStorage.getItem('keyfury_guest_id') || undefined;
  }

  if (updates.keycapTheme) {
    localStorage.setItem('keyfury_theme', updates.keycapTheme);
  }
  if (updates.displayName) {
    localStorage.setItem('keyfury_guest_name', updates.displayName);
  }
  if (updates.avatarUrl) {
    localStorage.setItem('keyfury_avatar', updates.avatarUrl);
  }

  // ponytail: always persist merged profile to localStorage cache so getUserProfile fallback works
  if (userId) {
    const saved = localStorage.getItem(`keyfury_profile_${userId}`);
    const parsed = saved ? (() => { try { return JSON.parse(saved); } catch (_e) { return null; } })() : null;
    const merged = { ...(parsed || { id: userId }), ...updates };
    localStorage.setItem(`keyfury_profile_${userId}`, JSON.stringify(merged));
  }

  if (!userId || !supabase) return true;

  try {
    const payload: any = {};
    if (updates.displayName !== undefined) payload.display_name = updates.displayName;
    if (updates.avatarUrl !== undefined) payload.avatar_url = updates.avatarUrl;
    if (updates.bio !== undefined) payload.bio = updates.bio;
    if (updates.keycapTheme !== undefined) payload.keycap_theme = updates.keycapTheme;
    if (updates.accentColor !== undefined) payload.accent_color = updates.accentColor;
    if (updates.mmr !== undefined) payload.mmr = updates.mmr;
    if (updates.rankTier !== undefined) payload.rank_tier = updates.rankTier;
    if (updates.rankDivision !== undefined) payload.rank_division = updates.rankDivision;
    if (updates.matchesPlayed !== undefined) payload.matches_played = updates.matchesPlayed;
    if (updates.wins !== undefined) payload.wins = updates.wins;
    if (updates.losses !== undefined) payload.losses = updates.losses;
    if (updates.placementRemaining !== undefined) payload.placement_remaining = updates.placementRemaining;

    const { error } = await supabase.from('profiles').update(payload).eq('id', userId);
    return !error;
  } catch (_err) {
    return false;
  }
}

export async function getLeaderboard(limit = 100, offset = 0): Promise<UserProfile[]> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('mmr', { ascending: false })
        .range(offset, offset + limit - 1);

      if (!error && data && data.length > 0) {
        return data.map((row) => ({
          id: row.id,
          displayName: row.display_name || 'Anonymous Warrior',
          avatarUrl: row.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${row.display_name}`,
          bio: row.bio || '',
          keycapTheme: row.keycap_theme || 'cyberpunk',
          accentColor: row.accent_color || '#00ffcc',
          mmr: row.mmr ?? 1000,
          rankTier: (row.rank_tier as RankTier) || getRankTier(row.mmr ?? 1000),
          rankDivision: row.rank_division || 'I',
          matchesPlayed: row.matches_played ?? 0,
          wins: row.wins ?? 0,
          losses: row.losses ?? 0,
          placementRemaining: row.placement_remaining ?? 5,
          avgWpm: row.avg_wpm ? Number(row.avg_wpm) : 0,
          peakWpm: row.peak_wpm ? Number(row.peak_wpm) : 0,
          accuracy: row.accuracy ? Number(row.accuracy) : 0,
          isGuest: false
        }));
      }
    } catch (_err) {
      // Fallback below
    }
  }

  // Real user accounts leaderboard (from user signups)
  const localAccounts = JSON.parse(localStorage.getItem('keyfury_user_accounts') || '[]');
  const profiles: UserProfile[] = [];

  for (const acc of localAccounts) {
    const saved = localStorage.getItem(`keyfury_profile_${acc.id}`);
    if (saved) {
      try {
        profiles.push(JSON.parse(saved));
      } catch (_e) {}
    } else {
      profiles.push({
        id: acc.id,
        displayName: acc.displayName,
        email: acc.email,
        avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${acc.displayName}`,
        bio: 'KeyFury Competitive Warrior',
        keycapTheme: 'cyberpunk',
        accentColor: '#00ffcc',
        mmr: 1000,
        rankTier: 'Bronze',
        rankDivision: 'I',
        matchesPlayed: 0,
        wins: 0,
        losses: 0,
        avgWpm: 0,
        peakWpm: 0,
        accuracy: 0,
        isGuest: false
      });
    }
  }

  // Include current active profile if available
  const currentId = localStorage.getItem('keyfury_guest_id');
  if (currentId && !profiles.some((p) => p.id === currentId)) {
    const p = await getUserProfile(currentId);
    if (p) profiles.push(p);
  }

  profiles.sort((a, b) => b.mmr - a.mmr);
  return profiles.slice(offset, offset + limit);
}

export const getGlobalLeaderboard = (limit = 100) => getLeaderboard(limit, 0);

export async function getMatchHistory(userId: string, limit = 10): Promise<MatchHistoryItem[]> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('match_players')
        .select('match_id, result, final_health, accepted_wpm, accuracy, highest_combo, words_completed, joined_at')
        .eq('profile_id', userId)
        .order('joined_at', { ascending: false })
        .limit(limit);

      if (!error && data && data.length > 0) {
        return data.map((d: any) => ({
          match_id: d.match_id,
          result: d.result,
          final_health: d.final_health,
          accepted_wpm: Number(d.accepted_wpm),
          accuracy: Number(d.accuracy),
          highest_combo: d.highest_combo,
          words_completed: d.words_completed,
          joined_at: d.joined_at,
          opponent_name: 'Opponent Warrior',
          mode: '1v1 Duel'
        }));
      }
    } catch (_err) {
      // Fall through
    }
  }

  const localHistory: MatchHistoryItem[] = JSON.parse(localStorage.getItem(`keyfury_history_${userId}`) || '[]');
  // ponytail: filter out any existing duplicate records from previous runs
  const uniqueHistory = localHistory.filter((item, index, self) =>
    index === self.findIndex((t) => (
      t.match_id === item.match_id ||
      (t.result === item.result &&
       t.accepted_wpm === item.accepted_wpm &&
       Math.abs(new Date(t.joined_at).getTime() - new Date(item.joined_at).getTime()) < 5000)
    ))
  );
  return uniqueHistory.slice(0, limit);
}

export const getRecentGuestMatches = getMatchHistory;

export async function getUserAchievements(userId: string): Promise<UserAchievement[]> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('user_achievements')
        .select('*')
        .eq('profile_id', userId);

      if (!error && data) {
        return data.map((d: any) => ({
          achievementId: d.achievement_id,
          progress: d.progress,
          unlocked: d.unlocked,
          unlockedAt: d.unlocked_at
        }));
      }
    } catch (_e) {
      // Fallback below
    }
  }

  const localAchievements = JSON.parse(localStorage.getItem(`keyfury_achievements_${userId}`) || '[]');
  return localAchievements;
}

export async function saveMatchStats(
  userId: string,
  stats: {
    result: 'WIN' | 'LOSS' | 'DRAW';
    wpm: number;
    accuracy: number;
    maxCombo: number;
    finalHealth: number;
    wordsCompleted: number;
    opponentName?: string;
    mode?: string;
    mmrDelta?: number;
    finalMmr?: number;
  }
): Promise<{ newAchievements: Achievement[] }> {
  // 1. Save match item to user local/remote history
  const matchItem: MatchHistoryItem = {
    match_id: `m_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    result: stats.result,
    final_health: stats.finalHealth,
    accepted_wpm: stats.wpm,
    accuracy: stats.accuracy,
    highest_combo: stats.maxCombo,
    words_completed: stats.wordsCompleted,
    joined_at: new Date().toISOString(),
    opponent_name: stats.opponentName || 'Opponent Warrior',
    mode: stats.mode || 'Ranked 1v1',
    mmr_delta: stats.mmrDelta || (stats.result === 'WIN' ? 25 : -15)
  };

  const currentHistory: MatchHistoryItem[] = JSON.parse(localStorage.getItem(`keyfury_history_${userId}`) || '[]');
  
  // ponytail: deduplicate if identical match was recorded within 5 seconds
  if (currentHistory.length > 0) {
    const last = currentHistory[0];
    const timeDiff = Math.abs(Date.now() - new Date(last.joined_at).getTime());
    if (timeDiff < 5000 && last.result === stats.result && last.accepted_wpm === stats.wpm && last.accuracy === stats.accuracy) {
      return { newAchievements: [] };
    }
  }

  currentHistory.unshift(matchItem);
  localStorage.setItem(`keyfury_history_${userId}`, JSON.stringify(currentHistory.slice(0, 50)));

  // Persist to Supabase database match_players table if available
  if (supabase) {
    try {
      await supabase.from('match_players').insert([{
        profile_id: userId,
        match_id: matchItem.match_id,
        result: matchItem.result,
        final_health: matchItem.final_health,
        accepted_wpm: matchItem.accepted_wpm,
        accuracy: matchItem.accuracy,
        highest_combo: matchItem.highest_combo,
        words_completed: matchItem.words_completed,
        joined_at: matchItem.joined_at,
        opponent_name: matchItem.opponent_name
      }]);
    } catch (_e) {
      // Ignore if table/RLS not configured
    }
  }

  // Update profile metrics locally & remotely for all accounts
  const currentProfile = await getUserProfile(userId);
  if (currentProfile) {
    const updatedMatches = (currentProfile.matchesPlayed || 0) + 1;
    const updatedWins = (currentProfile.wins || 0) + (stats.result === 'WIN' ? 1 : 0);
    const updatedLosses = (currentProfile.losses || 0) + (stats.result === 'LOSS' ? 1 : 0);
    const updatedPeak = Math.max(currentProfile.peakWpm || 0, stats.wpm);
    const updatedAvg = Math.round(
      ((currentProfile.avgWpm || 0) * (updatedMatches - 1) + stats.wpm) / updatedMatches
    );
    const updatedAcc = Number(
      (((currentProfile.accuracy || 95) * (updatedMatches - 1) + stats.accuracy) / updatedMatches).toFixed(1)
    );
    const newMmr = stats.finalMmr !== undefined
      ? Math.max(0, stats.finalMmr)
      : Math.max(0, (currentProfile.mmr || 1000) + (stats.mmrDelta || (stats.result === 'WIN' ? 25 : -15)));
    const newTier = getRankTier(newMmr);

    const updatedProfile: UserProfile = {
      ...currentProfile,
      matchesPlayed: updatedMatches,
      wins: updatedWins,
      losses: updatedLosses,
      peakWpm: updatedPeak,
      avgWpm: updatedAvg,
      accuracy: updatedAcc,
      mmr: newMmr,
      rankTier: newTier
    };
    localStorage.setItem(`keyfury_profile_${userId}`, JSON.stringify(updatedProfile));
    localStorage.setItem('keyfury_guest_mmr', String(newMmr));
    try {
      await updateUserProfile(updatedProfile);
    } catch (_e) {
      // Fallback to local storage persistence
    }
  }

  // 2. Evaluate Achievements
  const currentAchievements: UserAchievement[] = await getUserAchievements(userId);
  const newlyUnlocked: Achievement[] = [];

  const updatedAchievements: UserAchievement[] = DEFAULT_ACHIEVEMENTS.map((ach) => {
    const existing = currentAchievements.find((a) => a.achievementId === ach.id);
    let progress = existing ? existing.progress : 0;
    let unlocked = existing ? existing.unlocked : false;

    if (!unlocked) {
      const userMmr = currentProfile?.mmr || 1000;

      // Speed milestones
      if (ach.id === 'warmup' && stats.wpm >= 40) { progress = 1; unlocked = true; }
      else if (ach.id === 'speed_demon' && stats.wpm >= 80) { progress = 1; unlocked = true; }
      else if (ach.id === 'century_club' && stats.wpm >= 100) { progress = 1; unlocked = true; }
      else if (ach.id === 'hyper_typist' && stats.wpm >= 130) { progress = 1; unlocked = true; }
      else if (ach.id === 'lightning_strike' && stats.wpm >= 150) { progress = 1; unlocked = true; }

      // Accuracy & Skill
      else if (ach.id === 'steady_fingers' && stats.accuracy >= 90) { progress = 1; unlocked = true; }
      else if (ach.id === 'sharpshooter' && stats.accuracy >= 98) { progress = 1; unlocked = true; }
      else if (ach.id === 'perfectionist' && stats.accuracy >= 100 && stats.result === 'WIN') { progress = 1; unlocked = true; }

      // Combo streaks
      else if (ach.id === 'combo_starter' && stats.maxCombo >= 5) { progress = 1; unlocked = true; }
      else if (ach.id === 'combo_master' && stats.maxCombo >= 20) { progress = 1; unlocked = true; }
      else if (ach.id === 'unbreakable' && stats.maxCombo >= 50) { progress = 1; unlocked = true; }

      // Combat & Health
      else if (ach.id === 'first_blood') { progress = 1; unlocked = true; }
      else if (ach.id === 'first_victory' && stats.result === 'WIN') { progress = 1; unlocked = true; }
      else if (ach.id === 'clean_fight' && stats.result === 'WIN' && stats.finalHealth >= 90) { progress = 1; unlocked = true; }
      else if (ach.id === 'comeback_kid' && stats.result === 'WIN' && stats.finalHealth <= 25 && stats.finalHealth > 0) { progress = 1; unlocked = true; }
      else if (ach.id === 'bot_slayer' && stats.result === 'WIN' && stats.opponentName?.toLowerCase().includes('bot')) { progress = 1; unlocked = true; }
      else if (ach.id === 'bot_master' && stats.result === 'WIN' && (stats.opponentName?.toLowerCase().includes('pro') || stats.opponentName?.toLowerCase().includes('adaptive'))) { progress = 1; unlocked = true; }

      // Cumulative Match Wins & Words
      else if (ach.id === 'veteran_warrior') {
        progress = Math.min(10, (existing?.progress || 0) + (stats.result === 'WIN' ? 1 : 0));
        if (progress >= 10) unlocked = true;
      }
      else if (ach.id === 'keyboard_god') {
        progress = Math.min(25, (existing?.progress || 0) + (stats.result === 'WIN' ? 1 : 0));
        if (progress >= 25) unlocked = true;
      }
      else if (ach.id === 'legendary_warrior') {
        progress = Math.min(100, (existing?.progress || 0) + (stats.result === 'WIN' ? 1 : 0));
        if (progress >= 100) unlocked = true;
      }
      else if (ach.id === 'marathon_runner') {
        progress = Math.min(500, (existing?.progress || 0) + (stats.wordsCompleted || 0));
        if (progress >= 500) unlocked = true;
      }
      else if (ach.id === 'wordsmith_master') {
        progress = Math.min(2500, (existing?.progress || 0) + (stats.wordsCompleted || 0));
        if (progress >= 2500) unlocked = true;
      }

      // Competitive Rank Tiers & MMR
      else if (ach.id === 'silver_warrior' && userMmr >= 1200) { progress = 1; unlocked = true; }
      else if (ach.id === 'gold_champion' && userMmr >= 1600) { progress = 1; unlocked = true; }
      else if (ach.id === 'platinum_elite' && userMmr >= 2000) { progress = 1; unlocked = true; }
      else if (ach.id === 'diamond_ascendant' && userMmr >= 2400) { progress = 1; unlocked = true; }
      else if (ach.id === 'master_realm' && userMmr >= 2800) { progress = 1; unlocked = true; }
      else if (ach.id === 'grandmaster_god' && userMmr >= 3200) { progress = 1; unlocked = true; }

      if (unlocked && (!existing || !existing.unlocked)) {
        newlyUnlocked.push(ach);
      }
    }

    return {
      achievementId: ach.id,
      progress,
      unlocked,
      unlockedAt: unlocked ? (existing?.unlockedAt || new Date().toISOString()) : undefined
    };
  });

  localStorage.setItem(`keyfury_achievements_${userId}`, JSON.stringify(updatedAchievements));

  if (supabase) {
    try {
      for (const ua of updatedAchievements) {
        await supabase.from('user_achievements').upsert([{
          profile_id: userId,
          achievement_id: ua.achievementId,
          progress: ua.progress,
          unlocked: ua.unlocked,
          unlocked_at: ua.unlockedAt
        }]);
      }
    } catch (_e) {
      // Ignore
    }
  }

  return { newAchievements: newlyUnlocked };
}


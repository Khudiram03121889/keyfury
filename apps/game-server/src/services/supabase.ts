import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export let supabaseServer: SupabaseClient | null = null;

if (supabaseUrl && supabaseKey) {
  supabaseServer = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

export interface MatchPersistencePayload {
  match: {
    id: string;
    rules_version: string;
    deck_seed: string;
    status: 'completed' | 'forfeit';
    started_at: string;
    ended_at: string;
    winner_profile_id?: string;
    end_reason: 'time' | 'knockout' | 'forfeit' | 'disconnect' | 'draw';
    integrity_status: 'normal' | 'flagged' | 'forfeit';
  };
  players: Array<{
    profile_id: string;
    side: 'left' | 'right';
    joined_at: string;
    left_at?: string;
    final_health: number;
    accepted_wpm: number;
    accuracy: number;
    highest_combo: number;
    words_completed: number;
    result: 'win' | 'loss' | 'draw';
    mmr_delta?: number;
    new_mmr?: number;
  }>;
  events?: {
    event_version: string;
    event_data: any;
  };
}

export async function updatePlayerProfileMmr(profileId: string, mmrDelta: number, newMmr: number, isWin: boolean): Promise<boolean> {
  if (!supabaseServer) {
    return false;
  }
  try {
    const { data: profile } = await supabaseServer
      .from('profiles')
      .select('matches_played, wins, losses')
      .eq('id', profileId)
      .single();

    const matchesPlayed = (profile?.matches_played || 0) + 1;
    const wins = (profile?.wins || 0) + (isWin ? 1 : 0);
    const losses = (profile?.losses || 0) + (isWin ? 0 : 1);

    const { error } = await supabaseServer
      .from('profiles')
      .update({
        mmr: newMmr,
        matches_played: matchesPlayed,
        wins: wins,
        losses: losses,
        last_seen_at: new Date().toISOString()
      })
      .eq('id', profileId);

    if (error) {
      console.error(`[SupabaseServer] Failed updating MMR for profile ${profileId}:`, error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error(`[SupabaseServer] Exception updating MMR for profile ${profileId}:`, err);
    return false;
  }
}


export async function persistMatchResult(payload: MatchPersistencePayload): Promise<boolean> {
  if (!supabaseServer) {
    console.warn('[SupabaseServer] Skipping persistence: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing.');
    return false;
  }

  const attemptPersist = async (): Promise<boolean> => {
    try {
      const { error } = await supabaseServer!.rpc('save_match_result', {
        p_match: payload.match,
        p_players: payload.players,
        p_events: payload.events || null
      });

      if (error) {
        console.error('[SupabaseServer] Failed to save match result:', error.message);
        return false;
      }

      console.log('[SupabaseServer] Match persisted successfully:', payload.match.id);
      return true;
    } catch (err) {
      console.error('[SupabaseServer] Exception persisting match result:', err);
      return false;
    }
  };

  // Attempt 1
  let success = await attemptPersist();
  if (!success) {
    console.warn('[SupabaseServer] Persistence attempt 1 failed. Retrying in 500ms...');
    await new Promise((res) => setTimeout(res, 500));
    success = await attemptPersist();
    if (!success) {
      console.error('[SupabaseServer] Persistence attempt 2 failed. Match result retained in room memory only.');
    }
  }

  return success;
}

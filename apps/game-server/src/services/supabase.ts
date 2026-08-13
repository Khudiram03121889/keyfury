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

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUuid(id: string | undefined | null): boolean {
  if (!id) return false;
  return UUID_REGEX.test(id);
}

export async function updatePlayerProfileMmr(profileId: string, mmrDelta: number, newMmr: number, isWin: boolean): Promise<boolean> {
  if (!supabaseServer || !isValidUuid(profileId)) {
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

  const sanitizedMatch = {
    ...payload.match,
    winner_profile_id: isValidUuid(payload.match.winner_profile_id) ? payload.match.winner_profile_id : undefined
  };

  const sanitizedPlayers = payload.players.filter((p) => isValidUuid(p.profile_id));

  if (sanitizedPlayers.length === 0) {
    console.log('[SupabaseServer] Skipping RPC match result save: guest/bot match with no registered UUID profiles.');
    return true;
  }

  const attemptPersist = async (): Promise<boolean> => {
    try {
      const { error } = await supabaseServer!.rpc('save_match_result', {
        p_match: sanitizedMatch,
        p_players: sanitizedPlayers,
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
      console.error('[SupabaseServer] Persistence attempt 2 failed. Queueing for background retry...');
      if (failedMatchQueue.length < 100) {
        failedMatchQueue.push(payload);
      }
    }
  }

  return success;
}

const failedMatchQueue: MatchPersistencePayload[] = [];
let isFlushingQueue = false;

async function flushFailedMatchQueue() {
  if (isFlushingQueue || failedMatchQueue.length === 0 || !supabaseServer) return;
  isFlushingQueue = true;
  try {
    const pending = [...failedMatchQueue];
    failedMatchQueue.length = 0;
    for (const payload of pending) {
      const { error } = await supabaseServer.rpc('save_match_result', {
        p_match: {
          ...payload.match,
          winner_profile_id: isValidUuid(payload.match.winner_profile_id) ? payload.match.winner_profile_id : undefined
        },
        p_players: payload.players.filter((p) => isValidUuid(p.profile_id)),
        p_events: payload.events || null
      });

      if (error) {
        console.error('[SupabaseServer] Background flush failed for match:', payload.match.id, error.message);
        if (failedMatchQueue.length < 100) {
          failedMatchQueue.push(payload);
        }
      } else {
        console.log('[SupabaseServer] Background flush succeeded for match:', payload.match.id);
      }
    }
  } catch (err) {
    console.error('[SupabaseServer] Exception in flushFailedMatchQueue:', err);
  } finally {
    isFlushingQueue = false;
  }
}

if (typeof setInterval !== 'undefined') {
  const timer = setInterval(flushFailedMatchQueue, 30000);
  if (timer && typeof timer === 'object' && 'unref' in timer) {
    (timer as any).unref();
  }
}

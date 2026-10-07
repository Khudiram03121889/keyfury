import { supabase, UserProfile } from './supabase';
import { getRankTier } from '../components/ranked/RankBadge';
import { soundManager } from '../audio/SoundManager';

export interface FriendItem {
  friendshipId: string;
  id: string; // friend's profile id
  displayName: string;
  avatarUrl?: string;
  mmr: number;
  rankTier: string;
  isOnline: boolean;
  status: 'online' | 'in_match' | 'offline';
  lastSeenAt?: string;
}

export interface FriendRequestItem {
  friendshipId: string;
  id: string; // other player's profile id
  displayName: string;
  avatarUrl?: string;
  mmr?: number;
  rankTier?: string;
  direction: 'incoming' | 'outgoing';
  createdAt: string;
}

export interface ChallengeInvite {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  receiverId: string;
  roomCode: string;
  arenaId: string;
  characterId: string;
  matchDuration: number;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  createdAt: string;
  expiresAt: string;
}

// ---------------------------------------------------------------------------
// Browser Notifications API Helper
// ---------------------------------------------------------------------------

function getNotificationClass(): any {
  if (typeof window !== 'undefined' && 'Notification' in window) {
    return (window as any).Notification;
  }
  if (typeof globalThis !== 'undefined' && 'Notification' in globalThis) {
    return (globalThis as any).Notification;
  }
  return null;
}

export function getNotificationPermissionStatus(): NotificationPermission | 'unsupported' {
  const Notif = getNotificationClass();
  if (!Notif) {
    return 'unsupported';
  }
  return Notif.permission || 'default';
}

export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  const Notif = getNotificationClass();
  if (!Notif || typeof Notif.requestPermission !== 'function') {
    return 'unsupported';
  }
  try {
    const permission = await Notif.requestPermission();
    return permission;
  } catch (err) {
    console.warn('[Notifications] Failed to request permission:', err);
    return Notif.permission || 'default';
  }
}

export function sendBrowserNotification(
  title: string,
  options?: NotificationOptions,
  onClick?: () => void
): Notification | null {
  const Notif = getNotificationClass();
  if (!Notif || Notif.permission !== 'granted') {
    return null;
  }

  try {
    const notification = new Notif(title, {
      icon: '/logo.jpg',
      badge: '/logo.jpg',
      requireInteraction: true,
      ...options
    });

    if (onClick) {
      notification.onclick = () => {
        if (typeof window !== 'undefined' && typeof window.focus === 'function') {
          window.focus();
        }
        onClick();
        if (typeof notification.close === 'function') {
          notification.close();
        }
      };
    }
    return notification;
  } catch (err) {
    console.warn('[Notifications] Error triggering browser notification:', err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Realtime Presence & Online Status
// ---------------------------------------------------------------------------

export function subscribeToLobbyPresence(
  currentUserId: string,
  currentDisplayName: string,
  onPresenceUpdate: (onlineUserIds: Set<string>) => void
): () => void {
  if (!supabase) return () => {};

  const presenceChannel = supabase.channel('keyfury_lobby_presence', {
    config: {
      presence: {
        key: currentUserId
      }
    }
  });

  const notifyChange = () => {
    const state = presenceChannel.presenceState();
    const onlineIds = new Set<string>();
    Object.keys(state).forEach((key) => {
      onlineIds.add(key);
      const items = state[key] as any[];
      if (Array.isArray(items)) {
        items.forEach((item) => {
          if (item?.userId) onlineIds.add(item.userId);
        });
      }
    });
    onPresenceUpdate(onlineIds);
  };

  presenceChannel
    .on('presence', { event: 'sync' }, notifyChange)
    .on('presence', { event: 'join' }, notifyChange)
    .on('presence', { event: 'leave' }, notifyChange)
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        try {
          await presenceChannel.track({
            userId: currentUserId,
            displayName: currentDisplayName,
            joinedAt: Date.now()
          });
        } catch (_e) {}
      }
    });

  return () => {
    try {
      presenceChannel.untrack();
      if (supabase) {
        supabase.removeChannel(presenceChannel);
      }
    } catch (_e) {}
  };
}

// ---------------------------------------------------------------------------
// Friend Queries & Mutations
// ---------------------------------------------------------------------------

export async function fetchFriendsList(currentUserId: string, onlineUserIds?: Set<string>): Promise<FriendItem[]> {
  if (!supabase) return [];

  try {
    // Select accepted friendships where current user is user_id or friend_id
    const { data: friendships, error } = await supabase
      .from('friendships')
      .select('id, user_id, friend_id, status, created_at')
      .or(`user_id.eq.${currentUserId},friend_id.eq.${currentUserId}`)
      .eq('status', 'accepted');

    if (error || !friendships) {
      console.warn('[Friends] Error fetching friendships:', error);
      return [];
    }

    const otherUserMap: Record<string, string> = {};
    const otherUserIds: string[] = [];

    friendships.forEach((f: any) => {
      const otherId = f.user_id === currentUserId ? f.friend_id : f.user_id;
      if (otherId && !otherUserMap[otherId]) {
        otherUserMap[otherId] = f.id;
        otherUserIds.push(otherId);
      }
    });

    if (otherUserIds.length === 0) return [];

    // Fetch profile details for all friends
    const { data: profiles, error: pError } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url, mmr, rank_tier, last_seen_at')
      .in('id', otherUserIds);

    if (pError || !profiles) {
      console.warn('[Friends] Error fetching friend profiles:', pError);
      return [];
    }

    const now = Date.now();
    return profiles.map((p: any) => {
      const lastSeen = p.last_seen_at ? new Date(p.last_seen_at).getTime() : 0;
      // Considered online if presence tracker contains user OR last seen within 90 seconds
      const isPresenceOnline = onlineUserIds ? onlineUserIds.has(p.id) : false;
      const isRecentOnline = now - lastSeen < 90000;
      const isOnline = isPresenceOnline || isRecentOnline;

      return {
        friendshipId: otherUserMap[p.id],
        id: p.id,
        displayName: p.display_name || 'Warrior',
        avatarUrl: p.avatar_url,
        mmr: p.mmr ?? 1000,
        rankTier: p.rank_tier || getRankTier(p.mmr ?? 1000),
        isOnline,
        status: isOnline ? 'online' : 'offline',
        lastSeenAt: p.last_seen_at
      };
    });
  } catch (err) {
    console.warn('[Friends] Exception in fetchFriendsList:', err);
    return [];
  }
}

export async function fetchFriendRequests(currentUserId: string): Promise<FriendRequestItem[]> {
  if (!supabase) return [];

  try {
    const { data: requests, error } = await supabase
      .from('friendships')
      .select('id, user_id, friend_id, status, created_at')
      .or(`user_id.eq.${currentUserId},friend_id.eq.${currentUserId}`)
      .eq('status', 'pending');

    if (error || !requests) return [];

    const neededUserIds: string[] = [];
    requests.forEach((r: any) => {
      const otherId = r.user_id === currentUserId ? r.friend_id : r.user_id;
      if (otherId && !neededUserIds.includes(otherId)) {
        neededUserIds.push(otherId);
      }
    });

    if (neededUserIds.length === 0) return [];

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url, mmr, rank_tier')
      .in('id', neededUserIds);

    const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

    return requests.map((r: any) => {
      const isIncoming = r.friend_id === currentUserId;
      const otherId = isIncoming ? r.user_id : r.friend_id;
      const p = profileMap.get(otherId);

      return {
        friendshipId: r.id,
        id: otherId,
        displayName: p?.display_name || 'Warrior',
        avatarUrl: p?.avatar_url,
        mmr: p?.mmr ?? 1000,
        rankTier: p?.rank_tier || getRankTier(p?.mmr ?? 1000),
        direction: isIncoming ? 'incoming' : 'outgoing',
        createdAt: r.created_at
      };
    });
  } catch (err) {
    console.warn('[Friends] Exception in fetchFriendRequests:', err);
    return [];
  }
}

export async function sendFriendRequest(
  currentUserId: string,
  targetIdOrQuery: string
): Promise<{ success: boolean; message: string }> {
  if (!supabase) return { success: false, message: 'Supabase client not connected.' };

  const query = targetIdOrQuery.trim();
  if (!query) {
    return { success: false, message: 'Please enter a valid Player ID or name.' };
  }

  if (query.toLowerCase() === currentUserId.toLowerCase()) {
    return { success: false, message: 'You cannot add yourself as a friend.' };
  }

  try {
    // 1. Look up target player in profiles
    let targetProfile: any = null;

    // Check if query is exact UUID
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(query);

    if (isUuid) {
      const { data } = await supabase.from('profiles').select('id, display_name').eq('id', query).maybeSingle();
      targetProfile = data;
    } else {
      // Lookup by display_name or ID prefix
      const { data } = await supabase
        .from('profiles')
        .select('id, display_name')
        .ilike('display_name', query)
        .limit(1);

      if (data && data.length > 0) {
        targetProfile = data[0];
      } else {
        // Try searching if query is starting substring of an id
        const { data: prefixData } = await supabase
          .from('profiles')
          .select('id, display_name')
          .ilike('id', `${query}%`)
          .limit(1);
        if (prefixData && prefixData.length > 0) {
          targetProfile = prefixData[0];
        }
      }
    }

    if (!targetProfile) {
      return { success: false, message: `Warrior "${query}" not found. Check the ID and try again.` };
    }

    if (targetProfile.id === currentUserId) {
      return { success: false, message: 'You cannot add yourself as a friend.' };
    }

    // 2. Check existing relationship
    const { data: existing } = await supabase
      .from('friendships')
      .select('id, status, user_id, friend_id')
      .or(
        `and(user_id.eq.${currentUserId},friend_id.eq.${targetProfile.id}),and(user_id.eq.${targetProfile.id},friend_id.eq.${currentUserId})`
      );

    if (existing && existing.length > 0) {
      const rel = existing[0];
      if (rel.status === 'accepted') {
        return { success: false, message: `You are already friends with ${targetProfile.display_name}!` };
      }
      if (rel.status === 'pending') {
        if (rel.user_id === currentUserId) {
          return { success: false, message: `Friend request to ${targetProfile.display_name} is already pending.` };
        } else {
          // Other player already sent us a request! Auto-accept it!
          await acceptFriendRequest(rel.id);
          return { success: true, message: `${targetProfile.display_name} already sent you a request! You are now friends!` };
        }
      }
    }

    // 3. Insert friendship request
    const { error: insErr } = await supabase.from('friendships').insert([
      {
        user_id: currentUserId,
        friend_id: targetProfile.id,
        status: 'pending'
      }
    ]);

    if (insErr) {
      console.warn('[Friends] Error inserting friend request:', insErr);
      return { success: false, message: 'Could not send friend request. Please try again.' };
    }

    return { success: true, message: `Friend request sent to ${targetProfile.display_name}!` };
  } catch (err: any) {
    console.warn('[Friends] Exception in sendFriendRequest:', err);
    return { success: false, message: err?.message || 'Failed to send request.' };
  }
}

export async function acceptFriendRequest(friendshipId: string): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from('friendships')
      .update({ status: 'accepted', updated_at: new Date().toISOString() })
      .eq('id', friendshipId);
    return !error;
  } catch (_e) {
    return false;
  }
}

export async function declineOrCancelFriendRequest(friendshipId: string): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('friendships').delete().eq('id', friendshipId);
    return !error;
  } catch (_e) {
    return false;
  }
}

export async function removeFriend(friendshipId: string): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('friendships').delete().eq('id', friendshipId);
    return !error;
  } catch (_e) {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Challenge Invites
// ---------------------------------------------------------------------------

export async function sendChallengeInvite(params: {
  senderId: string;
  senderName: string;
  receiverId: string;
  roomCode: string;
  arenaId?: string;
  characterId?: string;
  matchDuration?: number;
}): Promise<{ success: boolean; inviteId?: string; message?: string }> {
  if (!supabase) return { success: false, message: 'Supabase client unavailable' };

  try {
    const { data, error } = await supabase
      .from('challenge_invites')
      .insert([
        {
          sender_id: params.senderId,
          receiver_id: params.receiverId,
          room_code: params.roomCode,
          arena_id: params.arenaId || 'cyber_rooftop',
          character_id: params.characterId || 'shadow_ronin',
          match_duration: params.matchDuration || 60,
          status: 'pending',
          expires_at: new Date(Date.now() + 60000).toISOString() // 60s invite window
        }
      ])
      .select('id')
      .single();

    if (error) {
      console.warn('[Challenge] Error sending challenge invite:', error);
      return { success: false, message: error.message };
    }

    return { success: true, inviteId: data?.id };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Failed to send invite' };
  }
}

export async function respondToChallengeInvite(
  inviteId: string,
  response: 'accepted' | 'declined'
): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from('challenge_invites')
      .update({ status: response })
      .eq('id', inviteId);
    return !error;
  } catch (_e) {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Realtime Subscriptions
// ---------------------------------------------------------------------------

export function subscribeToIncomingChallenges(
  currentUserId: string,
  onInviteReceived: (invite: ChallengeInvite) => void
): () => void {
  if (!supabase) return () => {};

  // 1. Realtime postgres_changes subscription
  const channel = supabase
    .channel(`user_invites_${currentUserId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'challenge_invites',
        filter: `receiver_id=eq.${currentUserId}`
      },
      async (payload) => {
        const row = payload.new;
        if (!row || row.status !== 'pending') return;

        // Fetch sender display name
        let senderName = 'A Friend';
        let senderAvatar = undefined;
        try {
          const { data: p } = await supabase!
            .from('profiles')
            .select('display_name, avatar_url')
            .eq('id', row.sender_id)
            .maybeSingle();
          if (p) {
            senderName = p.display_name;
            senderAvatar = p.avatar_url;
          }
        } catch (_e) {}

        const invite: ChallengeInvite = {
          id: row.id,
          senderId: row.sender_id,
          senderName,
          senderAvatar,
          receiverId: row.receiver_id,
          roomCode: row.room_code,
          arenaId: row.arena_id,
          characterId: row.character_id,
          matchDuration: row.match_duration,
          status: row.status,
          createdAt: row.created_at,
          expiresAt: row.expires_at
        };

        onInviteReceived(invite);
      }
    )
    .subscribe();

  // 2. Fallback polling every 4 seconds to guarantee delivery across network drops
  const seenInviteIds = new Set<string>();
  const pollInterval = setInterval(async () => {
    try {
      const nowIso = new Date().toISOString();
      const { data: recentInvites } = await supabase!
        .from('challenge_invites')
        .select('id, sender_id, receiver_id, room_code, arena_id, character_id, match_duration, status, created_at, expires_at')
        .eq('receiver_id', currentUserId)
        .eq('status', 'pending')
        .gt('expires_at', nowIso)
        .order('created_at', { ascending: false })
        .limit(1);

      if (recentInvites && recentInvites.length > 0) {
        const row = recentInvites[0];
        if (!seenInviteIds.has(row.id)) {
          seenInviteIds.add(row.id);

          let senderName = 'A Friend';
          let senderAvatar = undefined;
          const { data: p } = await supabase!
            .from('profiles')
            .select('display_name, avatar_url')
            .eq('id', row.sender_id)
            .maybeSingle();
          if (p) {
            senderName = p.display_name;
            senderAvatar = p.avatar_url;
          }

          onInviteReceived({
            id: row.id,
            senderId: row.sender_id,
            senderName,
            senderAvatar,
            receiverId: row.receiver_id,
            roomCode: row.room_code,
            arenaId: row.arena_id,
            characterId: row.character_id,
            matchDuration: row.match_duration,
            status: row.status,
            createdAt: row.created_at,
            expiresAt: row.expires_at
          });
        }
      }
    } catch (_err) {}
  }, 4000);

  return () => {
    clearInterval(pollInterval);
    try {
      if (supabase) {
        supabase.removeChannel(channel);
      }
    } catch (_e) {}
  };
}

export function subscribeToFriendshipUpdates(
  currentUserId: string,
  onUpdate: () => void
): () => void {
  if (!supabase) return () => {};

  const channel = supabase
    .channel(`user_friendships_${currentUserId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'friendships',
        filter: `user_id=eq.${currentUserId}`
      },
      () => onUpdate()
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'friendships',
        filter: `friend_id=eq.${currentUserId}`
      },
      () => onUpdate()
    )
    .subscribe();

  return () => {
    try {
      if (supabase) {
        supabase.removeChannel(channel);
      }
    } catch (_e) {}
  };
}

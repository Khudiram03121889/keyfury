import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Copy,
  Check,
  Bell,
  BellOff,
  BellRing,
  Swords,
  Trash2,
  Clock,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Send,
  UserCheck
} from 'lucide-react';
import {
  FriendItem,
  FriendRequestItem,
  fetchFriendsList,
  fetchFriendRequests,
  sendFriendRequest,
  acceptFriendRequest,
  declineOrCancelFriendRequest,
  removeFriend,
  getNotificationPermissionStatus,
  requestNotificationPermission,
  subscribeToFriendshipUpdates
} from '../../lib/friends';
import { RankBadge } from '../ranked/RankBadge';
import { soundManager } from '../../audio/SoundManager';

interface FriendsColumnProps {
  currentUserId: string;
  currentDisplayName: string;
  onlineUserIds: Set<string>;
  onChallengeFriend: (friend: FriendItem) => void;
  isChallenging?: boolean;
}

export const FriendsColumn: React.FC<FriendsColumnProps> = ({
  currentUserId,
  currentDisplayName,
  onlineUserIds,
  onChallengeFriend,
  isChallenging = false
}) => {
  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'add'>('friends');
  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [requests, setRequests] = useState<FriendRequestItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [copiedId, setCopiedId] = useState<boolean>(false);
  const [notificationPerm, setNotificationPerm] = useState<NotificationPermission | 'unsupported'>('default');
  const [targetQuery, setTargetQuery] = useState<string>('');
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Initialize notification permission state
  useEffect(() => {
    setNotificationPerm(getNotificationPermissionStatus());
  }, []);

  // Fetch friends and requests
  const loadData = async () => {
    if (!currentUserId) return;
    try {
      const [friendList, reqList] = await Promise.all([
        fetchFriendsList(currentUserId, onlineUserIds),
        fetchFriendRequests(currentUserId)
      ]);
      setFriends(friendList);
      setRequests(reqList);
    } catch (_err) {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Subscribe to realtime changes on friendships table
    const unsubscribe = subscribeToFriendshipUpdates(currentUserId, () => {
      loadData();
    });

    // Also poll every 8 seconds
    const interval = setInterval(loadData, 8000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [currentUserId, onlineUserIds]);

  // Handle request notification permission
  const handleEnableNotifications = async () => {
    soundManager.playClick();
    const result = await requestNotificationPermission();
    setNotificationPerm(result);
  };

  // Copy User ID
  const handleCopyId = () => {
    soundManager.playClick();
    navigator.clipboard.writeText(currentUserId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  // Send friend request
  const handleSendRequest = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!targetQuery.trim() || isSubmitting) return;

    soundManager.playClick();
    setIsSubmitting(true);
    setActionMessage(null);

    const res = await sendFriendRequest(currentUserId, targetQuery);
    setIsSubmitting(false);

    if (res.success) {
      setActionMessage({ type: 'success', text: res.message });
      setTargetQuery('');
      loadData();
    } else {
      setActionMessage({ type: 'error', text: res.message });
    }
  };

  // Accept incoming request
  const handleAcceptRequest = async (req: FriendRequestItem) => {
    soundManager.playClick();
    const ok = await acceptFriendRequest(req.friendshipId);
    if (ok) {
      soundManager.playVictory();
      loadData();
    }
  };

  // Decline or cancel request
  const handleDeclineRequest = async (req: FriendRequestItem) => {
    soundManager.playClick();
    await declineOrCancelFriendRequest(req.friendshipId);
    loadData();
  };

  // Remove friend
  const handleRemoveFriend = async (friendshipId: string, name: string) => {
    if (window.confirm(`Are you sure you want to remove ${name} from your friends?`)) {
      soundManager.playClick();
      await removeFriend(friendshipId);
      loadData();
    }
  };

  const incomingRequests = requests.filter((r) => r.direction === 'incoming');
  const outgoingRequests = requests.filter((r) => r.direction === 'outgoing');

  return (
    <div
      className="glass-panel"
      style={{
        borderRadius: '16px',
        padding: '18px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        border: '1px solid rgba(56, 189, 248, 0.25)',
        background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.85) 0%, rgba(9, 14, 26, 0.95) 100%)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        height: '100%',
        minHeight: '480px'
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: 'rgba(56, 189, 248, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-cyan)'
            }}
          >
            <Users size={18} />
          </div>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--text-heading)', margin: 0 }}>
              Warrior Friends
            </h3>
            <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
              Add friends by ID & challenge them
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={loadData}
          title="Refresh Friends"
          style={{
            background: 'none',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            padding: '4px'
          }}
        >
          <RefreshCw size={14} />
        </button>
      </div>

      {/* User's Own ID Card */}
      <div
        style={{
          backgroundColor: 'rgba(10, 16, 30, 0.7)',
          border: '1px solid rgba(56, 189, 248, 0.2)',
          borderRadius: '12px',
          padding: '10px 12px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
          <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--accent-cyan)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Your Warrior ID
          </span>
          <button
            type="button"
            onClick={handleCopyId}
            style={{
              background: 'none',
              border: 'none',
              color: copiedId ? '#34d399' : '#38bdf8',
              fontSize: '0.72rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: 0
            }}
          >
            {copiedId ? <Check size={12} /> : <Copy size={12} />}
            <span>{copiedId ? 'Copied' : 'Copy ID'}</span>
          </button>
        </div>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.76rem',
            color: '#e2e8f0',
            wordBreak: 'break-all',
            userSelect: 'all',
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            padding: '4px 8px',
            borderRadius: '6px'
          }}
        >
          {currentUserId}
        </div>
      </div>

      {/* Notification Permission Card */}
      {notificationPerm === 'default' ? (
        <div
          style={{
            backgroundColor: 'rgba(244, 63, 94, 0.1)',
            border: '1px solid rgba(244, 63, 94, 0.35)',
            borderRadius: '12px',
            padding: '10px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BellRing size={16} color="#f43f5e" />
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#f43f5e' }}>
                Offline Challenge Alerts
              </div>
              <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                Get notified when friends challenge you
              </div>
            </div>
          </div>
          <button
            type="button"
            className="btn-primary"
            onClick={handleEnableNotifications}
            style={{
              padding: '4px 10px',
              fontSize: '0.72rem',
              backgroundColor: '#f43f5e',
              borderColor: '#fb7185',
              whiteSpace: 'nowrap'
            }}
          >
            Enable
          </button>
        </div>
      ) : notificationPerm === 'granted' ? (
        <div
          style={{
            backgroundColor: 'rgba(52, 211, 153, 0.08)',
            border: '1px solid rgba(52, 211, 153, 0.2)',
            borderRadius: '8px',
            padding: '6px 10px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.72rem',
            color: '#34d399',
            fontWeight: 700
          }}
        >
          <Bell size={13} />
          <span>Duel notifications enabled for offline invites</span>
        </div>
      ) : null}

      {/* Tab Selector */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '4px',
          backgroundColor: 'rgba(0, 0, 0, 0.35)',
          padding: '3px',
          borderRadius: '10px'
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('friends')}
          style={{
            padding: '6px 4px',
            borderRadius: '8px',
            border: 'none',
            fontSize: '0.75rem',
            fontWeight: 800,
            cursor: 'pointer',
            backgroundColor: activeTab === 'friends' ? 'rgba(56, 189, 248, 0.25)' : 'transparent',
            color: activeTab === 'friends' ? 'var(--accent-cyan)' : '#94a3b8',
            transition: 'all 0.15s ease'
          }}
        >
          Friends ({friends.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('requests')}
          style={{
            padding: '6px 4px',
            borderRadius: '8px',
            border: 'none',
            fontSize: '0.75rem',
            fontWeight: 800,
            cursor: 'pointer',
            position: 'relative',
            backgroundColor: activeTab === 'requests' ? 'rgba(56, 189, 248, 0.25)' : 'transparent',
            color: activeTab === 'requests' ? 'var(--accent-cyan)' : '#94a3b8',
            transition: 'all 0.15s ease'
          }}
        >
          Requests
          {incomingRequests.length > 0 && (
            <span
              style={{
                marginLeft: '4px',
                backgroundColor: '#f43f5e',
                color: '#fff',
                fontSize: '0.62rem',
                padding: '1px 5px',
                borderRadius: '8px'
              }}
            >
              {incomingRequests.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('add')}
          style={{
            padding: '6px 4px',
            borderRadius: '8px',
            border: 'none',
            fontSize: '0.75rem',
            fontWeight: 800,
            cursor: 'pointer',
            backgroundColor: activeTab === 'add' ? 'rgba(56, 189, 248, 0.25)' : 'transparent',
            color: activeTab === 'add' ? 'var(--accent-cyan)' : '#94a3b8',
            transition: 'all 0.15s ease'
          }}
        >
          + Add
        </button>
      </div>

      {/* Tab 1: Friends List */}
      {activeTab === 'friends' && (
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '420px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '30px 0', color: '#94a3b8', fontSize: '0.82rem' }}>
              <RefreshCw size={18} className="spin" style={{ margin: '0 auto 8px' }} />
              Loading warrior friends...
            </div>
          ) : friends.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 12px', color: '#94a3b8' }}>
              <Users size={32} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-heading)', marginBottom: '4px' }}>
                No Friends Yet
              </div>
              <p style={{ fontSize: '0.75rem', margin: 0, color: '#64748b' }}>
                Share your Warrior ID or click "+ Add" above to invite friends!
              </p>
            </div>
          ) : (
            friends.map((friend) => (
              <div
                key={friend.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(15, 23, 42, 0.6)',
                  border: friend.isOnline ? '1px solid rgba(52, 211, 153, 0.35)' : '1px solid rgba(255, 255, 255, 0.08)',
                  gap: '8px'
                }}
              >
                {/* Friend Avatar & Info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                  <div style={{ position: 'relative' }}>
                    <img
                      src={friend.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(friend.displayName)}`}
                      alt={friend.displayName}
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        border: '1px solid rgba(56, 189, 248, 0.4)',
                        objectFit: 'cover'
                      }}
                    />
                    {/* Status Dot */}
                    <span
                      style={{
                        position: 'absolute',
                        bottom: '-2px',
                        right: '-2px',
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        backgroundColor: friend.isOnline ? '#34d399' : '#64748b',
                        border: '2px solid #0f172a',
                        boxShadow: friend.isOnline ? '0 0 8px #34d399' : 'none'
                      }}
                    />
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span
                        style={{
                          fontSize: '0.85rem',
                          fontWeight: 800,
                          color: 'var(--text-heading)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {friend.displayName}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.68rem', color: '#94a3b8' }}>
                      <span style={{ color: friend.isOnline ? '#34d399' : '#64748b', fontWeight: 700 }}>
                        {friend.isOnline ? '🟢 Online' : '⚫ Offline'}
                      </span>
                      <span>•</span>
                      <span>{friend.mmr} MMR</span>
                    </div>
                  </div>
                </div>

                {/* Challenge & Delete Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    type="button"
                    className="btn-primary"
                    disabled={isChallenging}
                    onClick={() => onChallengeFriend(friend)}
                    style={{
                      padding: '6px 10px',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      backgroundColor: friend.isOnline ? '#e11d48' : 'rgba(56, 189, 248, 0.2)',
                      borderColor: friend.isOnline ? '#f43f5e' : 'rgba(56, 189, 248, 0.4)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      color: friend.isOnline ? '#fff' : '#38bdf8'
                    }}
                    title={friend.isOnline ? 'Direct Challenge (Online)' : 'Invite to Duel (Sends alert)'}
                  >
                    <Swords size={12} />
                    <span>{friend.isOnline ? 'Challenge' : 'Invite'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRemoveFriend(friend.friendshipId, friend.displayName)}
                    title="Remove Friend"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#64748b',
                      cursor: 'pointer',
                      padding: '4px',
                      borderRadius: '4px'
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 2: Requests Tab */}
      {activeTab === 'requests' && (
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '420px' }}>
          {/* Incoming Section */}
          <div>
            <div style={{ fontSize: '0.70rem', fontWeight: 800, color: 'var(--accent-cyan)', textTransform: 'uppercase', marginBottom: '6px' }}>
              Incoming Requests ({incomingRequests.length})
            </div>
            {incomingRequests.length === 0 ? (
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic', padding: '6px 0' }}>
                No incoming friend requests.
              </div>
            ) : (
              incomingRequests.map((req) => (
                <div
                  key={req.friendshipId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(15, 23, 42, 0.7)',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    marginBottom: '6px'
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-heading)' }}>
                      {req.displayName}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                      {req.mmr || 1000} MMR
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => handleAcceptRequest(req)}
                      style={{ padding: '4px 8px', fontSize: '0.70rem', backgroundColor: '#22c55e', borderColor: '#4ade80' }}
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => handleDeclineRequest(req)}
                      style={{ padding: '4px 8px', fontSize: '0.70rem' }}
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Outgoing Section */}
          <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '8px' }}>
            <div style={{ fontSize: '0.70rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>
              Sent Requests ({outgoingRequests.length})
            </div>
            {outgoingRequests.length === 0 ? (
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic', padding: '4px 0' }}>
                No sent requests.
              </div>
            ) : (
              outgoingRequests.map((req) => (
                <div
                  key={req.friendshipId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 10px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(0, 0, 0, 0.25)',
                    marginBottom: '4px'
                  }}
                >
                  <div style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>
                    {req.displayName} <span style={{ color: '#fbbf24', fontSize: '0.68rem' }}>(Pending)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeclineRequest(req)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#f43f5e',
                      fontSize: '0.70rem',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Add Friend Tab */}
      {activeTab === 'add' && (
        <form onSubmit={handleSendRequest} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div>
            <label style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--accent-cyan)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
              Add by Player ID or Name
            </label>
            <input
              type="text"
              placeholder="Paste Player ID or display name"
              value={targetQuery}
              onChange={(e) => setTargetQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '10px',
                background: 'var(--btn-sec-bg)',
                border: '1px solid var(--border-card)',
                color: 'var(--text-main)',
                fontSize: '0.82rem',
                outline: 'none'
              }}
            />
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={!targetQuery.trim() || isSubmitting}
            style={{
              padding: '10px',
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            {isSubmitting ? (
              <>
                <RefreshCw size={14} className="spin" />
                <span>Sending...</span>
              </>
            ) : (
              <>
                <Send size={14} />
                <span>Send Friend Request</span>
              </>
            )}
          </button>

          {actionMessage && (
            <div
              style={{
                padding: '8px 10px',
                borderRadius: '8px',
                fontSize: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: actionMessage.type === 'success' ? 'rgba(52, 211, 153, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                color: actionMessage.type === 'success' ? '#34d399' : '#f43f5e',
                border: actionMessage.type === 'success' ? '1px solid rgba(52, 211, 153, 0.3)' : '1px solid rgba(244, 63, 94, 0.3)'
              }}
            >
              {actionMessage.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
              <span>{actionMessage.text}</span>
            </div>
          )}

          <div style={{ backgroundColor: 'rgba(0,0,0,0.25)', padding: '10px', borderRadius: '10px', fontSize: '0.70rem', color: '#94a3b8' }}>
            💡 <strong>Tip:</strong> Ask your friend to copy their <em>Warrior ID</em> from their screen and paste it here to connect instantly!
          </div>
        </form>
      )}
    </div>
  );
};
export default FriendsColumn;

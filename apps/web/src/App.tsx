import React, { useState, useEffect } from 'react';
import { Room } from 'colyseus.js';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { ensureGuestSession, GuestProfile, UserProfile, getUserProfile } from './lib/supabase';
import { LandingPage } from './pages/LandingPage';
import { LobbyPage } from './pages/LobbyPage';
import { MatchPage } from './pages/MatchPage';
import { ResultPage } from './pages/ResultPage';
import { Navbar } from './components/layout/Navbar';
import { AuthModal } from './components/auth/AuthModal';
import { ProfileModal } from './components/profile/ProfileModal';
import { LeaderboardModal } from './components/leaderboard/LeaderboardModal';

export const App: React.FC = () => {
  const [guest, setGuest] = useState<GuestProfile | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [view, setView] = useState<'landing' | 'lobby' | 'match' | 'result'>('landing');
  const [room, setRoom] = useState<Room | null>(null);
  const [initialRoomCode, setInitialRoomCode] = useState<string | undefined>(undefined);
  const [matchResult, setMatchResult] = useState<any>(null);

  // Modals state
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [leaderboardModalOpen, setLeaderboardModalOpen] = useState(false);

  const openAuthWithMode = (mode: 'login' | 'register') => {
    setAuthModalMode(mode);
    setAuthModalOpen(true);
  };

  const reloadProfile = async () => {
    try {
      const p = await getUserProfile();
      setUserProfile(p);
      if (p) {
        setGuest(p);
      }
    } catch (_err) {
      // Ignore
    }
  };

  const initSession = async () => {
    setIsInitializing(true);
    setAuthError(null);
    try {
      const g = await ensureGuestSession();
      const p = await getUserProfile(g.id);
      if (p && !p.isGuest) {
        setUserProfile(p);
        setGuest(p);
      } else {
        setGuest(g);
        setUserProfile(p);
      }

      setIsInitializing(false);
    } catch (err: any) {
      setIsInitializing(false);
      setAuthError(err?.message || 'Failed to initialize session with Supabase.');
    }
  };

  useEffect(() => {
    initSession();

    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      setInitialRoomCode(roomParam);
      setView('lobby');
    }
  }, []);

  useEffect(() => {
    const savedTheme = userProfile?.keycapTheme || localStorage.getItem('keyfury_theme') || 'cyberpunk';
    document.documentElement.dataset.theme = savedTheme;
  }, [userProfile?.keycapTheme]);

  const handlePlayClick = () => {
    setView('lobby');
  };

  const handleMatchStart = (rm: Room) => {
    setRoom(rm);
    setView('match');
  };

  const handleMatchComplete = (resultData: any) => {
    setMatchResult(resultData);
    setView('result');
    reloadProfile();
  };

  const handleReturnToLobby = () => {
    if (room) {
      room.leave();
      setRoom(null);
    }
    setView('lobby');
  };

  const handleBackToLanding = () => {
    if (room) {
      room.leave();
      setRoom(null);
    }
    setView('landing');
  };

  if (isInitializing) {
    return (
      <div style={{ textAlign: 'center', margin: '150px auto', color: '#94a3b8' }}>
        <RefreshCw size={28} className="spin" style={{ marginBottom: '12px', color: '#38bdf8' }} />
        <div style={{ fontWeight: 700 }}>Initializing KeyFury session...</div>
      </div>
    );
  }

  if (authError || !guest) {
    return (
      <div style={{ maxWidth: '500px', margin: '120px auto', padding: '32px', textAlign: 'center' }} className="glass-panel">
        <AlertCircle size={40} color="#f43f5e" style={{ marginBottom: '16px' }} />
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '12px', color: '#f43f5e' }}>
          Authentication Error
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '0.95rem', marginBottom: '24px' }}>
          {authError || 'Could not verify session.'}
        </p>
        <button className="btn-primary" onClick={initSession}>
          <RefreshCw size={18} /> Retry Authentication
        </button>
      </div>
    );
  }

  return (
    <div className="app-container" style={view === 'match' ? { height: '100vh', overflow: 'hidden' } : undefined}>
      {/* Top Navbar */}
      {view !== 'match' && (
        <Navbar
          userProfile={userProfile}
          onOpenLeaderboard={() => setLeaderboardModalOpen(true)}
          onOpenProfile={() => setProfileModalOpen(true)}
          onOpenAuth={(mode) => openAuthWithMode(mode || 'login')}
          onQueueRankedMatch={() => setView('lobby')}
        />
      )}

      {/* Main View Content */}
      <div style={{ flex: 1, height: view === 'match' ? '100vh' : undefined, overflow: view === 'match' ? 'hidden' : undefined }}>
        {view === 'landing' && (
          <LandingPage guest={guest} onPlayClick={handlePlayClick} />
        )}

        {view === 'lobby' && (
          <LobbyPage
            guest={guest}
            userProfile={userProfile}
            initialRoomCode={initialRoomCode}
            onMatchStart={handleMatchStart}
            onBackToLanding={handleBackToLanding}
            onOpenAuth={(mode) => openAuthWithMode(mode || 'register')}
          />
        )}

        {view === 'match' && room && (
          <MatchPage
            room={room}
            guest={guest}
            onMatchComplete={handleMatchComplete}
          />
        )}

        {view === 'result' && room && (
          <ResultPage
            room={room}
            guest={guest}
            matchResult={matchResult}
            userProfile={userProfile}
            onReturnToLobby={handleReturnToLobby}
            onOpenProfile={() => setProfileModalOpen(true)}
          />
        )}
      </div>

      {/* Global Modals */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        guestSession={guest}
        onAuthSuccess={reloadProfile}
        initialMode={authModalMode}
      />

      <ProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        userProfile={userProfile}
        onProfileUpdated={reloadProfile}
      />

      <LeaderboardModal
        isOpen={leaderboardModalOpen}
        onClose={() => setLeaderboardModalOpen(false)}
        currentUserProfile={userProfile}
      />
    </div>
  );
};

export default App;

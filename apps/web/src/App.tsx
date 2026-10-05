import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Room } from 'colyseus.js';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { ensureGuestSession, GuestProfile, UserProfile, getUserProfile } from './lib/supabase';
import { LandingPage } from './pages/LandingPage';
import { Navbar } from './components/layout/Navbar';
import { AuthModal } from './components/auth/AuthModal';
import { ProfileModal } from './components/profile/ProfileModal';
import { LeaderboardModal } from './components/leaderboard/LeaderboardModal';

// Code-split heavy routes & 3D WebGL modules to ensure ultra-fast Landing Page FCP/LCP
const LobbyPage = lazy(() => import('./pages/LobbyPage'));
const MatchPage = lazy(() => import('./pages/MatchPage'));
const ResultPage = lazy(() => import('./pages/ResultPage'));
const KeyFurySplashScreen = lazy(() => import('./components/splash/KeyFurySplashScreen'));

/**
 * Detect whether the splash screen should be bypassed:
 * 1. Search engine crawlers & LLM scrapers (Googlebot, Bingbot, GPTBot, PerplexityBot, ClaudeBot, etc.)
 * 2. URL parameters (?nosplash=1, ?skipSplash=true, ?splash=0)
 * 3. Session storage (user already saw the splash screen in this session)
 */
export const shouldBypassSplashScreen = (): boolean => {
  if (typeof window === 'undefined' && typeof navigator === 'undefined' && typeof globalThis === 'undefined') return true;

  const loc = typeof window !== 'undefined' && window.location ? window.location : (typeof globalThis !== 'undefined' ? (globalThis as any).location : undefined);

  try {
    const search = loc?.search || '';
    if (search) {
      const params = new URLSearchParams(search);
      if (params.has('nosplash') || params.has('skipSplash') || params.get('splash') === '0' || params.has('room') || params.has('view')) {
        return true;
      }
    }
  } catch (_e) {
    // Ignore query parsing errors
  }

  try {
    const pathname = (loc?.pathname || '').toLowerCase().replace(/\/$/, '');
    if (pathname === '/ranked' || pathname === '/practice' || pathname === '/leaderboard' || pathname === '/lobby') {
      return true;
    }
  } catch (_e) {
    // Ignore pathname parsing errors
  }

  try {
    const hash = loc?.hash || '';
    if (hash && hash.length > 1) {
      return true;
    }
  } catch (_e) {
    // Ignore hash parsing errors
  }

  try {
    const storage = typeof window !== 'undefined' ? window.sessionStorage : (typeof sessionStorage !== 'undefined' ? sessionStorage : null);
    if (storage && storage.getItem('keyfury_splash_seen') === 'true') {
      return true;
    }
  } catch (_e) {
    // Ignore storage errors in restricted contexts
  }

  const nav = typeof navigator !== 'undefined' ? navigator : (typeof window !== 'undefined' ? window.navigator : undefined);
  const ua = (nav?.userAgent || '').toLowerCase();
  const isBotOrCrawler = /googlebot|bingbot|yandex|baiduspider|duckduckbot|slurp|twitterbot|facebookexternalhit|rogerbot|linkedinbot|embedly|quora link preview|showyoubot|outbrain|pinterest|slackbot|vkshare|w3c_validator|crawler|spider|bot|crawl|lighthouse|headlesschrome|gptbot|chatgpt|claudebot|perplexity|anthropic|cohere|applebot|oai-searchbot|diffbot|bytespider/i.test(ua);
  if (isBotOrCrawler) {
    return true;
  }

  return false;
};

const PageLoadingFallback: React.FC = () => (
  <div style={{ textAlign: 'center', margin: '140px auto', color: '#94a3b8' }}>
    <RefreshCw size={28} className="spin" style={{ marginBottom: '12px', color: '#38bdf8' }} />
    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Loading KeyFury 3D Arena...</div>
  </div>
);

export const App: React.FC = () => {
  const [showSplash, setShowSplash] = useState<boolean>(() => !shouldBypassSplashScreen());
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
      const g = await ensureGuestSession();
      const p = await getUserProfile(g?.id);
      if (p && !p.isGuest) {
        setUserProfile(p);
        setGuest(p);
      } else {
        setUserProfile(p);
        setGuest(p || g);
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

    const handleProfileSync = () => {
      reloadProfile();
    };
    window.addEventListener('keyfury_stats_updated', handleProfileSync);
    window.addEventListener('keyfury_profile_updated', handleProfileSync);

    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    const viewParam = params.get('view');
    const pathname = window.location.pathname.toLowerCase().replace(/\/$/, '');

    if (roomParam) {
      setInitialRoomCode(roomParam);
      setView('lobby');
    } else if (pathname === '/ranked' || pathname === '/lobby' || pathname === '/practice' || viewParam === 'ranked' || viewParam === 'lobby' || viewParam === 'practice') {
      setView('lobby');
    } else if (pathname === '/leaderboard' || viewParam === 'leaderboard') {
      setLeaderboardModalOpen(true);
    }

    return () => {
      window.removeEventListener('keyfury_stats_updated', handleProfileSync);
      window.removeEventListener('keyfury_profile_updated', handleProfileSync);
    };
  }, []);

  useEffect(() => {
    const savedTheme = userProfile?.keycapTheme || localStorage.getItem('keyfury_theme') || 'cyberpunk';
    document.documentElement.dataset.theme = savedTheme;
  }, [userProfile?.keycapTheme]);

  const handleSplashComplete = () => {
    try {
      sessionStorage.setItem('keyfury_splash_seen', 'true');
    } catch (_e) {}
    setShowSplash(false);
  };

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
    reloadProfile();
  };

  const handleBackToLanding = () => {
    if (room) {
      room.leave();
      setRoom(null);
    }
    setView('landing');
  };

  if (showSplash) {
    return (
      <Suspense fallback={null}>
        <KeyFurySplashScreen
          durationSeconds={5.0}
          onComplete={handleSplashComplete}
        />
      </Suspense>
    );
  }

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
    <div className="app-container" style={view === 'match' ? { height: '100vh', overflow: 'hidden' } : (view === 'result' ? { minHeight: '100vh', overflowY: 'auto' } : undefined)}>
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
      <div style={{
        flex: 1,
        height: view === 'match' ? '100vh' : (view === 'result' ? 'calc(100vh - 78px)' : undefined),
        overflow: (view === 'match' || view === 'result') ? 'hidden' : undefined
      }}>
        <Suspense fallback={<PageLoadingFallback />}>
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
              onRematchStart={() => setView('match')}
            />
          )}
        </Suspense>
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
        onOpenAuth={(mode) => openAuthWithMode(mode || 'register')}
      />
    </div>
  );
};

export default App;

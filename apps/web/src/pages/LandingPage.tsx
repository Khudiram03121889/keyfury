import React, { useEffect } from 'react';
import { Swords, Keyboard, ShieldCheck, Zap, Award, Sparkles } from 'lucide-react';
import { GuestProfile } from '../lib/supabase';
import { soundManager } from '../audio/SoundManager';

interface LandingPageProps {
  guest: GuestProfile | null;
  onPlayClick: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ guest, onPlayClick }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        soundManager.playClick();
        onPlayClick();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onPlayClick]);

  return (
    <div className="landing-container" style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 24px' }}>
      {/* Hero Section */}
      <main style={{ textAlign: 'center', marginBottom: '80px' }}>
        <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'center' }}>
          <img
            src="/logo.jpg"
            alt="KeyFury Logo"
            style={{
              width: '150px',
              height: '150px',
              borderRadius: '24px',
              boxShadow: '0 0 30px rgba(56, 189, 248, 0.4), 0 0 60px rgba(249, 115, 22, 0.25)',
              border: '2px solid rgba(255, 255, 255, 0.15)',
              objectFit: 'cover'
            }}
          />
        </div>

        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 16px',
          borderRadius: '999px',
          background: 'rgba(99, 102, 241, 0.15)',
          border: '1px solid rgba(99, 102, 241, 0.3)',
          color: '#818cf8',
          fontSize: '0.9rem',
          fontWeight: 700,
          marginBottom: '24px'
        }}>
          <Sparkles size={16} /> 1v1 Competitive Typing Combat
        </div>

        <h2 style={{
          fontSize: '3.5rem',
          fontWeight: 900,
          lineHeight: 1.1,
          marginBottom: '20px',
          background: 'linear-gradient(180deg, #ffffff 0%, #cbd5e1 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          Type words. Land hits. <br /><span style={{ color: '#38bdf8' }}>Win the duel.</span>
        </h2>

        <p style={{ fontSize: '1.25rem', color: '#94a3b8', maxWidth: '650px', margin: '0 auto 36px' }}>
          Enter a fast 90-second typing battle against another player. Correct keys trigger attacks in real-time.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
          <button
            className="btn-primary"
            onClick={() => {
              soundManager.playClick();
              onPlayClick();
            }}
            style={{ fontSize: '1.3rem', padding: '16px 40px' }}
          >
            <Swords size={24} /> Play a Duel <span className="kbd-badge">Enter</span>
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', color: '#64748b', fontSize: '0.88rem' }}>
            <span><Keyboard size={14} style={{ verticalAlign: 'middle' }} /> Physical QWERTY Desktop Required</span>
            <span>•</span>
            <span>Instant Guest Mode</span>
          </div>
        </div>
      </main>

      {/* How It Works Section */}
      <section style={{ marginBottom: '80px' }}>
        <h3 style={{ textAlign: 'center', fontSize: '1.6rem', fontWeight: 800, marginBottom: '32px' }}>
          How It Works
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
          <div className="glass-panel" style={{ padding: '28px', textAlign: 'center' }}>
            <div style={{
              width: '56px', height: '56px', borderRadius: '14px', background: 'rgba(56, 189, 248, 0.15)',
              color: '#38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px'
            }}>
              <Keyboard size={28} />
            </div>
            <h4 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '10px' }}>1. Type Correct Words</h4>
            <p style={{ color: '#94a3b8', fontSize: '0.95rem' }}>
              Both fighters receive the same versioned, seeded word deck. Type your active word accurately to advance.
            </p>
          </div>

          <div className="glass-panel" style={{ padding: '28px', textAlign: 'center' }}>
            <div style={{
              width: '56px', height: '56px', borderRadius: '14px', background: 'rgba(244, 63, 94, 0.15)',
              color: '#f43f5e', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px'
            }}>
              <Zap size={28} />
            </div>
            <h4 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '10px' }}>2. Complete Words to Attack</h4>
            <p style={{ color: '#94a3b8', fontSize: '0.95rem' }}>
              Short words trigger fast Jabs (5 dmg), medium words deliver Kicks (8 dmg), and long words strike Heavy (12 dmg)!
            </p>
          </div>

          <div className="glass-panel" style={{ padding: '28px', textAlign: 'center' }}>
            <div style={{
              width: '56px', height: '56px', borderRadius: '14px', background: 'rgba(52, 211, 153, 0.15)',
              color: '#34d399', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px'
            }}>
              <Award size={28} />
            </div>
            <h4 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '10px' }}>3. Highest Health Wins</h4>
            <p style={{ color: '#94a3b8', fontSize: '0.95rem' }}>
              Land continuous combos for extra bonus damage (+1 to +4). Deplete your opponent's health or lead at 90 seconds!
            </p>
          </div>
        </div>
      </section>

      {/* Privacy Guarantee Note */}
      <footer className="glass-panel" style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <ShieldCheck size={28} color="#34d399" style={{ flexShrink: 0 }} />
        <p style={{ fontSize: '0.88rem', color: '#94a3b8' }}>
          <strong style={{ color: '#f8fafc' }}>Privacy Guarantee:</strong> KeyFury reads only expected match characters while a duel is active. It does not record or transmit general keyboard activity or private data outside active matches.
        </p>
      </footer>
    </div>
  );
};

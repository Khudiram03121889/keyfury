import React, { useEffect } from 'react';
import { Swords, Keyboard, ShieldCheck, Zap, Award, Sparkles, Youtube, Instagram } from 'lucide-react';
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
    <div className="landing-container">
      {/* Hero Section */}
      <main style={{ textAlign: 'center', marginBottom: '60px' }}>
        <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'center' }}>
          <img
            src="/logo.jpg"
            alt="KeyFury Logo"
            style={{
              width: 'clamp(90px, 20vw, 150px)',
              height: 'clamp(90px, 20vw, 150px)',
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
          color: 'var(--accent-purple)',
          fontSize: 'clamp(0.78rem, 2.5vw, 0.9rem)',
          fontWeight: 700,
          marginBottom: '20px'
        }}>
          <Sparkles size={16} /> 1v1 Competitive Typing Combat
        </div>

        <h2 style={{
          fontSize: 'clamp(1.8rem, 5.5vw, 3.5rem)',
          fontWeight: 900,
          lineHeight: 1.15,
          marginBottom: '16px',
          background: 'var(--hero-gradient)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          Type words. Land hits. <br /><span style={{ color: 'var(--accent-cyan)' }}>Win the duel.</span>
        </h2>

        <p style={{ fontSize: 'clamp(0.95rem, 3vw, 1.25rem)', color: 'var(--text-muted)', maxWidth: '650px', margin: '0 auto 28px', padding: '0 8px' }}>
          Enter a fast 90-second typing battle against another player. Correct keys trigger attacks in real-time.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
          <button
            className="btn-primary"
            onClick={() => {
              soundManager.playClick();
              onPlayClick();
            }}
            style={{ fontSize: 'clamp(1.05rem, 3vw, 1.3rem)', padding: '14px 32px' }}
          >
            <Swords size={22} /> Play a Duel <span className="kbd-badge">Enter</span>
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
            <span><Keyboard size={14} style={{ verticalAlign: 'middle' }} /> Physical QWERTY Desktop Required</span>
            <span>•</span>
            <span>Instant Guest Mode</span>
          </div>
        </div>
      </main>

      {/* How It Works Section */}
      <section style={{ marginBottom: '60px' }}>
        <h3 style={{ textAlign: 'center', fontSize: 'clamp(1.3rem, 4vw, 1.6rem)', fontWeight: 800, marginBottom: '24px', color: 'var(--text-heading)' }}>
          How It Works
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
          <div className="glass-panel" style={{ padding: '24px 20px', textAlign: 'center' }}>
            <div style={{
              width: '50px', height: '50px', borderRadius: '14px', background: 'rgba(56, 189, 248, 0.15)',
              color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px'
            }}>
              <Keyboard size={24} />
            </div>
            <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px', color: 'var(--text-heading)' }}>1. Type Correct Words</h4>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.45 }}>
              Both fighters receive the same versioned, seeded word deck. Type your active word accurately to advance.
            </p>
          </div>

          <div className="glass-panel" style={{ padding: '24px 20px', textAlign: 'center' }}>
            <div style={{
              width: '50px', height: '50px', borderRadius: '14px', background: 'rgba(244, 63, 94, 0.15)',
              color: 'var(--accent-pink)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px'
            }}>
              <Zap size={24} />
            </div>
            <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px', color: 'var(--text-heading)' }}>2. Complete Words to Attack</h4>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.45 }}>
              Short words trigger fast Jabs (5 dmg), medium words deliver Kicks (8 dmg), and long words strike Heavy (12 dmg)!
            </p>
          </div>

          <div className="glass-panel" style={{ padding: '24px 20px', textAlign: 'center' }}>
            <div style={{
              width: '50px', height: '50px', borderRadius: '14px', background: 'rgba(52, 211, 153, 0.15)',
              color: 'var(--accent-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px'
            }}>
              <Award size={24} />
            </div>
            <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px', color: 'var(--text-heading)' }}>3. Highest Health Wins</h4>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.45 }}>
              Land continuous combos for extra bonus damage (+1 to +4). Deplete your opponent's health or lead at 90 seconds!
            </p>
          </div>
        </div>
      </section>

      {/* Footer with Social Links & Privacy Guarantee */}
      <footer className="glass-panel" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '240px' }}>
          <ShieldCheck size={24} color="var(--accent-green)" style={{ flexShrink: 0 }} />
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
            <strong style={{ color: 'var(--text-main)' }}>Privacy Guarantee:</strong> KeyFury reads only expected match characters while a duel is active. It does not record or transmit general keyboard activity or private data outside active matches.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <a
            href="https://www.youtube.com/@keyfurytype"
            target="_blank"
            rel="noopener noreferrer"
            title="KeyFury YouTube Channel"
            aria-label="KeyFury YouTube Channel"
            className="btn-secondary"
            style={{ padding: '8px 12px', fontSize: '0.82rem', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '6px', color: '#ef4444' }}
          >
            <Youtube size={16} /> YouTube
          </a>
          <a
            href="https://www.instagram.com/keyfury.in"
            target="_blank"
            rel="noopener noreferrer"
            title="KeyFury Instagram Profile"
            aria-label="KeyFury Instagram Profile"
            className="btn-secondary"
            style={{ padding: '8px 12px', fontSize: '0.82rem', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '6px', color: '#ec4899' }}
          >
            <Instagram size={16} /> Instagram
          </a>
        </div>
      </footer>
    </div>
  );
};

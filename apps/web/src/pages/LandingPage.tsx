import React, { useEffect, useState, useRef } from 'react';
import {
  Swords,
  Keyboard,
  ShieldCheck,
  Zap,
  Award,
  Sparkles,
  Youtube,
  Instagram,
  ChevronDown,
  ChevronUp,
  Shield,
  Check,
  X,
  Box,
  Layers,
  Flame,
  Globe
} from 'lucide-react';
import { GuestProfile } from '../lib/supabase';
import { soundManager } from '../audio/SoundManager';
import {
  shadowRonin3d,
  cyberValkyrie3d,
  voltShinobi3d,
  voidAssassin3d
} from '../assets/characters';
import {
  highlandSanctuaryUrl,
  cyberRooftopUrl,
  volcanicCalderaUrl,
  celestialVoidUrl
} from '../assets/arenas';

interface LandingPageProps {
  guest: GuestProfile | null;
  onPlayClick: () => void;
}

interface ChampionCard {
  name: string;
  codename: string;
  title: string;
  archetype: string;
  element: string;
  color: string;
  portrait: string;
  signature: string;
  stats: { speed: number; power: number; defense: number };
}

const CHAMPIONS: ChampionCard[] = [
  {
    name: 'Shadow Ronin',
    codename: 'Kage',
    title: 'The Azure Blade of Neo-Kyoto',
    archetype: 'Precision Katana Striker',
    element: 'Azure Plasma',
    color: '#38bdf8',
    portrait: shadowRonin3d,
    signature: 'Azure Plasma Flash',
    stats: { speed: 9, power: 7, defense: 6 }
  },
  {
    name: 'Cyber Valkyrie',
    codename: 'Freya',
    title: 'Vanguard Heavy Exo-Brawler',
    archetype: 'Heavy Titanium Brawler',
    element: 'Crimson Core',
    color: '#ef4444',
    portrait: cyberValkyrie3d,
    signature: 'Crimson Impact Overdrive',
    stats: { speed: 5, power: 10, defense: 9 }
  },
  {
    name: 'Volt Shinobi',
    codename: 'Raijin',
    title: 'High-Voltage Cyber Infiltrator',
    archetype: 'Lightning Rushdown Ninja',
    element: 'Volt Lightning',
    color: '#f59e0b',
    portrait: voltShinobi3d,
    signature: 'Thunder Tempest Surge',
    stats: { speed: 10, power: 6, defense: 5 }
  },
  {
    name: 'Void Assassin',
    codename: 'Nyx',
    title: 'Shadow Rift Dimensional Stalker',
    archetype: 'Dimensional Stealth Stalker',
    element: 'Amethyst Void',
    color: '#a855f7',
    portrait: voidAssassin3d,
    signature: 'Amethyst Rift Strike',
    stats: { speed: 8, power: 8, defense: 5 }
  }
];

interface ArenaCard {
  name: string;
  subtitle: string;
  description: string;
  image: string;
  tag: string;
}

const ARENAS: ArenaCard[] = [
  {
    name: 'Highland Sanctuary',
    subtitle: 'Zen Mist Temple',
    description: 'Floating sacred sanctuary atop mountain peaks with neon lanterns and serene stone platforms.',
    image: highlandSanctuaryUrl,
    tag: 'Zen Atmospheric'
  },
  {
    name: 'Cyber Rooftop',
    subtitle: 'Neo-Kyoto Skyway',
    description: 'Rain-slicked skyscraper platform framed by towering holographic advertisements and neon skylines.',
    image: cyberRooftopUrl,
    tag: 'Cyberpunk Skyline'
  },
  {
    name: 'Volcanic Caldera',
    subtitle: 'Molten Core Platform',
    description: 'Cracked obsidian battle ring suspended over swirling molten lava and erupting volcanic vents.',
    image: volcanicCalderaUrl,
    tag: 'Hazard Core'
  },
  {
    name: 'Celestial Void',
    subtitle: 'Deep Astral Monolith',
    description: 'Cosmic platform surrounded by deep-space nebulas, orbital stardust, and shattered astrolabes.',
    image: celestialVoidUrl,
    tag: 'Cosmic Dimension'
  }
];

const FAQS = [
  {
    question: 'What is KeyFury?',
    answer:
      'KeyFury is a free, web-based 3D typing fighting game powered by WebGL and Three.js. Keystrokes directly trigger real-time martial arts strikes, combos, and specials between 3D champions in cinematic arenas. Instead of passive WPM tests, players duel in fast-paced 60-to-90-second 1v1 battles to deplete the opponent\'s 200 HP health bar.'
  },
  {
    question: 'How does 3D typing fighting combat work?',
    answer:
      'Both warriors enter the arena with 200 HP. Players receive synchronized, seeded word decks. Typing short words executes rapid Jabs, medium words trigger Kicks, and long words launch Heavy Strikes. Consecutive error-free words build combo streaks for bonus damage and weapon finishers. Each typing error incurs a -2 HP penalty, penalizing reckless mashing and rewarding pinpoint typing accuracy.'
  },
  {
    question: 'What 3D champions and arenas are available in KeyFury?',
    answer:
      'KeyFury features 4 distinct 3D champions—Shadow Ronin (precision katana), Cyber Valkyrie (heavy exo-brawler), Volt Shinobi (lightning rushdown), and Void Assassin (dimensional stealth)—across 4 cinematic 3D arenas: Highland Sanctuary, Cyber Rooftop, Volcanic Caldera, and Celestial Void.'
  },
  {
    question: 'Is KeyFury free to play, and do I need to download software?',
    answer:
      'Yes, KeyFury is 100% free to play directly in any modern desktop web browser (Chrome, Firefox, Safari, Edge). No downloads, plugins, or account registration are required—guest accounts start instantly with one keystroke.'
  },
  {
    question: 'How does KeyFury compare to Monkeytype, TypeRacer, and Typing of the Dead?',
    answer:
      'Unlike Monkeytype (solo metric benchmarks) or TypeRacer (car racing text snippets), KeyFury delivers true 1v1 action fighting game combat with real-time 3D models, health bars, dynamic camera pans, and Elo MMR matchmaking. Unlike retro rail-shooters like Typing of the Dead, KeyFury runs directly in the browser with competitive real-time multiplayer and instant AI bot fallback.'
  },
  {
    question: 'How does the bot matchmaking fallback work?',
    answer:
      'When you queue for Ranked or Quick Play, KeyFury searches for human opponents within your Elo rating. If no human matches within 5 seconds, an adaptive AI Bot Warrior is seamlessly substituted at your skill tier (40–120 WPM simulation) so you never wait in an empty queue.'
  }
];

export const LandingPage: React.FC<LandingPageProps> = ({ guest: _guest, onPlayClick }) => {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Smooth 60+ FPS scroll reveal observer
  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof IntersectionObserver === 'undefined') return;

    // Enable animated scroll reveal
    container.classList.add('scroll-reveal-init');

    const targets = container.querySelectorAll(
      '.scroll-reveal, .scroll-reveal-header, .scroll-reveal-card, .scroll-reveal-badge'
    );

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed');
          }
        });
      },
      {
        root: null,
        rootMargin: '0px 0px -40px 0px',
        threshold: 0.1
      }
    );

    targets.forEach((target) => observer.observe(target));

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
        const target = e.target as HTMLElement;
        if (target && (target.tagName === 'BUTTON' || target.tagName === 'A' || target.tagName === 'INPUT')) {
          return;
        }
        e.preventDefault();
        soundManager.playClick();
        onPlayClick();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onPlayClick]);

  const toggleFaq = (idx: number) => {
    setOpenFaqIndex(openFaqIndex === idx ? null : idx);
  };

  return (
    <div ref={containerRef} className="landing-container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 16px 60px' }}>
      {/* Hero Section */}
      <main style={{ textAlign: 'center', marginBottom: '70px', paddingTop: '20px' }}>
        <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'center' }}>
          <img
            src="/logo.jpg"
            alt="KeyFury 3D Typing Combat Logo"
            style={{
              width: 'clamp(96px, 18vw, 140px)',
              height: 'clamp(96px, 18vw, 140px)',
              borderRadius: '24px',
              boxShadow: '0 0 35px rgba(56, 189, 248, 0.45), 0 0 70px rgba(249, 115, 22, 0.25)',
              border: '2px solid rgba(255, 255, 255, 0.15)',
              objectFit: 'cover'
            }}
          />
        </div>

        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 18px',
            borderRadius: '999px',
            background: 'rgba(56, 189, 248, 0.12)',
            border: '1px solid rgba(56, 189, 248, 0.35)',
            color: 'var(--accent-cyan)',
            fontSize: 'clamp(0.8rem, 2.5vw, 0.92rem)',
            fontWeight: 800,
            letterSpacing: '0.5px',
            marginBottom: '20px',
            textTransform: 'uppercase'
          }}
        >
          <Box size={16} /> Next-Gen 3D WebGL Typing Combat
        </div>

        {/* Primary Document H1 for SEO & LLM Discovery */}
        <h1
          style={{
            fontSize: 'clamp(2rem, 5.5vw, 3.8rem)',
            fontWeight: 900,
            lineHeight: 1.15,
            marginBottom: '18px',
            letterSpacing: '-0.5px',
            background: 'var(--hero-gradient)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}
        >
          KeyFury: 3D Typing Fighting Game <br />
          <span style={{ color: 'var(--accent-cyan)' }}>Type Words. Strike Hits. KO Opponents.</span>
        </h1>

        <p
          style={{
            fontSize: 'clamp(1rem, 2.8vw, 1.25rem)',
            color: 'var(--text-muted)',
            maxWidth: '740px',
            margin: '0 auto 30px',
            lineHeight: 1.6,
            padding: '0 12px'
          }}
        >
          Experience the adrenaline of real-time 1v1 typing combat powered by Three.js 3D WebGL.
          Master 4 champions across 4 arenas. Type target words accurately to deal damage, build lethal combos,
          and drain your rival's 200 HP health bar in high-stakes 90-second duels.
        </p>

        {/* Quick Highlights Pill Badges */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            flexWrap: 'wrap',
            marginBottom: '32px'
          }}
        >
          <span className="glass-panel scroll-reveal-badge" style={{ padding: '6px 14px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 700, color: '#38bdf8', '--reveal-delay': '0ms' } as React.CSSProperties}>
            <Box size={14} style={{ verticalAlign: 'middle', marginRight: '6px' }} /> 3D WebGL Engine
          </span>
          <span className="glass-panel scroll-reveal-badge" style={{ padding: '6px 14px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 700, color: '#ef4444', '--reveal-delay': '75ms' } as React.CSSProperties}>
            <Swords size={14} style={{ verticalAlign: 'middle', marginRight: '6px' }} /> 4 3D Champions
          </span>
          <span className="glass-panel scroll-reveal-badge" style={{ padding: '6px 14px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 700, color: '#f59e0b', '--reveal-delay': '150ms' } as React.CSSProperties}>
            <Layers size={14} style={{ verticalAlign: 'middle', marginRight: '6px' }} /> 4 Battle Arenas
          </span>
          <span className="glass-panel scroll-reveal-badge" style={{ padding: '6px 14px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 700, color: '#10b981', '--reveal-delay': '225ms' } as React.CSSProperties}>
            <Shield size={14} style={{ verticalAlign: 'middle', marginRight: '6px' }} /> 200 HP Health Bar
          </span>
        </div>

        {/* Call to Action Button */}
        <div className="scroll-reveal" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', '--reveal-delay': '280ms' } as React.CSSProperties}>
          <button
            className="btn-primary"
            onClick={() => {
              soundManager.playClick();
              onPlayClick();
            }}
            data-testid="start-game-btn"
            aria-label="Start Game"
            style={{
              fontSize: 'clamp(1.1rem, 3vw, 1.35rem)',
              padding: '16px 36px',
              borderRadius: '16px',
              boxShadow: '0 0 25px rgba(56, 189, 248, 0.45)'
            }}
          >
            <Swords size={24} /> Enter Arena • Play 1v1 Duel <span className="kbd-badge">Enter</span>
          </button>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              flexWrap: 'wrap',
              justifyContent: 'center',
              color: 'var(--text-muted)',
              fontSize: '0.84rem'
            }}
          >
            <span><Keyboard size={14} style={{ verticalAlign: 'middle' }} /> Physical QWERTY Desktop Required</span>
            <span>•</span>
            <span>Instant Free Guest Play</span>
            <span>•</span>
            <span>Zero Downloads</span>
          </div>
        </div>
      </main>

      {/* 3D Champions Roster Showcase */}
      <section id="champions" style={{ marginBottom: '70px' }}>
        <div className="scroll-reveal-header" style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h2
            style={{
              fontSize: 'clamp(1.5rem, 4vw, 2.2rem)',
              fontWeight: 900,
              color: 'var(--text-heading)',
              marginBottom: '8px'
            }}
          >
            Choose Your 3D Champion
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', maxWidth: '600px', margin: '0 auto' }}>
            Four cybernetic warriors with distinct archetypes, elemental attacks, and weapon signatures.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '20px'
          }}
        >
          {CHAMPIONS.map((champ, idx) => (
            <div
              key={champ.name}
              className="glass-panel scroll-reveal-card"
              style={{
                borderRadius: '18px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                border: `1px solid ${champ.color}40`,
                background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.7) 0%, rgba(15, 23, 42, 0.95) 100%)',
                position: 'relative',
                overflow: 'hidden',
                '--reveal-delay': `${idx * 100}ms`
              } as React.CSSProperties}
            >
              <div
                style={{
                  height: '240px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '16px',
                  borderRadius: '14px',
                  background: `radial-gradient(circle at center, ${champ.color}22 0%, transparent 70%)`
                }}
              >
                <img
                  src={champ.portrait}
                  alt={`${champ.name} 3D Character Model`}
                  loading="lazy"
                  style={{
                    maxHeight: '100%',
                    maxWidth: '100%',
                    objectFit: 'contain',
                    filter: `drop-shadow(0 0 15px ${champ.color}60)`
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: champ.color, textTransform: 'uppercase', letterSpacing: '1px' }}>
                  {champ.archetype}
                </span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  {champ.codename}
                </span>
              </div>

              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-heading)', marginBottom: '4px' }}>
                {champ.name}
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
                {champ.title}
              </p>

              <div style={{ marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span>Signature Move:</span>
                  <strong style={{ color: champ.color }}>{champ.signature}</strong>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Element:</span>
                  <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{champ.element}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3D Arenas Showcase */}
      <section id="arenas" style={{ marginBottom: '70px' }}>
        <div className="scroll-reveal-header" style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h2
            style={{
              fontSize: 'clamp(1.5rem, 4vw, 2.2rem)',
              fontWeight: 900,
              color: 'var(--text-heading)',
              marginBottom: '8px'
            }}
          >
            Immersive 3D Arenas
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', maxWidth: '600px', margin: '0 auto' }}>
            Battle across high-fidelity Three.js environments complete with dynamic lighting and camera perspectives.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '20px'
          }}
        >
          {ARENAS.map((arena, idx) => (
            <div
              key={arena.name}
              className="glass-panel scroll-reveal-card"
              style={{
                borderRadius: '18px',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                '--reveal-delay': `${idx * 100}ms`
              } as React.CSSProperties}
            >
              <div style={{ height: '160px', position: 'relative', overflow: 'hidden' }}>
                <img
                  src={arena.image}
                  alt={`${arena.name} 3D Combat Arena`}
                  className="arena-card-img"
                  loading="lazy"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transition: 'transform 0.4s ease'
                  }}
                />
                <span
                  style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    padding: '4px 10px',
                    borderRadius: '8px',
                    background: 'rgba(0,0,0,0.7)',
                    backdropFilter: 'blur(4px)',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: 'var(--accent-cyan)'
                  }}
                >
                  {arena.tag}
                </span>
              </div>

              <div style={{ padding: '18px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-heading)', marginBottom: '4px' }}>
                  {arena.name}
                </h3>
                <span style={{ fontSize: '0.78rem', color: 'var(--accent-purple)', fontWeight: 700, marginBottom: '8px' }}>
                  {arena.subtitle}
                </span>
                <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', lineHeight: 1.45, marginTop: 'auto' }}>
                  {arena.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How Combat Works Section */}
      <section id="combat" style={{ marginBottom: '70px' }}>
        <h2
          className="scroll-reveal-header"
          style={{
            textAlign: 'center',
            fontSize: 'clamp(1.4rem, 4vw, 2rem)',
            fontWeight: 800,
            marginBottom: '28px',
            color: 'var(--text-heading)'
          }}
        >
          How 1v1 Typing Combat Works
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
          <div className="glass-panel scroll-reveal-card" style={{ padding: '26px 22px', textAlign: 'center', '--reveal-delay': '0ms' } as React.CSSProperties}>
            <div
              style={{
                width: '54px',
                height: '54px',
                borderRadius: '16px',
                background: 'rgba(56, 189, 248, 0.15)',
                color: 'var(--accent-cyan)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 18px'
              }}
            >
              <Keyboard size={26} />
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '8px', color: 'var(--text-heading)' }}>
              1. Type Word Tiers
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5 }}>
              Both combatants receive identical seeded word decks. Short words land fast Jabs (2 dmg),
              medium words strike Kicks (3 dmg), and long words crush with Heavy Attacks (4 dmg).
            </p>
          </div>

          <div className="glass-panel scroll-reveal-card" style={{ padding: '26px 22px', textAlign: 'center', '--reveal-delay': '120ms' } as React.CSSProperties}>
            <div
              style={{
                width: '54px',
                height: '54px',
                borderRadius: '16px',
                background: 'rgba(244, 63, 94, 0.15)',
                color: 'var(--accent-pink)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 18px'
              }}
            >
              <Zap size={26} />
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '8px', color: 'var(--text-heading)' }}>
              2. Unleash Combos & Overdrive
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5 }}>
              Maintain typing accuracy streaks (3+ words) to unlock Power Strike (+1), Weapon Finisher (+2),
              and Overdrive (+3) bonus damage. Beware: each typing error costs you -2 HP!
            </p>
          </div>

          <div className="glass-panel scroll-reveal-card" style={{ padding: '26px 22px', textAlign: 'center', '--reveal-delay': '240ms' } as React.CSSProperties}>
            <div
              style={{
                width: '54px',
                height: '54px',
                borderRadius: '16px',
                background: 'rgba(52, 211, 153, 0.15)',
                color: 'var(--accent-green)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 18px'
              }}
            >
              <Award size={26} />
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '8px', color: 'var(--text-heading)' }}>
              3. Deplete 200 HP or Win at 90s
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5 }}>
              Knock out your opponent before 90 seconds expire for an instant KO victory, or hold the health
              lead when the bell rings to climb the global Elo MMR ladder.
            </p>
          </div>
        </div>
      </section>

      {/* Competitive Comparison Matrix */}
      <section id="comparison" style={{ marginBottom: '70px' }}>
        <div className="scroll-reveal-header" style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h2
            style={{
              fontSize: 'clamp(1.5rem, 4vw, 2.2rem)',
              fontWeight: 900,
              color: 'var(--text-heading)',
              marginBottom: '8px'
            }}
          >
            Why KeyFury vs Other Typing Games?
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', maxWidth: '650px', margin: '0 auto' }}>
            Comparing KeyFury's action-combat model against traditional speed tests and retro rail-shooters.
          </p>
        </div>

        <div className="glass-panel scroll-reveal-card" style={{ borderRadius: '18px', overflowX: 'auto', padding: '8px', '--reveal-delay': '100ms' } as React.CSSProperties}>
          <table style={{ width: '100%', minWidth: '600px', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.12)' }}>
                <th style={{ padding: '16px 20px', color: 'var(--text-heading)', fontWeight: 800 }}>Feature</th>
                <th style={{ padding: '16px 20px', color: 'var(--accent-cyan)', fontWeight: 800, background: 'rgba(56, 189, 248, 0.08)' }}>
                  KeyFury
                </th>
                <th style={{ padding: '16px 20px', color: 'var(--text-muted)', fontWeight: 700 }}>Monkeytype</th>
                <th style={{ padding: '16px 20px', color: 'var(--text-muted)', fontWeight: 700 }}>TypeRacer</th>
                <th style={{ padding: '16px 20px', color: 'var(--text-muted)', fontWeight: 700 }}>Typing of the Dead</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <td style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--text-main)' }}>Visual Engine</td>
                <td style={{ padding: '14px 20px', fontWeight: 700, color: 'var(--accent-cyan)', background: 'rgba(56, 189, 248, 0.08)' }}>
                  True 3D WebGL (Three.js)
                </td>
                <td style={{ padding: '14px 20px', color: 'var(--text-muted)' }}>2D Minimalist Text</td>
                <td style={{ padding: '14px 20px', color: 'var(--text-muted)' }}>2D Car Track</td>
                <td style={{ padding: '14px 20px', color: 'var(--text-muted)' }}>Legacy 90s Pre-rendered</td>
              </tr>
              <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <td style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--text-main)' }}>Gameplay Style</td>
                <td style={{ padding: '14px 20px', fontWeight: 700, color: 'var(--accent-cyan)', background: 'rgba(56, 189, 248, 0.08)' }}>
                  Real-time 1v1 Fighting Duel
                </td>
                <td style={{ padding: '14px 20px', color: 'var(--text-muted)' }}>Solo Speed Metric</td>
                <td style={{ padding: '14px 20px', color: 'var(--text-muted)' }}>Multiplayer Race</td>
                <td style={{ padding: '14px 20px', color: 'var(--text-muted)' }}>Arcade Rail-Shooter</td>
              </tr>
              <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <td style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--text-main)' }}>Health & KO System</td>
                <td style={{ padding: '14px 20px', fontWeight: 700, color: 'var(--accent-cyan)', background: 'rgba(56, 189, 248, 0.08)' }}>
                  200 HP Health Bar + Error Penalty
                </td>
                <td style={{ padding: '14px 20px', color: 'var(--text-muted)' }}>None (Timer/Words)</td>
                <td style={{ padding: '14px 20px', color: 'var(--text-muted)' }}>None (Track completion)</td>
                <td style={{ padding: '14px 20px', color: 'var(--text-muted)' }}>Life Counter</td>
              </tr>
              <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <td style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--text-main)' }}>Matchmaking & Bots</td>
                <td style={{ padding: '14px 20px', fontWeight: 700, color: 'var(--accent-cyan)', background: 'rgba(56, 189, 248, 0.08)' }}>
                  Elo MMR + 5s Bot Fallback
                </td>
                <td style={{ padding: '14px 20px', color: 'var(--text-muted)' }}>None (Solo)</td>
                <td style={{ padding: '14px 20px', color: 'var(--text-muted)' }}>Lobby Rooms</td>
                <td style={{ padding: '14px 20px', color: 'var(--text-muted)' }}>Scripted Story AI</td>
              </tr>
              <tr>
                <td style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--text-main)' }}>Platform & Accessibility</td>
                <td style={{ padding: '14px 20px', fontWeight: 700, color: 'var(--accent-cyan)', background: 'rgba(56, 189, 248, 0.08)' }}>
                  100% Free WebGL in Browser
                </td>
                <td style={{ padding: '14px 20px', color: 'var(--text-muted)' }}>Free Browser</td>
                <td style={{ padding: '14px 20px', color: 'var(--text-muted)' }}>Free Browser</td>
                <td style={{ padding: '14px 20px', color: 'var(--text-muted)' }}>Steam / Paid Download</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Frequently Asked Questions (FAQ) Section */}
      <section id="faq" style={{ marginBottom: '70px' }}>
        <div className="scroll-reveal-header" style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h2
            style={{
              fontSize: 'clamp(1.5rem, 4vw, 2.2rem)',
              fontWeight: 900,
              color: 'var(--text-heading)',
              marginBottom: '8px'
            }}
          >
            Frequently Asked Questions
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', maxWidth: '600px', margin: '0 auto' }}>
            Everything you need to know about KeyFury's 3D typing combat engine, champions, and ranked matchmaking.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {FAQS.map((faq, idx) => {
            const isOpen = openFaqIndex === idx;
            return (
              <div
                key={faq.question}
                className="glass-panel scroll-reveal-card"
                style={{
                  borderRadius: '14px',
                  border: isOpen ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
                  overflow: 'hidden',
                  '--reveal-delay': `${idx * 60}ms`
                } as React.CSSProperties}
              >
                <button
                  onClick={() => toggleFaq(idx)}
                  style={{
                    width: '100%',
                    padding: '18px 22px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    color: 'var(--text-heading)'
                  }}
                  aria-expanded={isOpen}
                >
                  <span style={{ fontSize: '1.05rem', fontWeight: 700 }}>{faq.question}</span>
                  {isOpen ? (
                    <ChevronUp size={20} color="var(--accent-cyan)" />
                  ) : (
                    <ChevronDown size={20} color="var(--text-muted)" />
                  )}
                </button>
                {isOpen && (
                  <div
                    style={{
                      padding: '0 22px 20px',
                      color: 'var(--text-muted)',
                      fontSize: '0.92rem',
                      lineHeight: 1.6,
                      borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                      paddingTop: '14px'
                    }}
                  >
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Footer with Social Links & Privacy Guarantee */}
      <footer
        className="glass-panel scroll-reveal"
        style={{
          padding: '20px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          borderRadius: '16px',
          '--reveal-delay': '100ms'
        } as React.CSSProperties}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: '260px' }}>
          <ShieldCheck size={26} color="var(--accent-green)" style={{ flexShrink: 0 }} />
          <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
            <strong style={{ color: 'var(--text-main)' }}>Privacy Guarantee:</strong> KeyFury reads only expected match
            characters while a duel is active. It does not record or transmit keystrokes or private input outside active matches.
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
            style={{
              padding: '8px 14px',
              fontSize: '0.85rem',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: '#ef4444'
            }}
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
            style={{
              padding: '8px 14px',
              fontSize: '0.85rem',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: '#ec4899'
            }}
          >
            <Instagram size={16} /> Instagram
          </a>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;

import React, { useEffect, useRef, useCallback } from 'react';
import { soundSynth } from '../../game/audio/SoundSynth';

export interface KeyFury3DThunderSceneProps {
  durationSeconds?: number;
  onComplete?: () => void;
  isOverlay?: boolean; // if true, transparent background to overlay on 3D Three.js arena
  allowSkip?: boolean;
}

interface LightningBranch {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  alpha: number;
  width: number;
  color: string;
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

export const KeyFury3DThunderScene: React.FC<KeyFury3DThunderSceneProps> = ({
  durationSeconds = 5.0,
  onComplete,
  isOverlay = false,
  allowSkip = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const flashOverlayRef = useRef<HTMLDivElement>(null);
  const skipRef = useRef<HTMLDivElement>(null);

  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);
  const doneRef = useRef<boolean>(false);
  const thunderFiredRef = useRef<boolean>(false);
  const dischargeFiredRef = useRef<boolean>(false);

  const branchesRef = useRef<LightningBranch[]>([]);
  const sparksRef = useRef<Spark[]>([]);
  const shakeOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const flashAlphaRef = useRef<number>(0);

  // Generate fractal lightning bolt with recursive midpoint displacement
  const generateFractalBolt = useCallback((
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    roughness: number,
    depth: number,
    color = '#38bdf8',
    mainWidth = 4
  ): LightningBranch[] => {
    const segments: LightningBranch[] = [];

    const recurse = (x1: number, y1: number, x2: number, y2: number, curDepth: number, width: number) => {
      if (curDepth <= 0) {
        segments.push({ x1, y1, x2, y2, alpha: 1.0, width, color });
        return;
      }

      const dx = x2 - x1;
      const dy = y2 - y1;
      const length = Math.hypot(dx, dy) || 1;

      const normalX = -dy / length;
      const normalY = dx / length;
      const offset = (Math.random() - 0.5) * length * roughness;

      const midX = (x1 + x2) / 2 + normalX * offset;
      const midY = (y1 + y2) / 2 + normalY * offset;

      recurse(x1, y1, midX, midY, curDepth - 1, width);
      recurse(midX, midY, x2, y2, curDepth - 1, width);

      // Random lightning sub-branches
      if (Math.random() < 0.38 && curDepth >= 2) {
        const branchLength = length * (0.3 + Math.random() * 0.35);
        const branchAngle = Math.atan2(dy, dx) + (Math.random() - 0.5) * 1.3;
        const branchEndX = midX + Math.cos(branchAngle) * branchLength;
        const branchEndY = midY + Math.sin(branchAngle) * branchLength;
        recurse(midX, midY, branchEndX, branchEndY, curDepth - 1, Math.max(1, width * 0.55));
      }
    };

    recurse(startX, startY, endX, endY, depth, mainWidth);
    return segments;
  }, []);

  const spawnSparks = useCallback((x: number, y: number, count = 45) => {
    const colors = ['#ffffff', '#38bdf8', '#67e8f9', '#facc15', '#f59e0b'];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 15;
      sparksRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        alpha: 1.0,
        life: 0,
        maxLife: 0.25 + Math.random() * 0.5,
        size: 1.5 + Math.random() * 3.5,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
  }, []);

  const dismiss = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    const c = containerRef.current;
    if (c) {
      c.style.transition = 'opacity 0.35s ease, transform 0.35s ease';
      c.style.opacity = '0';
      c.style.transform = 'scale(1.08)';
    }
    setTimeout(() => {
      onComplete?.();
    }, 380);
  }, [onComplete]);

  // Fast skip key listeners (Space, Enter, Esc)
  useEffect(() => {
    if (!allowSkip) return;
    let canSkip = false;
    const minWait = isOverlay ? 500 : 1200;
    const timer = setTimeout(() => {
      canSkip = true;
      if (skipRef.current) skipRef.current.style.opacity = '0.85';
    }, minWait);

    const onKey = (e: KeyboardEvent) => {
      if (canSkip && (e.code === 'Space' || e.code === 'Enter' || e.code === 'Escape')) {
        e.preventDefault();
        dismiss();
      }
    };
    const onClick = () => {
      if (canSkip) dismiss();
    };

    window.addEventListener('keydown', onKey);
    window.addEventListener('click', onClick);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('click', onClick);
    };
  }, [allowSkip, dismiss, isOverlay]);

  // Main 60 FPS Imperative Animation Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let W = (canvas.width = window.innerWidth);
    let H = (canvas.height = window.innerHeight);

    const handleResize = () => {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    startRef.current = performance.now();
    doneRef.current = false;
    thunderFiredRef.current = false;
    dischargeFiredRef.current = false;
    branchesRef.current = [];
    sparksRef.current = [];
    shakeOffsetRef.current = { x: 0, y: 0 };
    flashAlphaRef.current = 0;

    const hero = heroRef.current;
    const container = containerRef.current;
    const flashOverlay = flashOverlayRef.current;

    // Time scaling based on duration:
    // If duration is short (e.g. 1.5s for match intro), strike happens fast at 0.15s
    // If duration is 5.0s for splash, strike happens at 0.9s
    const isShortIntro = durationSeconds <= 2.0;
    const strikeTime = isShortIntro ? 0.15 : 0.95;
    const revealTime = isShortIntro ? 0.35 : 1.35;
    const dissolveStartTime = Math.max(0.2, durationSeconds - 0.45);

    const loop = (now: number) => {
      if (doneRef.current) return;
      const elapsed = (now - startRef.current) / 1000;

      if (elapsed >= durationSeconds) {
        dismiss();
        return;
      }

      const cx = W * 0.5;
      const cy = H * 0.44;

      // ── Act 1: Pre-discharge ionization ──
      if (elapsed < strikeTime) {
        if (!dischargeFiredRef.current && elapsed > 0.05) {
          dischargeFiredRef.current = true;
          try {
            soundSynth.playElectricDischarge();
          } catch (_) {}
        }

        if (hero) {
          hero.style.opacity = '0';
          hero.style.transform = 'perspective(1000px) translateZ(-180px) rotateX(25deg) scale(0.7)';
        }

        // Ambient lightning flicker
        if (Math.random() < 0.08) {
          const fx = W * (0.3 + Math.random() * 0.4);
          branchesRef.current.push(
            ...generateFractalBolt(fx, -10, fx + (Math.random() - 0.5) * 150, H * 0.35, 0.45, 3, '#38bdf888', 2)
          );
        }
      }

      // ── Act 2: Main Thunderbolt Crash ──
      if (elapsed >= strikeTime && !thunderFiredRef.current) {
        thunderFiredRef.current = true;
        flashAlphaRef.current = 0.95;
        shakeOffsetRef.current = {
          x: (Math.random() - 0.5) * 36,
          y: (Math.random() - 0.5) * 36,
        };

        try {
          soundSynth.playThunderStrike();
        } catch (_) {}

        // Powerful multi-fork fractal thunderbolts striking the logo & 3D title
        const boltX = cx + (Math.random() - 0.5) * 40;
        branchesRef.current = generateFractalBolt(boltX, -10, cx, cy - 60, 0.42, 6, '#ffffff', 6);
        branchesRef.current.push(
          ...generateFractalBolt(boltX - 60, -10, cx - 120, cy, 0.48, 5, '#38bdf8', 3.5),
          ...generateFractalBolt(boltX + 60, -10, cx + 120, cy, 0.48, 5, '#facc15', 3.5)
        );

        spawnSparks(cx, cy - 60, 75);
        spawnSparks(cx - 100, cy, 35);
        spawnSparks(cx + 100, cy, 35);
      }

      // ── Act 3: 3D Slam-in & Materialization ──
      if (elapsed >= strikeTime && elapsed < revealTime) {
        const p = Math.min(1.0, (elapsed - strikeTime) / (revealTime - strikeTime));
        const ease = 1 - Math.pow(1 - p, 3); // easeOutCubic

        if (hero) {
          hero.style.opacity = String(ease);
          const tz = -180 + 260 * ease; // -180px -> +80px
          const rx = 25 - 35 * ease;    // 25deg -> -10deg
          const scale = 0.7 + 0.38 * ease; // 0.7 -> 1.08
          hero.style.transform = `perspective(1000px) translateZ(${tz.toFixed(1)}px) rotateX(${rx.toFixed(1)}deg) scale(${scale.toFixed(3)})`;
        }
      }

      // ── Act 4: High-Voltage 3D Resonance & Crawling Arcs ──
      if (elapsed >= revealTime && elapsed < dissolveStartTime) {
        const holdP = (elapsed - revealTime) / (dissolveStartTime - revealTime);
        const breath = Math.sin(holdP * Math.PI * 3) * 0.02;
        const rotY = Math.sin(holdP * Math.PI * 2) * 4.0;
        const rotX = 4 + Math.cos(holdP * Math.PI * 2) * 3.0;

        if (hero) {
          hero.style.opacity = '1';
          const scale = 1.0 + breath;
          const tz = 40 + breath * 200;
          hero.style.transform = `perspective(1000px) translateZ(${tz.toFixed(1)}px) rotateX(${rotX.toFixed(1)}deg) rotateY(${rotY.toFixed(1)}deg) scale(${scale.toFixed(3)})`;
        }

        // Crawling lightning arcs across the letters K-E-Y-F-U-R-Y
        if (Math.random() < 0.22) {
          const letterOffsets = [-180, -120, -60, 40, 100, 160];
          const x1 = cx + letterOffsets[Math.floor(Math.random() * letterOffsets.length)] + (Math.random() - 0.5) * 30;
          const x2 = cx + letterOffsets[Math.floor(Math.random() * letterOffsets.length)] + (Math.random() - 0.5) * 30;
          const y1 = cy + (Math.random() - 0.5) * 40;
          const y2 = cy + (Math.random() - 0.5) * 40;

          branchesRef.current.push(
            ...generateFractalBolt(x1, y1, x2, y2, 0.35, 4, Math.random() > 0.5 ? '#38bdf8' : '#facc15', 2.2)
          );
          spawnSparks(x2, y2, 10);
        }
      }

      // ── Act 5: Dissolution into Game / Embers ──
      if (elapsed >= dissolveStartTime) {
        const exitP = Math.min(1.0, (elapsed - dissolveStartTime) / (durationSeconds - dissolveStartTime));
        const ease = exitP * exitP; // easeInQuad

        if (hero) {
          hero.style.opacity = String(Math.max(0, 1 - ease * 1.2));
          const scale = 1.0 + 0.15 * ease;
          const tz = 40 + 90 * ease;
          hero.style.transform = `perspective(1000px) translateZ(${tz.toFixed(1)}px) rotateX(${(-6 * ease).toFixed(1)}deg) scale(${scale.toFixed(3)})`;
        }
      }

      // ── Canvas Rendering ──
      ctx.clearRect(0, 0, W, H);

      // Flash decay
      if (flashAlphaRef.current > 0.005) {
        if (flashOverlay) {
          flashOverlay.style.opacity = flashAlphaRef.current.toFixed(3);
        }
        flashAlphaRef.current *= 0.85;
      } else if (flashOverlay && flashOverlay.style.opacity !== '0') {
        flashOverlay.style.opacity = '0';
      }

      // Screen shake decay
      shakeOffsetRef.current.x *= 0.84;
      shakeOffsetRef.current.y *= 0.84;

      if (container) {
        if (Math.abs(shakeOffsetRef.current.x) > 0.3 || Math.abs(shakeOffsetRef.current.y) > 0.3) {
          container.style.transform = `translate(${shakeOffsetRef.current.x.toFixed(1)}px, ${shakeOffsetRef.current.y.toFixed(1)}px)`;
        } else {
          container.style.transform = '';
        }
      }

      // Draw lightning branches with neon bloom
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      for (let i = branchesRef.current.length - 1; i >= 0; i--) {
        const b = branchesRef.current[i];
        if (b.alpha < 0.02) {
          branchesRef.current.splice(i, 1);
          continue;
        }

        // Outer neon aura glow
        ctx.strokeStyle = b.color;
        ctx.globalAlpha = b.alpha * 0.7;
        ctx.lineWidth = b.width * 2.6;
        ctx.shadowBlur = 24;
        ctx.shadowColor = b.color;
        ctx.beginPath();
        ctx.moveTo(b.x1, b.y1);
        ctx.lineTo(b.x2, b.y2);
        ctx.stroke();

        // White-hot core
        ctx.strokeStyle = '#ffffff';
        ctx.globalAlpha = b.alpha;
        ctx.lineWidth = Math.max(1, b.width * 0.65);
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(b.x1, b.y1);
        ctx.lineTo(b.x2, b.y2);
        ctx.stroke();

        b.alpha *= 0.90;
      }
      ctx.restore();

      // Draw spark particles
      ctx.save();
      for (let i = sparksRef.current.length - 1; i >= 0; i--) {
        const p = sparksRef.current[i];
        p.life += 0.016;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.22; // gravity
        p.vx *= 0.96;
        p.alpha = Math.max(0, 1 - p.life / p.maxLife);

        if (p.alpha <= 0) {
          sparksRef.current.splice(i, 1);
          continue;
        }

        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.shadowBlur = 10;
        ctx.shadowColor = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, [dismiss, durationSeconds, generateFractalBolt, isOverlay, spawnSparks]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 40,
        backgroundColor: isOverlay ? 'transparent' : '#030712',
        overflow: 'hidden',
        userSelect: 'none',
        pointerEvents: 'none',
      }}
    >
      {/* Pulse keyframe animation */}
      <style>{`
        @keyframes kf3d-pulse {
          0%, 100% { opacity: 0.75; transform: scale(1); filter: blur(14px); }
          50% { opacity: 1; transform: scale(1.14); filter: blur(20px); }
        }
        @keyframes kf3d-sheen {
          0% { transform: translateX(-150%) skewX(-20deg); }
          100% { transform: translateX(250%) skewX(-20deg); }
        }
      `}</style>

      {/* Cyber Grid Background (only in standalone mode) */}
      {!isOverlay && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `
              linear-gradient(to right, rgba(56, 189, 248, 0.07) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(56, 189, 248, 0.07) 1px, transparent 1px)
            `,
            backgroundSize: '54px 54px',
            opacity: 0.7,
          }}
        />
      )}

      {/* Atmospheric Nebula Glow */}
      <div
        style={{
          position: 'absolute',
          top: '36%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '80vw',
          height: '80vw',
          maxWidth: '900px',
          maxHeight: '900px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(56,189,248,0.32) 0%, rgba(168,85,247,0.16) 45%, transparent 72%)',
          filter: 'blur(45px)',
          opacity: 0.8,
          pointerEvents: 'none',
        }}
      />

      {/* White-Hot Lightning Flash Overlay */}
      <div
        ref={flashOverlayRef}
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: '#ffffff',
          opacity: 0,
          pointerEvents: 'none',
          zIndex: 15,
          mixBlendMode: 'screen',
        }}
      />

      {/* Lightning & Particle Canvas */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 20,
          pointerEvents: 'none',
        }}
      />

      {/* 3D Motion Graphic Hero Container */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 30,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          perspective: '1200px',
          padding: '20px',
          pointerEvents: 'none',
        }}
      >
        <div
          ref={heroRef}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            transformStyle: 'preserve-3d',
            opacity: 0,
            transform: 'perspective(1000px) translateZ(-180px) rotateX(25deg) scale(0.7)',
            willChange: 'transform, opacity',
          }}
        >
          {/* Holographic 3D Logo Chassis */}
          <div
            style={{
              position: 'relative',
              width: 'clamp(100px, 14vw, 150px)',
              height: 'clamp(100px, 14vw, 150px)',
              marginBottom: '20px',
              transformStyle: 'preserve-3d',
              transform: 'translateZ(45px)',
            }}
          >
            {/* Pulsing Thunder Aura */}
            <div
              style={{
                position: 'absolute',
                inset: '-18px',
                borderRadius: '34px',
                background: 'radial-gradient(circle, rgba(56,189,248,0.85) 0%, rgba(250,204,21,0.5) 45%, transparent 75%)',
                animation: 'kf3d-pulse 1.5s infinite ease-in-out',
                filter: 'blur(16px)',
              }}
            />

            {/* Outer Metallic Beveled Frame */}
            <div
              style={{
                position: 'relative',
                width: '100%',
                height: '100%',
                borderRadius: '26px',
                padding: '4px',
                background: 'linear-gradient(135deg, #38bdf8 0%, #0f172a 50%, #facc15 100%)',
                boxShadow: '0 0 45px rgba(56,189,248,0.8), 0 20px 40px rgba(0,0,0,0.9), inset 0 0 15px rgba(255,255,255,0.4)',
                transformStyle: 'preserve-3d',
              }}
            >
              <img
                src="/logo.jpg"
                alt="KeyFury Logo"
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '22px',
                  objectFit: 'cover',
                  display: 'block',
                }}
              />

              {/* Glass Specular Glint Reflection */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '22px',
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.05) 40%, transparent 60%)',
                  pointerEvents: 'none',
                }}
              />

              {/* Golden Corner Thunderbolt */}
              <div
                style={{
                  position: 'absolute',
                  top: -12,
                  right: -12,
                  color: '#facc15',
                  filter: 'drop-shadow(0 0 12px #facc15)',
                  transform: 'translateZ(30px)',
                }}
              >
                <svg width="32" height="32" viewBox="0 0 24 24" fill="#facc15" stroke="#ffffff" strokeWidth="1.5">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
              </div>
            </div>
          </div>

          {/* 3D Volumetric Extruded Title Assembly */}
          <div
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'clamp(10px, 2.2vw, 24px)',
              transformStyle: 'preserve-3d',
              transform: 'perspective(1000px) rotateX(8deg)',
              marginBottom: '10px',
            }}
          >
            {/* Word 1: KEY (Volumetric Chrome 3D Extrusion) */}
            <div
              style={{
                position: 'relative',
                display: 'inline-block',
                transformStyle: 'preserve-3d',
              }}
            >
              {/* Base 3D Cyan Extrusion Shadow */}
              <span
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  fontFamily: "'Outfit', 'Segoe UI', system-ui, sans-serif",
                  fontSize: 'clamp(3.2rem, 8.5vw, 6.8rem)',
                  fontWeight: 950,
                  letterSpacing: '8px',
                  lineHeight: 1,
                  textTransform: 'uppercase',
                  color: '#0284c7',
                  textShadow: `
                    0 1px 0 #38bdf8,
                    0 2px 0 #0ea5e9,
                    0 3px 0 #0284c7,
                    0 4px 0 #0369a1,
                    0 5px 0 #075985,
                    0 6px 0 #0c4a6e,
                    0 7px 0 #082f49,
                    0 8px 0 #041d2e,
                    0 9px 0 #020f18,
                    0 11px 2px rgba(0,0,0,0.7),
                    0 16px 28px rgba(0,0,0,0.9),
                    0 0 35px rgba(56,189,248,0.95),
                    0 0 80px rgba(56,189,248,0.5)
                  `,
                  zIndex: 1,
                  userSelect: 'none',
                }}
              >
                KEY
              </span>
              {/* Front Metallic Platinum Beveled Face */}
              <span
                style={{
                  position: 'relative',
                  display: 'inline-block',
                  fontFamily: "'Outfit', 'Segoe UI', system-ui, sans-serif",
                  fontSize: 'clamp(3.2rem, 8.5vw, 6.8rem)',
                  fontWeight: 950,
                  letterSpacing: '8px',
                  lineHeight: 1,
                  textTransform: 'uppercase',
                  background: 'linear-gradient(180deg, #ffffff 0%, #f1f5f9 25%, #cbd5e1 55%, #94a3b8 80%, #38bdf8 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.6))',
                  zIndex: 2,
                  transform: 'translateZ(12px)',
                }}
              >
                KEY
              </span>
            </div>

            {/* Word 2: FURY (Volumetric Molten Gold 3D Extrusion) */}
            <div
              style={{
                position: 'relative',
                display: 'inline-block',
                transformStyle: 'preserve-3d',
              }}
            >
              {/* Base 3D Gold Extrusion Shadow */}
              <span
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  fontFamily: "'Outfit', 'Segoe UI', system-ui, sans-serif",
                  fontSize: 'clamp(3.2rem, 8.5vw, 6.8rem)',
                  fontWeight: 950,
                  letterSpacing: '8px',
                  lineHeight: 1,
                  textTransform: 'uppercase',
                  color: '#ca8a04',
                  textShadow: `
                    0 1px 0 #fde047,
                    0 2px 0 #facc15,
                    0 3px 0 #eab308,
                    0 4px 0 #ca8a04,
                    0 5px 0 #a16207,
                    0 6px 0 #854d0e,
                    0 7px 0 #713f12,
                    0 8px 0 #422006,
                    0 9px 0 #200d02,
                    0 11px 2px rgba(0,0,0,0.7),
                    0 16px 28px rgba(0,0,0,0.9),
                    0 0 40px rgba(250,204,21,0.95),
                    0 0 85px rgba(250,204,21,0.5)
                  `,
                  zIndex: 1,
                  userSelect: 'none',
                }}
              >
                FURY
              </span>
              {/* Front Metallic Molten Gold Beveled Face */}
              <span
                style={{
                  position: 'relative',
                  display: 'inline-block',
                  fontFamily: "'Outfit', 'Segoe UI', system-ui, sans-serif",
                  fontSize: 'clamp(3.2rem, 8.5vw, 6.8rem)',
                  fontWeight: 950,
                  letterSpacing: '8px',
                  lineHeight: 1,
                  textTransform: 'uppercase',
                  background: 'linear-gradient(180deg, #ffffff 0%, #fef08a 25%, #facc15 60%, #f59e0b 80%, #ea580c 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.6))',
                  zIndex: 2,
                  transform: 'translateZ(12px)',
                }}
              >
                FURY
              </span>
            </div>
          </div>

          {/* Subtitle */}
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 'clamp(0.85rem, 2vw, 1.35rem)',
              fontWeight: 800,
              letterSpacing: '6px',
              color: '#cbd5e1',
              marginTop: '8px',
              textTransform: 'uppercase',
              textShadow: '0 0 18px rgba(148,163,184,0.7)',
              transform: 'translateZ(30px)',
            }}
          >
            KEYBOARD STICKMAN WARRIOR
          </div>

          {/* Combat Pill Badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              marginTop: '18px',
              padding: '7px 22px',
              borderRadius: '999px',
              background: 'linear-gradient(135deg, rgba(56,189,248,0.2) 0%, rgba(168,85,247,0.2) 100%)',
              border: '1.5px solid rgba(56,189,248,0.7)',
              boxShadow: '0 0 30px rgba(56,189,248,0.4), inset 0 0 12px rgba(56,189,248,0.2)',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 'clamp(0.72rem, 1.2vw, 0.92rem)',
              fontWeight: 800,
              letterSpacing: '3px',
              color: '#38bdf8',
              transform: 'translateZ(45px)',
            }}
          >
            <span style={{ color: '#facc15' }}>⚡</span>
            <span>1V1 COMPETITIVE TYPING COMBAT</span>
            <span style={{ color: '#facc15' }}>⚡</span>
          </div>
        </div>
      </div>

      {/* Skip Hint */}
      {allowSkip && (
        <div
          ref={skipRef}
          style={{
            position: 'absolute',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 35,
            opacity: 0,
            transition: 'opacity 0.4s ease',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.78rem',
            fontWeight: 700,
            letterSpacing: '2px',
            color: '#64748b',
            pointerEvents: 'none',
          }}
        >
          ⚡ TAP OR PRESS [SPACE] TO ENTER
        </div>
      )}
    </div>
  );
};

export default KeyFury3DThunderScene;

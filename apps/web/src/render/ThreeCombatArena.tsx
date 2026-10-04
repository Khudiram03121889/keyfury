import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Character3DFighter, CharacterId, CHARACTER_PROFILES, resolveCharacterId } from '../game/character/Character3DController';
import { getSavedSelectedCameraAngle, saveSelectedCameraAngle } from '../lib/supabase';
import { KeyFury3DThunderScene } from '../components/splash/KeyFury3DThunderScene';

export type ArenaId = 'cyber_rooftop' | 'celestial_void' | 'volcanic_caldera' | 'highland_sanctuary';

export function resolveArenaId(rawId?: string): ArenaId {
  const norm = (rawId || '').toLowerCase();
  if (norm.includes('celestial') || norm.includes('void')) return 'celestial_void';
  if (norm.includes('volcan') || norm.includes('caldera')) return 'volcanic_caldera';
  if (norm.includes('highland') || norm.includes('sanctuary')) return 'highland_sanctuary';
  return 'cyber_rooftop';
}

export interface ArenaDefinition {
  id: ArenaId;
  name: string;
  subtitle: string;
  glb: string;
  camPos: [number, number, number];
  camLookAt: [number, number, number];
  camFov: number;
  fighterFloorY: number;
  skyColor: number;
  ambientIntensity: number;
  keyIntensity: number;
  keyPos: [number, number, number];
  rimColor: number;
  rimIntensity: number;
  rimPos: [number, number, number];
  themeColor: string;
  entranceFlair: string;
}

export const ARENA_DEFINITIONS: Record<ArenaId, ArenaDefinition> = {
  cyber_rooftop: {
    id: 'cyber_rooftop',
    name: 'Cyber Neon Rooftop',
    subtitle: 'Neo-Kyoto Skyway // High Voltage Midnight',
    glb: '/assets/3d/KeyFury_3D_CyberRooftop_True3D.glb',
    camPos: [0, 2.33, 20.0],
    camLookAt: [0, 2.205, 0],
    camFov: 28.4,
    fighterFloorY: 0.205,
    skyColor: 0x050b18,
    ambientIntensity: 0.65,
    keyIntensity: 1.15,
    keyPos: [-4, 7, 7],
    rimColor: 0x00f0ff,
    rimIntensity: 0.70,
    rimPos: [5, 6, -5],
    themeColor: '#00e5ff',
    entranceFlair: 'Neon Lightning Drop-In',
  },
  celestial_void: {
    id: 'celestial_void',
    name: 'Celestial Void Shrine',
    subtitle: 'Astral Nebula Rift // Dimensional Altar',
    glb: '/assets/3d/KeyFury_3D_CelestialVoid_True3D.glb',
    camPos: [0, 2.88, 20.0],
    camLookAt: [0, 2.55, 0],
    camFov: 28.4,
    fighterFloorY: 0.405,
    skyColor: 0x080414,
    ambientIntensity: 0.70,
    keyIntensity: 1.15,
    keyPos: [-4, 7, 7],
    rimColor: 0xb5179e,
    rimIntensity: 0.70,
    rimPos: [5, 6, -5],
    themeColor: '#a855f7',
    entranceFlair: 'Astral Rift Phase-In',
  },
  volcanic_caldera: {
    id: 'volcanic_caldera',
    name: 'Volcanic Caldera Core',
    subtitle: 'Mount Fury Magma Chamber // Molten Spires',
    glb: '/assets/3d/KeyFury_3D_VolcanicCaldera_True3D.glb',
    camPos: [0, 2.23, 20.0],
    camLookAt: [0, 1.25, 0],
    camFov: 28.4,
    fighterFloorY: 0.025,
    skyColor: 0x140502,
    ambientIntensity: 0.70,
    keyIntensity: 1.25,
    keyPos: [-4, 7, 7],
    rimColor: 0xff4500,
    rimIntensity: 0.80,
    rimPos: [5, 6, -5],
    themeColor: '#ff5722',
    entranceFlair: 'Magma Plume Eruption',
  },
  highland_sanctuary: {
    id: 'highland_sanctuary',
    name: 'Highland Sanctuary Plateau',
    subtitle: 'Alpine Runic Terrace // Azure Horizon',
    glb: '/assets/3d/KeyFury_3D_HighlandSanctuary.glb',
    camPos: [0, 2.23, 20.0],
    camLookAt: [0, 1.25, 0],
    camFov: 28.4,
    fighterFloorY: 0.027,
    skyColor: 0x5b9bd5,
    ambientIntensity: 0.70,
    keyIntensity: 1.20,
    keyPos: [6, 12, 14],
    rimColor: 0x38bdf8,
    rimIntensity: 0.55,
    rimPos: [5, 6, -5],
    themeColor: '#38bdf8',
    entranceFlair: 'Mountain Ridge Sprint',
  },
};

export type CameraAngle = 'front' | 'back' | 'left' | 'right' | 'spider_cam' | 'focused_60' | 'wide_front';

export type CameraPreset =
  | CameraAngle
  | 'arena'
  | 'dynamic'
  | 'over_shoulder'
  | 'right_side'
  | 'low_angle'
  | 'isometric'
  | 'wide'
  | 'overview'
  | 'zoomed_out'
  | 'cinematic_wide';

export interface CameraViewOption {
  id: CameraAngle;
  label: string;
  hotkey: string;
  icon: string;
  angleDeg: string;
}

export function getCameraTransformForAngle(arenaId: ArenaId | string, angle: CameraAngle) {
  const resolved = resolveArenaId(arenaId);
  const def = ARENA_DEFINITIONS[resolved];
  const floorY = def?.fighterFloorY ?? 0.2;
  const lookAtX = def?.camLookAt?.[0] ?? 0;
  const lookAtZ = def?.camLookAt?.[2] ?? 0;

  switch (angle) {
    case 'front':
      // a. Front-facing view, zoomed in on the central combat area (25° elevation)
      return {
        pos: [lookAtX, floorY + 1.45, 7.8] as [number, number, number],
        lookAt: [lookAtX, floorY + 0.95, lookAtZ] as [number, number, number],
        fov: 31.0,
      };

    case 'back':
      // b. Back-facing view, elevated reverse angle looking down at fighters (40° declination)
      return {
        pos: [lookAtX, floorY + 3.2, -7.2] as [number, number, number],
        lookAt: [lookAtX, floorY + 0.95, lookAtZ] as [number, number, number],
        fov: 34.0,
      };

    case 'left':
      // c. Left-side view: 45° elevated flank looking down directly into the duel
      return {
        pos: [-5.0, floorY + 2.8, 5.0] as [number, number, number],
        lookAt: [0.2, floorY + 0.95, 0] as [number, number, number],
        fov: 36.0,
      };

    case 'right':
      // d. Right-side view: 45° elevated flank looking down directly into the duel
      return {
        pos: [5.0, floorY + 2.8, 5.0] as [number, number, number],
        lookAt: [-0.2, floorY + 0.95, 0] as [number, number, number],
        fov: 36.0,
      };

    case 'spider_cam':
      // e. High-level Spider Cam (50° cable cam swooping from above)
      return {
        pos: [-2.0, floorY + 6.5, 5.8] as [number, number, number],
        lookAt: [0, floorY + 0.8, 0] as [number, number, number],
        fov: 42.0,
      };

    case 'focused_60':
      // f. Focused 60° tactical camera (steep overhead view of entire arena perimeter + fighters)
      return {
        pos: [0, floorY + 8.0, 5.0] as [number, number, number],
        lookAt: [0, floorY + 0.7, 0] as [number, number, number],
        fov: 40.0,
      };

    case 'wide_front':
      // g. Zoomed-out front view revealing entire arena environment, horizon, and surroundings
      return {
        pos: [lookAtX, floorY + 2.5, 16.2] as [number, number, number],
        lookAt: [lookAtX, floorY + 1.1, lookAtZ] as [number, number, number],
        fov: 34.0,
      };
  }
}

export function resolveCameraPreset(input?: string): CameraAngle {
  if (!input) return 'front';
  const norm = input.toLowerCase().trim();
  if (norm === 'front' || norm === 'arena' || norm === 'dynamic') return 'front';
  if (norm === 'left' || norm === 'over_shoulder') return 'left';
  if (norm === 'right' || norm === 'right_side') return 'right';
  if (norm === 'spider_cam' || norm === 'spider' || norm === 'low_angle') return 'spider_cam';
  if (norm === 'focused_60' || norm === 'top_60' || norm === 'isometric') return 'focused_60';
  if (norm === 'back' || norm === 'reverse') return 'back';
  if (norm === 'wide_front' || norm === 'wide' || norm === 'overview' || norm === 'zoomed_out' || norm === 'cinematic_wide') return 'wide_front';
  return 'front';
}

export interface CameraPresetConfig {
  id: CameraPreset;
  aliases?: CameraPreset[];
  label: string;
  icon: string;
  hotkey: string;
  angleDeg: string;
  getTransform: (arenaDef: ArenaDefinition) => {
    pos: [number, number, number];
    lookAt: [number, number, number];
    fov: number;
  };
}

export const CAMERA_PRESETS: CameraPresetConfig[] = [
  {
    id: 'front',
    aliases: ['arena', 'dynamic'],
    label: 'Front Zoom',
    icon: '🎥',
    hotkey: 'F',
    angleDeg: '25° Front Focus',
    getTransform: (arenaDef) => getCameraTransformForAngle(arenaDef.id, 'front'),
  },
  {
    id: 'left',
    aliases: ['over_shoulder'],
    label: 'Left 45°',
    icon: '◀',
    hotkey: 'L',
    angleDeg: '45° Left Flank',
    getTransform: (arenaDef) => getCameraTransformForAngle(arenaDef.id, 'left'),
  },
  {
    id: 'right',
    aliases: ['right_side'],
    label: 'Right 45°',
    icon: '▶',
    hotkey: 'R',
    angleDeg: '45° Right Flank',
    getTransform: (arenaDef) => getCameraTransformForAngle(arenaDef.id, 'right'),
  },
  {
    id: 'spider_cam',
    aliases: ['low_angle'],
    label: 'Spider Cam',
    icon: '🕷️',
    hotkey: 'S',
    angleDeg: '50° Cable Cam',
    getTransform: (arenaDef) => getCameraTransformForAngle(arenaDef.id, 'spider_cam'),
  },
  {
    id: 'focused_60',
    aliases: ['isometric'],
    label: 'Top 60°',
    icon: '📐',
    hotkey: 'T',
    angleDeg: '60° Tactical Cam',
    getTransform: (arenaDef) => getCameraTransformForAngle(arenaDef.id, 'focused_60'),
  },
  {
    id: 'back',
    aliases: [],
    label: 'Back View',
    icon: '🔄',
    hotkey: 'B',
    angleDeg: '40° Reverse Cam',
    getTransform: (arenaDef) => getCameraTransformForAngle(arenaDef.id, 'back'),
  },
  {
    id: 'wide_front',
    aliases: ['wide', 'overview', 'zoomed_out', 'cinematic_wide'],
    label: 'Wide Front',
    icon: '🌐',
    hotkey: 'W',
    angleDeg: 'Zoomed Out Overview',
    getTransform: (arenaDef) => getCameraTransformForAngle(arenaDef.id, 'wide_front'),
  },
];

export function findCameraPreset(id: CameraPreset | string): CameraPresetConfig | undefined {
  const norm = (id || '').toLowerCase().trim();
  return CAMERA_PRESETS.find((p) => p.id === norm || (p.aliases && p.aliases.includes(norm as any)));
}

export const CAMERA_VIEWS: CameraViewOption[] = CAMERA_PRESETS.map((p) => ({
  id: p.id as CameraAngle,
  label: p.label,
  hotkey: p.hotkey,
  icon: p.icon,
  angleDeg: p.angleDeg,
}));

export type IntroAct = 'stage' | 'p1' | 'p2' | 'standoff' | 'combat';

export interface FighterSpotlightData {
  name: string;
  title: string;
  weapon: string;
  color: string;
  side: 'left' | 'right';
}

// Fluid easing functions for opening sequence transitions & cinematic cameras
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export function getIntroActForTime(t: number): IntroAct {
  if (t < 1.5) return 'stage';
  if (t < 3.5) return 'p1';
  if (t < 5.5) return 'p2';
  if (t < 7.5) return 'standoff';
  return 'combat';
}

export function getCountdownForTime(t: number): '3' | '2' | '1' | 'FIGHT!' | null {
  if (t < 5.5 || t >= 7.5) return null;
  if (t < 6.2) return '3';
  if (t < 6.9) return '2';
  if (t < 7.3) return '1';
  return 'FIGHT!';
}

export function getSpotlightBannerForTime(
  t: number,
  p1CharId: string,
  p2CharId: string,
  isBotMatch: boolean = false
): FighterSpotlightData | null {
  const act = getIntroActForTime(t);
  if (act === 'p1') {
    const p1Id = resolveCharacterId(p1CharId);
    const prof = CHARACTER_PROFILES[p1Id];
    return {
      name: prof.name,
      title: prof.title,
      weapon: prof.weapon,
      color: prof.glowColor,
      side: 'left',
    };
  }
  if (act === 'p2') {
    const p2Id = resolveCharacterId(p2CharId);
    const prof = CHARACTER_PROFILES[p2Id];
    return {
      name: isBotMatch ? `${prof.name} (AI)` : prof.name,
      title: prof.title,
      weapon: prof.weapon,
      color: prof.glowColor,
      side: 'right',
    };
  }
  return null;
}

export function getFighterEntranceProgress(t: number, side: 'left' | 'right'): number {
  if (side === 'left') {
    // Act 2: Player 1 arrives between 1.5s and 3.0s
    if (t < 1.5) return 0;
    if (t >= 3.0) return 1.0;
    return (t - 1.5) / 1.5;
  } else {
    // Act 3: Player 2 arrives between 3.5s and 4.9s
    if (t < 3.5) return 0;
    if (t >= 4.9) return 1.0;
    return (t - 3.5) / 1.4;
  }
}

export interface ThreeCombatArenaRef {
  triggerAttack: (side: 'left' | 'right', tier: 'jab' | 'kick' | 'heavy' | 'weapon') => void;
  triggerHit: (side: 'left' | 'right', severity: 'light' | 'heavy') => void;
  triggerKeystroke: (side: 'left' | 'right') => void;
  triggerKnockout: (loserSide: 'left' | 'right') => void;
  triggerVictory: (winnerSide: 'left' | 'right') => void;
  triggerScreenShake?: (intensity?: number) => void;
  cycleCameraPreset: () => void;
  setCameraPreset: (preset: CameraPreset) => void;
  skipIntro: () => void;
  setCharacterSkins?: (p1Id?: string, p2Id?: string) => void;
  setPromptWord?: (word: string, typedIndex?: number, isError?: boolean) => void;
  getP1TilePrompt?: () => TilePromptDisplay | null;
  getP2TilePrompt?: () => TilePromptDisplay | null;
}

/**
 * TilePromptDisplay: High-performance 3D on-tile prompt word renderer.
 * Positioned on the arena platform floor tile directly beneath the character's feet/legs.
 * Keeps legs 100% visible while presenting a sleek holographic typing target.
 */
export class TilePromptDisplay {
  public mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private texture: THREE.Texture;
  private lastRenderKey: string = '';
  private planeGeo: THREE.PlaneGeometry;
  private mat: THREE.MeshBasicMaterial;

  constructor(side: 'left' | 'right') {
    if (typeof document !== 'undefined') {
      this.canvas = document.createElement('canvas');
      this.canvas.width = 512;
      this.canvas.height = 128;
      this.ctx = this.canvas.getContext('2d');
      const canvasTex = new THREE.CanvasTexture(this.canvas);
      canvasTex.minFilter = THREE.LinearFilter;
      canvasTex.magFilter = THREE.LinearFilter;
      this.texture = canvasTex;
    } else {
      this.canvas = null;
      this.ctx = null;
      this.texture = new THREE.Texture();
    }

    this.planeGeo = new THREE.PlaneGeometry(1.6, 0.42);
    this.mat = new THREE.MeshBasicMaterial({
      map: this.texture,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    this.mesh = new THREE.Mesh(this.planeGeo, this.mat);
    this.mesh.name = `TilePrompt_${side}`;
    this.mesh.renderOrder = 10;
    this.mesh.rotation.x = -Math.PI / 2.3;
  }

  public update(word: string, typedIndex: number, isError: boolean, themeColor: string = '#00f0ff') {
    const displayWord = word ? word.toUpperCase() : '';
    const safeTyped = Math.max(0, Math.min(typedIndex, displayWord.length));
    const renderKey = `${displayWord}_${safeTyped}_${isError}_${themeColor}`;
    if (renderKey === this.lastRenderKey) return;
    this.lastRenderKey = renderKey;

    // Dynamic width scaling based on word length
    const targetWidth = Math.max(1.35, Math.min(2.8, displayWord.length * 0.16 + 0.5));
    if (Math.abs(this.planeGeo.parameters.width - targetWidth) > 0.05) {
      this.planeGeo.dispose();
      this.planeGeo = new THREE.PlaneGeometry(targetWidth, 0.42);
      this.mesh.geometry = this.planeGeo;
    }

    const ctx = this.ctx;
    if (!ctx) return;

    ctx.clearRect(0, 0, 512, 128);

    if (!displayWord) {
      this.texture.needsUpdate = true;
      return;
    }

    const pad = 12;
    const w = 512 - pad * 2;
    const h = 128 - pad * 2;
    const r = 24;

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(pad, pad, w, h, r);
    ctx.fillStyle = isError ? 'rgba(40, 10, 15, 0.88)' : 'rgba(10, 15, 29, 0.85)';
    ctx.fill();

    // Border with neon glow
    ctx.lineWidth = isError ? 4 : 3;
    ctx.strokeStyle = isError ? '#ef4444' : (themeColor || '#00f0ff');
    ctx.shadowColor = isError ? '#ef4444' : (themeColor || '#00f0ff');
    ctx.shadowBlur = isError ? 18 : 12;
    ctx.stroke();

    // Tech cyber corner brackets
    ctx.shadowBlur = 0;
    ctx.strokeStyle = isError ? '#f87171' : '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(pad + 8, pad + 16);
    ctx.lineTo(pad + 8, pad + 8);
    ctx.lineTo(pad + 16, pad + 8);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(pad + w - 16, pad + 8);
    ctx.lineTo(pad + w - 8, pad + 8);
    ctx.lineTo(pad + w - 8, pad + 16);
    ctx.stroke();

    // Draw characters with distinct past / current / future states
    const fontSize = displayWord.length > 9 ? 34 : (displayWord.length > 6 ? 38 : 42);
    ctx.font = `900 ${fontSize}px "JetBrains Mono", "Courier New", monospace`;
    ctx.textBaseline = 'middle';

    let totalTextWidth = 0;
    const charWidths: number[] = [];
    for (let i = 0; i < displayWord.length; i++) {
      const cw = ctx.measureText(displayWord[i]).width;
      charWidths.push(cw);
      totalTextWidth += cw;
    }

    const spacing = 4;
    totalTextWidth += (displayWord.length - 1) * spacing;
    let startX = (512 - totalTextWidth) / 2;
    const centerY = 64;

    for (let i = 0; i < displayWord.length; i++) {
      const char = displayWord[i];
      const cw = charWidths[i];

      if (i < safeTyped) {
        ctx.fillStyle = '#4ade80';
        ctx.shadowColor = '#4ade80';
        ctx.shadowBlur = 8;
        ctx.fillText(char, startX, centerY);
      } else if (i === safeTyped) {
        if (isError) {
          ctx.shadowBlur = 16;
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(startX - 2, centerY - fontSize * 0.55, cw + 4, fontSize * 1.1);
          ctx.fillStyle = '#ffffff';
          ctx.fillText(char, startX, centerY);
        } else {
          ctx.fillStyle = '#fbbf24';
          ctx.shadowColor = '#f59e0b';
          ctx.shadowBlur = 14;
          ctx.fillText(char, startX, centerY);

          ctx.fillStyle = '#fbbf24';
          ctx.fillRect(startX, centerY + fontSize * 0.52, cw, 4);
        }
      } else {
        ctx.fillStyle = '#e2e8f0';
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.fillText(char, startX, centerY);
      }

      startX += cw + spacing;
    }

    ctx.restore();
    this.texture.needsUpdate = true;
  }

  public setPositionAndVisibility(
    x: number,
    lowestY: number,
    z: number,
    visible: boolean
  ) {
    this.mesh.visible = visible;
    if (!visible) return;
    this.mesh.position.set(x, lowestY + 0.02, z + 0.42);
    this.mesh.rotation.x = -Math.PI / 2.3;
  }

  public dispose() {
    this.planeGeo.dispose();
    this.mat.dispose();
    this.texture.dispose();
  }
}

interface HitParticleData {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  r: number;
  g: number;
  b: number;
  age: number;
  maxAge: number;
}

interface HitShockwaveData {
  active: boolean;
  mesh: THREE.Mesh;
  material: THREE.MeshBasicMaterial;
  age: number;
  maxAge: number;
  targetScale: number;
}

const MAX_HIT_PARTICLES = 64;
const MAX_SHOCKWAVES = 4;

interface Props {
  arenaId?: string;
  p1CharId?: string;
  p2CharId?: string;
  isBotMatch?: boolean;
  onIntroComplete?: () => void;
  currentWord?: string;
  typedCharIndex?: number;
  isErrorFlash?: boolean;
  p2Word?: string;
  p2CharIndex?: number;
  initialCameraAngle?: CameraAngle | CameraPreset;
}

export const ThreeCombatArena = forwardRef<ThreeCombatArenaRef, Props>(({
  arenaId = 'cyber_rooftop',
  p1CharId = 'ronin',
  p2CharId = 'shinobi',
  isBotMatch = false,
  initialCameraAngle,
  onIntroComplete,
  currentWord,
  typedCharIndex,
  isErrorFlash,
  p2Word,
  p2CharIndex,
}, ref) => {
  const resolvedArenaId: ArenaId = resolveArenaId(arenaId);
  const resolvedP1 = resolveCharacterId(p1CharId);
  const resolvedP2 = resolveCharacterId(p2CharId);
  const containerRef = useRef<HTMLDivElement>(null);

  // Scene instances
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const clockRef = useRef<THREE.Clock>(new THREE.Clock());

  // Lighting
  const ambLightRef = useRef<THREE.AmbientLight | null>(null);
  const keyLightRef = useRef<THREE.DirectionalLight | null>(null);
  const rimLightRef = useRef<THREE.DirectionalLight | null>(null);

  // Entities
  const p1FighterRef = useRef<Character3DFighter | null>(null);
  const p2FighterRef = useRef<Character3DFighter | null>(null);
  const arenaModelRef = useRef<THREE.Object3D | null>(null);

  // On-tile prompt word displays directly beneath character legs
  const p1TilePromptRef = useRef<TilePromptDisplay | null>(null);
  const p2TilePromptRef = useRef<TilePromptDisplay | null>(null);

  const currentWordRef = useRef<string>(currentWord || '');
  const typedCharIndexRef = useRef<number>(typedCharIndex || 0);
  const isErrorFlashRef = useRef<boolean>(isErrorFlash || false);
  const p2WordRef = useRef<string>(p2Word || '');
  const p2CharIndexRef = useRef<number>(p2CharIndex || 0);

  useEffect(() => {
    currentWordRef.current = currentWord || '';
  }, [currentWord]);

  useEffect(() => {
    typedCharIndexRef.current = typedCharIndex || 0;
  }, [typedCharIndex]);

  useEffect(() => {
    isErrorFlashRef.current = isErrorFlash || false;
  }, [isErrorFlash]);

  useEffect(() => {
    p2WordRef.current = p2Word || '';
  }, [p2Word]);

  useEffect(() => {
    p2CharIndexRef.current = p2CharIndex || 0;
  }, [p2CharIndex]);

  // Camera animation & Showcase state
  const introTimerRef = useRef<number>(0);
  const [introAct, setIntroAct] = useState<IntroAct>('stage');
  const [activeFighterBanner, setActiveFighterBanner] = useState<FighterSpotlightData | null>(null);
  const [countdownNum, setCountdownNum] = useState<'3' | '2' | '1' | 'FIGHT!' | null>(null);
  const [isIntroComplete, setIsIntroComplete] = useState<boolean>(false);
  const [isIntroSkipped, setIsIntroSkipped] = useState<boolean>(false);
  const isIntroCompleteRef = useRef<boolean>(false);
  const hasLoggedEntranceStart = useRef<boolean>(false);
  const hasLoggedCountdownStart = useRef<boolean>(false);

  // Camera Presets & Interactive Switcher
  const initialIndex = (() => {
    const angleToUse = initialCameraAngle || 'front';
    const resolved = resolveCameraPreset(angleToUse);
    const idx = CAMERA_PRESETS.findIndex((p) => p.id === resolved || p.id === angleToUse || p.aliases?.includes(angleToUse as any));
    return idx >= 0 ? idx : 0;
  })();
  const [activePresetIndex, setActivePresetIndex] = useState<number>(initialIndex);
  const activePresetIndexRef = useRef<number>(initialIndex);
  const targetCamPos = useRef<THREE.Vector3>(new THREE.Vector3());
  const targetCamLookAt = useRef<THREE.Vector3>(new THREE.Vector3());
  const targetCamFov = useRef<number>(28.4);
  const currentCamLookAt = useRef<THREE.Vector3>(new THREE.Vector3());
  const dynamicTrackPos = useRef<THREE.Vector3>(new THREE.Vector3());
  const dynamicTrackLookAt = useRef<THREE.Vector3>(new THREE.Vector3());

  // Screen shake
  const shakeIntensityRef = useRef<number>(0);

  // Opening Sequence 3D Transition & Smooth Cinematic Refs
  const openingTransitionRef = useRef<HTMLDivElement>(null);
  const openingCardRef = useRef<HTMLDivElement>(null);
  const screenVeilRef = useRef<HTMLDivElement>(null);
  const arrivalFlareRef = useRef<HTMLDivElement>(null);

  // Visible physical interaction: Hit feedback particle & shockwave engine
  const hitParticlesRef = useRef<HitParticleData[]>([]);
  const hitParticlesGeoRef = useRef<THREE.BufferGeometry | null>(null);
  const hitShockwavesRef = useRef<HitShockwaveData[]>([]);

  const spawnHitFeedback = useCallback((side: 'left' | 'right', severity: 'light' | 'heavy') => {
    const defender = side === 'left' ? p1FighterRef.current : p2FighterRef.current;
    const attacker = side === 'left' ? p2FighterRef.current : p1FighterRef.current;
    if (!defender) return;

    // Contact point at defender's front surface facing incoming strike
    const defX = defender.group.position.x;
    const defY = (defender.baseY ?? 0) + 1.15;
    const defZ = defender.group.position.z;
    const contactX = defX + defender.facingSign * 0.28;
    const contactY = defY;
    const contactZ = defZ;

    const themeHex = attacker?.profile?.primaryColor ?? (severity === 'heavy' ? 0xff3b30 : 0xffcc00);
    const themeColor = new THREE.Color(themeHex);

    // 1. Directional Particle Burst
    const count = severity === 'heavy' ? 28 : 16;
    const particles = hitParticlesRef.current;
    const attackerFacing = attacker ? attacker.facingSign : (side === 'left' ? -1 : 1);

    let spawned = 0;
    for (let i = 0; i < particles.length && spawned < count; i++) {
      const p = particles[i];
      if (p.active) continue;

      p.active = true;
      p.x = contactX + (Math.random() - 0.5) * 0.08;
      p.y = contactY + (Math.random() - 0.5) * 0.08;
      p.z = contactZ + (Math.random() - 0.5) * 0.08;

      const speed = severity === 'heavy' ? (4.0 + Math.random() * 4.5) : (2.5 + Math.random() * 3.0);
      const angle = (Math.random() - 0.5) * 1.5;
      p.vx = attackerFacing * Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed + (Math.random() * 1.6);
      p.vz = (Math.random() - 0.5) * 2.0;

      if (Math.random() < 0.35) {
        p.r = 1.0;
        p.g = 1.0;
        p.b = 1.0;
      } else {
        p.r = themeColor.r;
        p.g = themeColor.g;
        p.b = themeColor.b;
      }

      p.age = 0;
      p.maxAge = severity === 'heavy' ? 0.35 : 0.22;
      spawned++;
    }

    // 2. Expanding Additive Shockwave Flash
    const shockwaves = hitShockwavesRef.current;
    for (let i = 0; i < shockwaves.length; i++) {
      const sw = shockwaves[i];
      if (sw.active) continue;

      sw.active = true;
      sw.mesh.visible = true;
      sw.mesh.position.set(contactX, contactY, contactZ);
      sw.mesh.rotation.y = defender.facingSign > 0 ? -Math.PI / 6 : Math.PI / 6;
      sw.mesh.scale.setScalar(0.25);
      sw.material.color.copy(themeColor);
      sw.material.opacity = 0.95;
      sw.age = 0;
      sw.maxAge = severity === 'heavy' ? 0.22 : 0.16;
      sw.targetScale = severity === 'heavy' ? 1.6 : 1.1;
      break;
    }
  }, []);

  const arenaDef = ARENA_DEFINITIONS[resolvedArenaId];

  // Apply Camera Preset Transform
  const applyPresetTransform = useCallback((presetIdx: number) => {
    const preset = CAMERA_PRESETS[presetIdx % CAMERA_PRESETS.length];
    const t = preset.getTransform(arenaDef);

    // ponytail: Dynamic portrait compensation when aspect < 1.0 to fit both fighters
    const container = containerRef.current;
    const aspect = container && container.clientHeight > 0
      ? container.clientWidth / container.clientHeight
      : (typeof window !== 'undefined' ? window.innerWidth / Math.max(window.innerHeight, 1) : 1.77);

    if (aspect < 1.0) {
      // In portrait mode, pull camera back along Z and elevate Y slightly
      const baseDist = Math.hypot(t.pos[0] - t.lookAt[0], t.pos[1] - t.lookAt[1], t.pos[2] - t.lookAt[2]);
      const portraitZDist = Math.max(baseDist * 1.35, 11.2);

      // Calculate vertical FOV required to maintain a horizontal visible width of ~6.8m
      const targetHWidth = 6.8;
      const requiredHalfVFovRad = Math.atan(targetHWidth / (2 * portraitZDist * aspect));
      const requiredVFovDeg = (requiredHalfVFovRad * 2 * 180) / Math.PI;
      const clampedFov = Math.min(Math.max(requiredVFovDeg, 34), 52);

      targetCamPos.current.set(t.pos[0] * 0.7, t.pos[1] + 0.75, portraitZDist);
      targetCamLookAt.current.set(t.lookAt[0], t.lookAt[1] + 0.25, t.lookAt[2]);
      targetCamFov.current = clampedFov;
    } else {
      targetCamPos.current.set(t.pos[0], t.pos[1], t.pos[2]);
      targetCamLookAt.current.set(t.lookAt[0], t.lookAt[1], t.lookAt[2]);
      targetCamFov.current = t.fov;
    }
  }, [arenaDef]);

  const applyPresetTransformRef = useRef(applyPresetTransform);
  applyPresetTransformRef.current = applyPresetTransform;

  const lastAppliedInitialAngleRef = useRef<string | undefined>(undefined);

  const cycleCameraPreset = useCallback(() => {
    const next = (activePresetIndexRef.current + 1) % CAMERA_PRESETS.length;
    activePresetIndexRef.current = next;
    setActivePresetIndex(next);
    applyPresetTransform(next);
    lastAppliedInitialAngleRef.current = CAMERA_PRESETS[next].id;
    saveSelectedCameraAngle(CAMERA_PRESETS[next].id);
  }, [applyPresetTransform]);

  const cycleCameraPresetRef = useRef(cycleCameraPreset);
  cycleCameraPresetRef.current = cycleCameraPreset;

  const setCameraPresetById = useCallback((presetId: CameraPreset) => {
    const targetId = resolveCameraPreset(presetId);
    const idx = CAMERA_PRESETS.findIndex((p) => p.id === targetId || p.id === presetId || p.aliases?.includes(presetId));
    if (idx >= 0) {
      activePresetIndexRef.current = idx;
      setActivePresetIndex(idx);
      applyPresetTransform(idx);
      lastAppliedInitialAngleRef.current = CAMERA_PRESETS[idx].id;
      saveSelectedCameraAngle(CAMERA_PRESETS[idx].id);
    }
  }, [applyPresetTransform]);

  const setCameraPresetByIdRef = useRef(setCameraPresetById);
  setCameraPresetByIdRef.current = setCameraPresetById;

  useEffect(() => {
    if (initialCameraAngle && initialCameraAngle !== lastAppliedInitialAngleRef.current) {
      lastAppliedInitialAngleRef.current = initialCameraAngle;
      setCameraPresetById(initialCameraAngle);
    }
  }, [initialCameraAngle, setCameraPresetById]);

  const onIntroCompleteRef = useRef(onIntroComplete);
  onIntroCompleteRef.current = onIntroComplete;

  // Complete the intro and enter combat mode
  const completeIntro = useCallback(() => {
    if (isIntroCompleteRef.current) return;
    isIntroCompleteRef.current = true;
    setIsIntroComplete(true);
    setIsIntroSkipped(true);
    setIntroAct('combat');
    setActiveFighterBanner(null);
    setCountdownNum(null);

    // Dismiss opening transition elements
    if (openingTransitionRef.current) openingTransitionRef.current.style.display = 'none';
    if (screenVeilRef.current) screenVeilRef.current.style.display = 'none';
    if (arrivalFlareRef.current) arrivalFlareRef.current.style.display = 'none';

    // Snap fighters to marks
    if (p1FighterRef.current) p1FighterRef.current.setEntranceProgress(1.0, resolvedArenaId);
    if (p2FighterRef.current) p2FighterRef.current.setEntranceProgress(1.0, resolvedArenaId);

    // Apply active combat camera preset
    applyPresetTransformRef.current(activePresetIndexRef.current);

    if (cameraRef.current) {
      cameraRef.current.position.copy(targetCamPos.current);
      cameraRef.current.fov = targetCamFov.current;
      cameraRef.current.updateProjectionMatrix();
      currentCamLookAt.current.copy(targetCamLookAt.current);
      cameraRef.current.lookAt(currentCamLookAt.current);
    }

    if (onIntroCompleteRef.current) {
      console.log(`[COUNTDOWN_END] Arena countdown completed: timestamp=${new Date().toISOString()}`);
      console.log(`[FIGHT_START] Arena combat active: map=${resolvedArenaId} timestamp=${new Date().toISOString()}`);
      onIntroCompleteRef.current();
    }
  }, [resolvedArenaId]);

  const completeIntroRef = useRef(completeIntro);
  completeIntroRef.current = completeIntro;

  // Imperative handle for combat triggers
  useImperativeHandle(ref, () => ({
    triggerAttack: (side, tier) => {
      const fighter = side === 'left' ? p1FighterRef.current : p2FighterRef.current;
      if (!fighter) return;

      if (tier === 'jab') fighter.playJab();
      else if (tier === 'kick') fighter.playKick();
      else if (tier === 'heavy') fighter.playHeavy();
      else fighter.playWeapon();

      if (tier === 'heavy' || tier === 'weapon') {
        shakeIntensityRef.current = tier === 'weapon' ? 0.35 : 0.28;
      }
    },
    triggerHit: (side, severity) => {
      const fighter = side === 'left' ? p1FighterRef.current : p2FighterRef.current;
      if (!fighter) return;

      if (severity === 'light') fighter.playHitLight();
      else {
        fighter.playHitHeavy();
        shakeIntensityRef.current = 0.20;
      }

      spawnHitFeedback(side, severity);
    },
    triggerKeystroke: (side) => {
      const fighter = side === 'left' ? p1FighterRef.current : p2FighterRef.current;
      if (fighter) fighter.playKeystroke();
    },
    triggerKnockout: (loserSide) => {
      const loser = loserSide === 'left' ? p1FighterRef.current : p2FighterRef.current;
      const winner = loserSide === 'left' ? p2FighterRef.current : p1FighterRef.current;
      if (loser) loser.playKnockout();
      if (winner) winner.playVictory();
      shakeIntensityRef.current = 0.35;
    },
    triggerVictory: (winnerSide) => {
      const winner = winnerSide === 'left' ? p1FighterRef.current : p2FighterRef.current;
      if (winner) winner.playVictory();
    },
    triggerScreenShake: (intensity = 0.25) => {
      shakeIntensityRef.current = Math.max(shakeIntensityRef.current, intensity);
    },
    cycleCameraPreset: () => {
      cycleCameraPresetRef.current();
    },
    setCameraPreset: (preset) => {
      setCameraPresetById(preset);
    },
    skipIntro: () => {
      completeIntroRef.current();
    },
    setCharacterSkins: (newP1Id?: string, newP2Id?: string) => {
      const scene = sceneRef.current;
      if (!scene) return;
      const loader = new GLTFLoader();
      if (newP1Id) {
        if (p1FighterRef.current) {
          scene.remove(p1FighterRef.current.group);
          p1FighterRef.current.dispose();
        }
        const p1 = new Character3DFighter(newP1Id, 'left', loader);
        p1.baseY = arenaDef.fighterFloorY;
        p1.group.position.y = arenaDef.fighterFloorY;
        p1.setEntranceProgress(isIntroCompleteRef.current ? 1.0 : 0.0, resolvedArenaId);
        scene.add(p1.group);
        p1FighterRef.current = p1;
        (window as any).__p1 = p1;
      }
      if (newP2Id) {
        if (p2FighterRef.current) {
          scene.remove(p2FighterRef.current.group);
          p2FighterRef.current.dispose();
        }
        const p2 = new Character3DFighter(newP2Id, 'right', loader);
        p2.baseY = arenaDef.fighterFloorY;
        p2.group.position.y = arenaDef.fighterFloorY;
        p2.setEntranceProgress(isIntroCompleteRef.current ? 1.0 : 0.0, resolvedArenaId);
        scene.add(p2.group);
        p2FighterRef.current = p2;
        (window as any).__p2 = p2;
      }
    },
    setPromptWord: (word: string, typedIndex: number = 0, isError: boolean = false) => {
      currentWordRef.current = word;
      typedCharIndexRef.current = typedIndex;
      isErrorFlashRef.current = isError;
    },
    getP1TilePrompt: () => p1TilePromptRef.current,
    getP2TilePrompt: () => p2TilePromptRef.current,
  }), [setCameraPresetById, arenaDef, resolvedArenaId]);

  // Initialize Three.js Scene
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Reset state
    introTimerRef.current = 0;
    isIntroCompleteRef.current = false;
    setIsIntroComplete(false);
    setIsIntroSkipped(false);
    setIntroAct('stage');
    setActiveFighterBanner(null);
    setCountdownNum(null);
    applyPresetTransformRef.current(activePresetIndexRef.current);

    // Reset opening transition elements
    if (openingTransitionRef.current) {
      openingTransitionRef.current.style.display = 'flex';
      openingTransitionRef.current.style.opacity = '0';
    }
    if (screenVeilRef.current) {
      screenVeilRef.current.style.display = 'block';
      screenVeilRef.current.style.opacity = '1';
    }
    if (arrivalFlareRef.current) {
      arrivalFlareRef.current.style.display = 'none';
      arrivalFlareRef.current.style.opacity = '0';
    }

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(arenaDef.skyColor);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(arenaDef.camFov, container.clientWidth / container.clientHeight, 0.1, 1000);
    // Initial Wide Showcase Camera position
    camera.position.set(arenaDef.camPos[0], arenaDef.camPos[1] + 2.8, arenaDef.camPos[2] + 4.0);
    currentCamLookAt.current.set(arenaDef.camLookAt[0], arenaDef.camLookAt[1] + 0.5, arenaDef.camLookAt[2]);
    camera.lookAt(currentCamLookAt.current);
    cameraRef.current = camera;

    // 2. Renderer with ACES Filmic Tone Mapping matching Blender Material Preview (LookDev)
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(arenaDef.skyColor, 1);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 2b. Visible Physical Interaction: Pooled Hit Feedback Particles & Shockwaves
    const particleGeo = new THREE.BufferGeometry();
    const posArray = new Float32Array(MAX_HIT_PARTICLES * 3);
    const colArray = new Float32Array(MAX_HIT_PARTICLES * 3);
    for (let i = 0; i < MAX_HIT_PARTICLES; i++) {
      posArray[i * 3 + 1] = -1000;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    particleGeo.setAttribute('color', new THREE.BufferAttribute(colArray, 3));
    hitParticlesGeoRef.current = particleGeo;

    const particleMat = new THREE.PointsMaterial({
      size: 0.16,
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const pointsMesh = new THREE.Points(particleGeo, particleMat);
    pointsMesh.frustumCulled = false;
    scene.add(pointsMesh);

    const particlesData: HitParticleData[] = [];
    for (let i = 0; i < MAX_HIT_PARTICLES; i++) {
      particlesData.push({
        active: false,
        x: 0, y: -1000, z: 0,
        vx: 0, vy: 0, vz: 0,
        r: 1, g: 1, b: 1,
        age: 0, maxAge: 0.3,
      });
    }
    hitParticlesRef.current = particlesData;

    const shockwavesData: HitShockwaveData[] = [];
    const ringGeo = new THREE.RingGeometry(0.04, 0.24, 24);
    for (let i = 0; i < MAX_SHOCKWAVES; i++) {
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.visible = false;
      ringMesh.position.set(0, -1000, 0);
      scene.add(ringMesh);
      shockwavesData.push({
        active: false,
        mesh: ringMesh,
        material: ringMat,
        age: 0,
        maxAge: 0.2,
        targetScale: 1.2,
      });
    }
    hitShockwavesRef.current = shockwavesData;

    // 3. Studio Lighting Rig matching Blender LookDev Environment
    const amb = new THREE.AmbientLight(0xffffff, arenaDef.ambientIntensity);
    scene.add(amb);
    ambLightRef.current = amb;

    const key = new THREE.DirectionalLight(0xffffff, arenaDef.keyIntensity);
    key.position.set(arenaDef.keyPos[0], arenaDef.keyPos[1], arenaDef.keyPos[2]);
    key.castShadow = true;
    key.shadow.mapSize.width = 1024;
    key.shadow.mapSize.height = 1024;
    key.shadow.camera.near = 0.5;
    key.shadow.camera.far = 30;
    key.shadow.camera.left = -10;
    key.shadow.camera.right = 10;
    key.shadow.camera.top = 10;
    key.shadow.camera.bottom = -5;
    key.shadow.bias = -0.0005;
    scene.add(key);
    keyLightRef.current = key;

    const fill = new THREE.DirectionalLight(0xddeeff, 0.45);
    fill.position.set(0, 3, 7);
    scene.add(fill);

    const rim = new THREE.DirectionalLight(arenaDef.rimColor, arenaDef.rimIntensity);
    rim.position.set(arenaDef.rimPos[0], arenaDef.rimPos[1], arenaDef.rimPos[2]);
    scene.add(rim);
    rimLightRef.current = rim;

    // 4. Load Arena Model
    const loader = new GLTFLoader();
    loader.load(arenaDef.glb, (gltf) => {
      const arenaObj = gltf.scene;
      arenaObj.traverse((child) => {
        // Disable raw overpowered Blender scene lights in favor of calibrated studio LookDev rig
        if ((child as any).isLight) {
          (child as THREE.Light).intensity = 0;
          (child as THREE.Light).visible = false;
        }

        if ((child as THREE.Mesh).isMesh) {
          const m = child as THREE.Mesh;
          m.receiveShadow = true;
          m.castShadow = true;
          if (m.material) {
            const mats = Array.isArray(m.material) ? m.material : [m.material];
            mats.forEach((mat) => {
              const stdMat = mat as THREE.MeshStandardMaterial;
              stdMat.depthWrite = true;
              const name = stdMat.name || '';

              // Calibrate materials to match Blender LookDev viewport:
              if (name.includes('Facade')) {
                stdMat.emissive.setHex(0x02050e);
                stdMat.emissiveIntensity = 0.2;
                stdMat.color.setHex(0x0a101f);
              } else if (
                name === 'Mat_Sign_Arcade' ||
                name === 'Mat_Sign_Kyoto' ||
                name === 'Mat_Sign_Ramen' ||
                name === 'Mat_Server_Left_Tex' ||
                name === 'Mat_Server_Right_Tex' ||
                name === 'Mat_Magic_Floor' ||
                name === 'Mat_Temple_Seal' ||
                name.includes('Sign_') ||
                name.includes('Temple_Seal')
              ) {
                stdMat.emissiveIntensity = 1.0;
              } else if (name.includes('Volcanic_Sky_Dome')) {
                stdMat.emissive.setHex(0x140502);
                stdMat.emissiveIntensity = 1.0;
                stdMat.color.setHex(0x140502);
              } else if (name.includes('Volcanic_Smoke')) {
                stdMat.emissive.setHex(0x000000);
                stdMat.color.setHex(0x28201e);
                stdMat.roughness = 0.95;
              } else if (name.includes('Lava') || name.includes('Magma') || name.includes('Fireball')) {
                if (name === 'Mat_Convective_Magma_Lake') {
                  stdMat.emissive.setHex(0xff4500);
                  stdMat.emissiveIntensity = 2.0;
                } else if (name === 'Mat_Lava_Eruption') {
                  stdMat.emissive.setHex(0xff2200);
                  stdMat.emissiveIntensity = 2.8;
                } else {
                  stdMat.emissive.setHex(0xff3700);
                  stdMat.emissiveIntensity = 2.4;
                }
              } else if (name === 'Mat_Amethyst_Crystal') {
                stdMat.emissive.setHex(0x9d4edd);
                stdMat.emissiveIntensity = 1.4;
              } else if (name === 'Mat_Cyan_Crystal') {
                stdMat.emissive.setHex(0x00d4ff);
                stdMat.emissiveIntensity = 1.4;
              } else if (name === 'Mat_Magenta_Crystal') {
                stdMat.emissive.setHex(0xff007f);
                stdMat.emissiveIntensity = 1.4;
              } else if (name === 'Mat_Rune_Gold') {
                stdMat.emissive.setHex(0xffc226);
                stdMat.emissiveIntensity = 2.0;
              } else if (name === 'Mat_Window_Warm') {
                stdMat.emissive.setHex(0xffd159);
                stdMat.emissiveIntensity = 1.8;
              } else if (name === 'Mat_Waterfall_Foam') {
                stdMat.emissive.setHex(0xf2faff);
                stdMat.emissiveIntensity = 1.2;
              } else if (name.includes('Sky_Gradient')) {
                stdMat.emissive.setHex(0x3882ba);
                stdMat.emissiveIntensity = 0.85;
              } else if (name === 'Mat_Cloud' || name === 'Mat_Mist') {
                stdMat.emissive.setHex(0xf5f8fa);
                stdMat.emissiveIntensity = 0.6;
              } else if (name === 'Mat_Mtn_Snow') {
                stdMat.emissive.setHex(0xf5f8fa);
                stdMat.emissiveIntensity = 0.35;
              } else if (name === 'Mat_Alpine_Water') {
                stdMat.roughness = 0.05;
                stdMat.metalness = 0.15;
              }

              if (name !== 'Mat_Alpine_Water' && !name.includes('Water') && stdMat.roughness !== undefined && stdMat.roughness < 0.22) {
                stdMat.roughness = 0.28;
              }
            });
          }
        }
      });
      scene.add(arenaObj);
      arenaModelRef.current = arenaObj;
    }, undefined, (err) => {
      console.error(`Failed to load arena ${arenaDef.name}:`, err);
    });

    // 5. Load Fighters
    const p1 = new Character3DFighter(resolvedP1, 'left', loader);
    p1.baseY = arenaDef.fighterFloorY;
    p1.group.position.y = arenaDef.fighterFloorY;
    scene.add(p1.group);
    p1FighterRef.current = p1;

    const p2 = new Character3DFighter(resolvedP2, 'right', loader);
    p2.baseY = arenaDef.fighterFloorY;
    p2.group.position.y = arenaDef.fighterFloorY;
    scene.add(p2.group);
    p2FighterRef.current = p2;

    // ponytail: On-tile word prompts below character legs removed per user request
    p1TilePromptRef.current = null;
    p2TilePromptRef.current = null;

    (window as any).__threeScene = scene;
    (window as any).__p1 = p1;
    (window as any).__p2 = p2;
    (window as any).__threeCamera = camera;
    (window as any).__threeRenderer = renderer;
    (window as any).__triggerHit = (side: 'left' | 'right', severity: 'light' | 'heavy' = 'light') => {
      const fighter = side === 'left' ? p1FighterRef.current : p2FighterRef.current;
      if (!fighter) return;
      if (severity === 'light') fighter.playHitLight();
      else {
        fighter.playHitHeavy();
        shakeIntensityRef.current = 0.20;
      }
      spawnHitFeedback(side, severity);
    };
    (window as any).__setCharacterSkins = (newP1Id?: string, newP2Id?: string) => {
      const ldr = new GLTFLoader();
      if (newP1Id && p1FighterRef.current) {
        scene.remove(p1FighterRef.current.group);
        p1FighterRef.current.dispose();
        const newP1 = new Character3DFighter(newP1Id, 'left', ldr);
        newP1.baseY = arenaDef.fighterFloorY;
        newP1.group.position.y = arenaDef.fighterFloorY;
        newP1.setEntranceProgress(1.0, resolvedArenaId);
        scene.add(newP1.group);
        p1FighterRef.current = newP1;
        (window as any).__p1 = newP1;
      }
      if (newP2Id && p2FighterRef.current) {
        scene.remove(p2FighterRef.current.group);
        p2FighterRef.current.dispose();
        const newP2 = new Character3DFighter(newP2Id, 'right', ldr);
        newP2.baseY = arenaDef.fighterFloorY;
        newP2.group.position.y = arenaDef.fighterFloorY;
        newP2.setEntranceProgress(1.0, resolvedArenaId);
        scene.add(newP2.group);
        p2FighterRef.current = newP2;
        (window as any).__p2 = newP2;
      }
    };

    // 6. Handle Window Resize
    const handleResize = () => {
      if (!container || !camera || !renderer) return;
      camera.aspect = container.clientWidth / Math.max(container.clientHeight, 1);
      applyPresetTransformRef.current(activePresetIndexRef.current);
      camera.fov = targetCamFov.current;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => handleResize());
      resizeObserver.observe(container);
    }

    // 7. Keyboard shortcut listener for camera switching (C) and skip intro (Space/Enter)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.code === 'Enter' || e.code === 'Space' || e.key === 'Enter' || e.key === ' ') &&
        !isIntroCompleteRef.current
      ) {
        completeIntroRef.current();
      } else if (e.code === 'KeyC' || e.key === 'c' || e.key === 'C') {
        const targetTag = (e.target as HTMLElement)?.tagName?.toUpperCase();
        const activeTag = typeof document !== 'undefined' ? document.activeElement?.tagName?.toUpperCase() : undefined;
        if (targetTag !== 'INPUT' && targetTag !== 'TEXTAREA' && activeTag !== 'INPUT' && activeTag !== 'TEXTAREA') {
          cycleCameraPresetRef.current();
        }
      } else {
        const targetTag = (e.target as HTMLElement)?.tagName?.toUpperCase();
        const activeTag = typeof document !== 'undefined' ? document.activeElement?.tagName?.toUpperCase() : undefined;
        if (targetTag !== 'INPUT' && targetTag !== 'TEXTAREA' && activeTag !== 'INPUT' && activeTag !== 'TEXTAREA') {
          const keyUpper = e.key?.toUpperCase();
          const matched = CAMERA_PRESETS.find((p) => p.hotkey === keyUpper);
          if (matched) {
            setCameraPresetByIdRef.current(matched.id);
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    // 8. Animation & Cinematic Director Loop
    let animId: number;
    let elapsedTotal = 0;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = Math.min(clockRef.current.getDelta(), 0.1);
      elapsedTotal += delta;

      // Update screen shake
      if (shakeIntensityRef.current > 0) {
        shakeIntensityRef.current = Math.max(0, shakeIntensityRef.current - delta * 1.5);
      }

      // Update fighters
      if (p1FighterRef.current) p1FighterRef.current.update(delta, elapsedTotal);
      if (p2FighterRef.current) p2FighterRef.current.update(delta, elapsedTotal);

      // Update hit feedback particles & shockwave animations
      const hitParticles = hitParticlesRef.current;
      const geo = hitParticlesGeoRef.current;
      if (geo && hitParticles.length > 0) {
        const posAttr = geo.attributes.position as THREE.BufferAttribute;
        const colAttr = geo.attributes.color as THREE.BufferAttribute;
        let anyActive = false;

        for (let i = 0; i < MAX_HIT_PARTICLES; i++) {
          const p = hitParticles[i];
          if (!p.active) {
            posAttr.setXYZ(i, 0, -1000, 0);
            continue;
          }
          anyActive = true;
          p.age += delta;
          if (p.age >= p.maxAge) {
            p.active = false;
            posAttr.setXYZ(i, 0, -1000, 0);
            continue;
          }

          p.x += p.vx * delta;
          p.y += p.vy * delta;
          p.z += p.vz * delta;
          p.vy -= 4.0 * delta; // gravity
          p.vx *= 0.94; // air drag
          p.vz *= 0.94;

          posAttr.setXYZ(i, p.x, p.y, p.z);
          const fade = Math.max(0, 1.0 - (p.age / p.maxAge));
          colAttr.setXYZ(i, p.r * fade, p.g * fade, p.b * fade);
        }

        if (anyActive || posAttr.needsUpdate) {
          posAttr.needsUpdate = true;
          colAttr.needsUpdate = true;
        }
      }

      const hitShockwaves = hitShockwavesRef.current;
      for (let i = 0; i < hitShockwaves.length; i++) {
        const sw = hitShockwaves[i];
        if (!sw.active) continue;
        sw.age += delta;
        if (sw.age >= sw.maxAge) {
          sw.active = false;
          sw.mesh.visible = false;
          continue;
        }
        const prog = sw.age / sw.maxAge;
        const s = THREE.MathUtils.lerp(0.25, sw.targetScale, prog);
        sw.mesh.scale.setScalar(s);
        sw.material.opacity = Math.max(0, 0.95 * (1.0 - prog));
      }

      // CINEMATIC SHOWCASE & MAP-SPECIFIC ENTRANCE DIRECTOR
      if (!isIntroCompleteRef.current) {
        if (!hasLoggedEntranceStart.current) {
          hasLoggedEntranceStart.current = true;
          console.log(`[ENTRANCE_START] Arena entrance started: map=${resolvedArenaId} timestamp=${new Date().toISOString()}`);
          console.log(`[INPUT_CONTROL] disabled=true participant=human timestamp=${new Date().toISOString()} reason=entrance_and_countdown`);
          console.log(`[INPUT_CONTROL] disabled=true participant=bot timestamp=${new Date().toISOString()} reason=entrance_and_countdown`);
        }
        introTimerRef.current += delta;
        const t = introTimerRef.current;

        // Synchronize P1 & P2 Map-Specific Entrance Kinematics
        const p1Prog = getFighterEntranceProgress(t, 'left');
        const p2Prog = getFighterEntranceProgress(t, 'right');
        if (p1FighterRef.current) p1FighterRef.current.setEntranceProgress(p1Prog, resolvedArenaId);
        if (p2FighterRef.current) p2FighterRef.current.setEntranceProgress(p2Prog, resolvedArenaId);

        // Update Intro Act state
        const currentAct = getIntroActForTime(t);
        setIntroAct((prev) => (prev !== currentAct ? currentAct : prev));

        // High-Performance 60+ FPS 3D Opening Transition Updates (Act 1: 0.0s - 1.55s)
        if (t < 1.55) {
          // 1. Screen Veil: Smooth atmospheric fade-in from cinematic black (0.0s -> 0.4s)
          if (screenVeilRef.current) {
            if (t <= 0.4) {
              const veilP = t / 0.4;
              const veilAlpha = Math.max(0, 1.0 - easeInOutQuad(veilP));
              screenVeilRef.current.style.opacity = veilAlpha.toFixed(3);
              screenVeilRef.current.style.display = 'block';
            } else {
              screenVeilRef.current.style.opacity = '0';
              screenVeilRef.current.style.display = 'none';
            }
          }

          // 2. 3D Game Title & Logo Thunder Transition (Act 1: 0.0s - 1.55s)
          if (openingTransitionRef.current) {
            if (t < 1.5) {
              openingTransitionRef.current.style.display = 'block';
            } else {
              openingTransitionRef.current.style.display = 'none';
            }
          }

          // 3. Arrival Cross-Fade Flare: subtle energy burst right before character appears (1.20s -> 1.50s)
          if (arrivalFlareRef.current) {
            if (t >= 1.20 && t < 1.50) {
              const flareP = (t - 1.20) / 0.30;
              const flareAlpha = Math.sin(flareP * Math.PI) * 0.45;
              arrivalFlareRef.current.style.opacity = flareAlpha.toFixed(3);
              arrivalFlareRef.current.style.display = 'block';
            } else {
              arrivalFlareRef.current.style.opacity = '0';
              arrivalFlareRef.current.style.display = 'none';
            }
          }
        } else {
          if (openingTransitionRef.current && openingTransitionRef.current.style.display !== 'none') {
            openingTransitionRef.current.style.display = 'none';
          }
          if (screenVeilRef.current && screenVeilRef.current.style.display !== 'none') {
            screenVeilRef.current.style.display = 'none';
          }
          if (arrivalFlareRef.current && arrivalFlareRef.current.style.display !== 'none') {
            arrivalFlareRef.current.style.display = 'none';
          }
        }

        // ACT 1: Stage Showcase, 3D Game Title & Logo Transition & Smooth Handoff (0.0s - 1.5s)
        if (currentAct === 'stage') {
          setActiveFighterBanner(null);
          setCountdownNum(null);
          const p = Math.min(Math.max(t / 1.5, 0), 1);

          // Target values at t = 1.5s where Act 2 begins
          const p1TargetX = -4.2;
          const p1TargetY = arenaDef.camPos[1] + 0.6;
          const p1TargetZ = arenaDef.camPos[2] * 0.6;
          const p1LookX = -1.75;
          const p1LookY = 1.1 + arenaDef.fighterFloorY;
          const p1LookZ = 0;
          const p1TargetFov = 32.0;

          if (p < 0.6) {
            // Phase 1 (0.0s - 0.9s): Wide arena drift showcasing the 3D Game Title & Logo
            const subP = easeOutCubic(p / 0.6);
            camera.position.x = THREE.MathUtils.lerp(0, -0.6, subP);
            camera.position.y = THREE.MathUtils.lerp(arenaDef.camPos[1] + 2.4, arenaDef.camPos[1] + 1.8, subP);
            camera.position.z = THREE.MathUtils.lerp(arenaDef.camPos[2] + 3.2, arenaDef.camPos[2] + 1.8, subP);
            camera.fov = arenaDef.camFov;
            currentCamLookAt.current.set(
              THREE.MathUtils.lerp(arenaDef.camLookAt[0], arenaDef.camLookAt[0] - 0.3, subP),
              THREE.MathUtils.lerp(arenaDef.camLookAt[1] + 0.4, arenaDef.camLookAt[1] + 0.25, subP),
              arenaDef.camLookAt[2]
            );
          } else {
            // Phase 2 (0.9s - 1.5s): Smooth cubic curve swoop directly into Player 1 entry tracking shot
            const subP = easeInOutCubic((p - 0.6) / 0.4);
            camera.position.x = THREE.MathUtils.lerp(-0.6, p1TargetX, subP);
            camera.position.y = THREE.MathUtils.lerp(arenaDef.camPos[1] + 1.8, p1TargetY, subP);
            camera.position.z = THREE.MathUtils.lerp(arenaDef.camPos[2] + 1.8, p1TargetZ, subP);
            camera.fov = THREE.MathUtils.lerp(arenaDef.camFov, p1TargetFov, subP);
            currentCamLookAt.current.set(
              THREE.MathUtils.lerp(arenaDef.camLookAt[0] - 0.3, p1LookX, subP),
              THREE.MathUtils.lerp(arenaDef.camLookAt[1] + 0.25, p1LookY, subP),
              THREE.MathUtils.lerp(arenaDef.camLookAt[2], p1LookZ, subP)
            );
          }
          camera.updateProjectionMatrix();
          camera.lookAt(currentCamLookAt.current);
        }
        // ACT 2: Player 1 Unique Map Entrance & Spotlight (1.5s - 3.5s)
        else if (currentAct === 'p1') {
          setCountdownNum(null);
          const banner = getSpotlightBannerForTime(t, resolvedP1, resolvedP2, isBotMatch);
          setActiveFighterBanner((prev) => {
            if (prev && banner && prev.side === banner.side && prev.name === banner.name) return prev;
            return banner;
          });

          if (t >= 3.0 && p1FighterRef.current) {
            p1FighterRef.current.triggerEntranceFlair();
          }

          const p = Math.min(Math.max((t - 1.5) / 2.0, 0), 1);
          const easeP = easeInOutCubic(p);
          // Dynamic low 3/4 tracking shot of Player 1 with fluid easing
          camera.position.x = THREE.MathUtils.lerp(-4.2, -1.8, easeP);
          camera.position.y = THREE.MathUtils.lerp(arenaDef.camPos[1] + 0.6, arenaDef.camPos[1] * 0.7 + 0.3, easeP);
          camera.position.z = THREE.MathUtils.lerp(arenaDef.camPos[2] * 0.6, arenaDef.camPos[2] * 0.45, easeP);
          camera.fov = 32.0;
          camera.updateProjectionMatrix();
          currentCamLookAt.current.set(-1.75, 1.1 + arenaDef.fighterFloorY, 0);
          camera.lookAt(currentCamLookAt.current);
        }
        // ACT 3: Player 2 / AI Opponent Unique Map Entrance & Spotlight (3.5s - 5.5s)
        else if (currentAct === 'p2') {
          setCountdownNum(null);
          const banner = getSpotlightBannerForTime(t, resolvedP1, resolvedP2, isBotMatch);
          setActiveFighterBanner((prev) => {
            if (prev && banner && prev.side === banner.side && prev.name === banner.name) return prev;
            return banner;
          });

          if (t >= 4.9 && p2FighterRef.current) {
            p2FighterRef.current.triggerEntranceFlair();
          }

          const p = Math.min(Math.max((t - 3.5) / 2.0, 0), 1);
          const easeP = easeInOutCubic(p);
          // Fluid eased tracking shot of Player 2
          camera.position.x = THREE.MathUtils.lerp(4.2, 1.8, easeP);
          camera.position.y = THREE.MathUtils.lerp(arenaDef.camPos[1] + 0.6, arenaDef.camPos[1] * 0.7 + 0.3, easeP);
          camera.position.z = THREE.MathUtils.lerp(arenaDef.camPos[2] * 0.6, arenaDef.camPos[2] * 0.45, easeP);
          camera.fov = 32.0;
          camera.updateProjectionMatrix();
          currentCamLookAt.current.set(1.75, 1.1 + arenaDef.fighterFloorY, 0);
          camera.lookAt(currentCamLookAt.current);
        }
        // ACT 4: Standoff Camera Return & Synchronized 3-2-1 Countdown (5.5s - 7.5s)
        else if (currentAct === 'standoff') {
          if (!hasLoggedCountdownStart.current) {
            hasLoggedCountdownStart.current = true;
            console.log(`[COUNTDOWN_START] Arena countdown started: map=${resolvedArenaId} count=3 timestamp=${new Date().toISOString()}`);
          }
          setActiveFighterBanner(null);

          const p = Math.min((t - 5.5) / 1.0, 1.0);
          const easeP = easeInOutCubic(p);
          const tPos = targetCamPos.current;
          const tLook = targetCamLookAt.current;

          camera.position.x = THREE.MathUtils.lerp(1.8, tPos.x, easeP);
          camera.position.y = THREE.MathUtils.lerp(arenaDef.camPos[1] * 0.7 + 0.3, tPos.y, easeP);
          camera.position.z = THREE.MathUtils.lerp(arenaDef.camPos[2] * 0.45, tPos.z, easeP);
          camera.fov = THREE.MathUtils.lerp(32.0, targetCamFov.current, easeP);
          camera.updateProjectionMatrix();

          currentCamLookAt.current.lerp(tLook, easeP * 0.25);
          camera.lookAt(currentCamLookAt.current);

          // Synchronized 3-2-1 Countdown (5.5-6.2s: "3", 6.2-6.9s: "2", 6.9-7.3s: "1", 7.3-7.5s: "FIGHT!")
          const cd = getCountdownForTime(t);
          setCountdownNum((prev) => (prev !== cd ? cd : prev));
        } else {
          // Intro finishes, smoothly hand off to active combat mode
          completeIntroRef.current();
        }
      } else {
        // ACTIVE COMBAT CAMERA MODE with Smooth Damped Slerp Interpolation & Dynamic Tracking
        let effectiveTargetPos = targetCamPos.current;
        let effectiveTargetLookAt = targetCamLookAt.current;

        const currentPreset = CAMERA_PRESETS[activePresetIndexRef.current % CAMERA_PRESETS.length];
        if ((currentPreset.id === 'front' || currentPreset.id === 'dynamic') && p1FighterRef.current && p2FighterRef.current) {
          const p1X = p1FighterRef.current.group.position.x + (p1FighterRef.current.meshObject?.position.x ?? 0);
          const p2X = p2FighterRef.current.group.position.x + (p2FighterRef.current.meshObject?.position.x ?? 0);
          const midX = (p1X + p2X) * 0.5;
          const fighterDist = Math.abs(p1X - p2X);

          dynamicTrackPos.current.set(
            targetCamPos.current.x + midX * 0.35,
            targetCamPos.current.y,
            targetCamPos.current.z + Math.max(0, (fighterDist - 3.0) * 0.25)
          );
          dynamicTrackLookAt.current.set(
            targetCamLookAt.current.x + midX * 0.65,
            targetCamLookAt.current.y,
            targetCamLookAt.current.z
          );
          effectiveTargetPos = dynamicTrackPos.current;
          effectiveTargetLookAt = dynamicTrackLookAt.current;
        }

        const damping = Math.min(delta * 5.0, 1.0);
        camera.position.lerp(effectiveTargetPos, damping);
        currentCamLookAt.current.lerp(effectiveTargetLookAt, damping);
        camera.lookAt(currentCamLookAt.current);

        if (Math.abs(camera.fov - targetCamFov.current) > 0.05) {
          camera.fov = THREE.MathUtils.lerp(camera.fov, targetCamFov.current, damping);
          camera.updateProjectionMatrix();
        }
      }

      // Apply screen shake if active
      if (shakeIntensityRef.current > 0) {
        const shakeX = (Math.random() - 0.5) * shakeIntensityRef.current;
        const shakeY = (Math.random() - 0.5) * shakeIntensityRef.current;
        camera.position.x += shakeX;
        camera.position.y += shakeY;
      }

      renderer.render(scene, camera);
    };

    animId = requestAnimationFrame(animate);

    // 9. WebGL Context Loss & Restoration Event Handlers
    const handleContextLost = (e: Event) => {
      e.preventDefault();
      console.warn('[ThreeCombatArena] WebGL context lost. Pausing render loop.');
      cancelAnimationFrame(animId);
    };

    const handleContextRestored = () => {
      console.info('[ThreeCombatArena] WebGL context restored. Resuming render loop.');
      animId = requestAnimationFrame(animate);
    };

    const canvasElement = renderer.domElement;
    canvasElement.addEventListener('webglcontextlost', handleContextLost, false);
    canvasElement.addEventListener('webglcontextrestored', handleContextRestored, false);

    // Cleanup
    return () => {
      cancelAnimationFrame(animId);
      canvasElement.removeEventListener('webglcontextlost', handleContextLost);
      canvasElement.removeEventListener('webglcontextrestored', handleContextRestored);
      window.removeEventListener('resize', handleResize);
      if (resizeObserver) resizeObserver.disconnect();
      window.removeEventListener('keydown', handleKeyDown);

      if (p1FighterRef.current) p1FighterRef.current.dispose();
      if (p2FighterRef.current) p2FighterRef.current.dispose();

      p1TilePromptRef.current?.dispose();
      p1TilePromptRef.current = null;
      p2TilePromptRef.current?.dispose();
      p2TilePromptRef.current = null;

      // Dispose hit feedback particle and shockwave resources
      particleGeo.dispose();
      particleMat.dispose();
      scene.remove(pointsMesh);
      ringGeo.dispose();
      shockwavesData.forEach((sw) => {
        sw.material.dispose();
        scene.remove(sw.mesh);
      });
      hitParticlesRef.current = [];
      hitShockwavesRef.current = [];
      delete (window as any).__triggerHit;

      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
      if (sceneRef.current) {
        sceneRef.current.clear();
      }
    };
  }, [arenaDef, isBotMatch, p1CharId, p2CharId, resolvedArenaId, resolvedP1, resolvedP2]);

  const activePreset = CAMERA_PRESETS[activePresetIndex % CAMERA_PRESETS.length];
  const nextPreset = CAMERA_PRESETS[(activePresetIndex + 1) % CAMERA_PRESETS.length];

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      {/* 3D WebGL Canvas */}
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {/* In-Game Interactive Camera Switcher Widget (Available in Combat) */}
      {(isIntroComplete || isIntroSkipped || introAct === 'combat') && (
        <div
          data-testid="camera-switcher-widget"
          style={{
            position: 'absolute',
            top: '64px',
            right: '16px',
            zIndex: 20,
            display: 'flex',
            alignItems: 'center',
            pointerEvents: 'auto',
          }}
        >
          <button
            onClick={cycleCameraPreset}
            title={`Switch Camera View (Hotkey: C). Next: ${nextPreset.label}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(15, 23, 42, 0.82)',
              border: `1px solid ${arenaDef.themeColor}88`,
              backdropFilter: 'blur(12px)',
              padding: '6px 14px',
              borderRadius: '20px',
              color: '#f8fafc',
              fontSize: '12px',
              fontWeight: 700,
              letterSpacing: '0.5px',
              cursor: 'pointer',
              boxShadow: `0 0 16px ${arenaDef.themeColor}33`,
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = arenaDef.themeColor;
              e.currentTarget.style.boxShadow = `0 0 20px ${arenaDef.themeColor}66`;
              e.currentTarget.style.transform = 'scale(1.03)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = `${arenaDef.themeColor}88`;
              e.currentTarget.style.boxShadow = `0 0 16px ${arenaDef.themeColor}33`;
              e.currentTarget.style.transform = 'scale(1.0)';
            }}
          >
            <span>{activePreset.icon}</span>
            <span style={{ color: arenaDef.themeColor }}>CAM:</span>
            <span>{activePreset.label}</span>
            <span style={{
              background: 'rgba(255, 255, 255, 0.12)',
              padding: '1px 5px',
              borderRadius: '4px',
              fontSize: '10px',
              color: '#cbd5e1',
              marginLeft: '2px',
            }}>
              [C]
            </span>
          </button>
        </div>
      )}

      {/* Subtle Opening Cinematic Atmospheric Fade Veil */}
      <div
        ref={screenVeilRef}
        data-testid="opening-cinematic-veil"
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: '#060913',
          pointerEvents: 'none',
          zIndex: 28,
          opacity: 1,
          willChange: 'opacity',
        }}
      />

      {/* Subtle Character Entry Arrival Lens Flare */}
      <div
        ref={arrivalFlareRef}
        data-testid="opening-arrival-flare"
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(circle at 35% 65%, ${arenaDef.themeColor}77 0%, transparent 60%)`,
          pointerEvents: 'none',
          zIndex: 29,
          opacity: 0,
          display: 'none',
          willChange: 'opacity',
        }}
      />

      {/* 3D Game Title & Logo Thunder Transition Layer (Act 1: 0.0s - 1.5s) */}
      <div
        ref={openingTransitionRef}
        data-testid="opening-3d-transition"
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 30,
        }}
      >
        <div ref={openingCardRef} style={{ width: '100%', height: '100%' }}>
          <KeyFury3DThunderScene
            durationSeconds={1.5}
            isOverlay={true}
            allowSkip={false}
          />
        </div>
      </div>

      {/* Cinematic Showcase HUD Layer (Acts 1 to 4) */}
      {!isIntroComplete && !isIntroSkipped && introAct !== 'combat' && (
        <div
          data-testid="cinematic-showcase-hud"
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '68px 24px 20px 24px',
            zIndex: 25,
          }}
        >
          {/* Top Bar: Arena Showcase Info & Skip Button */}
          <div
            data-testid="stage-banner"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              transition: 'opacity 0.5s ease',
              opacity: introAct === 'stage' ? 1 : 0.85,
            }}
          >
            <div style={{
              background: 'rgba(10, 15, 28, 0.88)',
              border: `1px solid ${arenaDef.themeColor}66`,
              backdropFilter: 'blur(12px)',
              padding: '10px 20px',
              borderRadius: '12px',
              boxShadow: `0 0 24px ${arenaDef.themeColor}33`,
            }}>
              <div style={{
                fontSize: '11px',
                fontWeight: 900,
                letterSpacing: '2px',
                color: arenaDef.themeColor,
                textTransform: 'uppercase',
              }}>
                STAGE
              </div>
              <div style={{
                fontSize: '20px',
                fontWeight: 900,
                letterSpacing: '1.5px',
                color: '#f8fafc',
                textTransform: 'uppercase',
              }}>
                {arenaDef.name}
              </div>
              <div style={{
                fontSize: '11px',
                letterSpacing: '1px',
                color: '#94a3b8',
                marginTop: '2px',
              }}>
                {arenaDef.subtitle}
              </div>
            </div>

            {/* Skip Intro Button */}
            <button
              data-testid="skip-intro-button"
              aria-label="Skip Intro"
              onClick={completeIntro}
              style={{
                pointerEvents: 'auto',
                background: 'rgba(15, 23, 42, 0.85)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(10px)',
                color: '#f8fafc',
                padding: '8px 18px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 700,
                letterSpacing: '1px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = arenaDef.themeColor;
                e.currentTarget.style.boxShadow = `0 0 16px ${arenaDef.themeColor}44`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <span>SKIP INTRO</span>
              <span style={{
                background: 'rgba(255, 255, 255, 0.1)',
                padding: '2px 6px',
                borderRadius: '4px',
                fontSize: '10px',
              }}>
                ENTER
              </span>
            </button>
          </div>

          {/* Middle: Fighter Spotlight Card (Acts 2 & 3) */}
          {activeFighterBanner && (
            <div
              data-testid="fighter-spotlight-banner"
              style={{
                alignSelf: activeFighterBanner.side === 'left' ? 'flex-start' : 'flex-end',
                background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.92) 0%, rgba(30, 41, 59, 0.85) 100%)',
                border: `2px solid ${activeFighterBanner.color}`,
                boxShadow: `0 0 40px ${activeFighterBanner.color}55`,
                borderRadius: '16px',
                padding: '16px 28px',
                backdropFilter: 'blur(16px)',
                maxWidth: '380px',
              }}
            >
              <div
                data-testid="spotlight-role"
                style={{
                  fontSize: '11px',
                  fontWeight: 900,
                  letterSpacing: '2px',
                  color: activeFighterBanner.color,
                  textTransform: 'uppercase',
                  marginBottom: '4px',
                }}
              >
                {activeFighterBanner.side === 'left' ? 'CHALLENGER' : 'OPPONENT'}
              </div>
              <div
                data-testid="spotlight-name"
                style={{
                  fontSize: '28px',
                  fontWeight: 900,
                  letterSpacing: '2px',
                  color: '#ffffff',
                  textTransform: 'uppercase',
                }}
              >
                {activeFighterBanner.name}
              </div>
              <div
                data-testid="spotlight-title"
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  letterSpacing: '1px',
                  color: '#cbd5e1',
                  marginTop: '4px',
                }}
              >
                {activeFighterBanner.title}
              </div>
              <div
                data-testid="spotlight-weapon"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginTop: '10px',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: `1px solid ${activeFighterBanner.color}66`,
                  fontSize: '11px',
                  fontWeight: 700,
                  color: activeFighterBanner.color,
                }}
              >
                <span>⚔️</span>
                <span>{activeFighterBanner.weapon}</span>
              </div>
            </div>
          )}

          {/* Bottom Center: Standoff 3... 2... 1... Countdown (Act 4) */}
          {countdownNum && (
            <div
              data-testid="countdown-display"
              style={{
                alignSelf: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                marginBottom: '40px',
              }}
            >
              <div
                data-testid="countdown-number"
                style={{
                  fontSize: countdownNum === 'FIGHT!' ? '5.5rem' : '7.5rem',
                  fontWeight: 900,
                  color: countdownNum === 'FIGHT!' ? '#22c55e' : '#f8fafc',
                  textShadow: countdownNum === 'FIGHT!' ? '0 0 40px #22c55e, 0 0 80px #22c55e' : `0 0 30px ${arenaDef.themeColor}`,
                  fontFamily: 'var(--font-mono, monospace)',
                  lineHeight: 1,
                  letterSpacing: countdownNum === 'FIGHT!' ? '4px' : '0px',
                }}
              >
                {countdownNum}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

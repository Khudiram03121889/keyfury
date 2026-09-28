import React, { useState, useEffect, useRef } from 'react';
import { X, Trees, Building2, Flame, Moon, Sparkles, Check, Play, Swords } from 'lucide-react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
  ArenaId,
  ArenaDefinition,
  getAllArenas,
  getArenaDefinition,
  DEFAULT_ARENA_ID
} from '@keyfury/game-core';
import { ARENA_BACKGROUNDS } from '../../assets/arenas';
import { soundManager } from '../../audio/SoundManager';
import { saveSelectedArena, saveSelectedCameraAngle, getSavedSelectedCameraAngle } from '../../lib/supabase';
import {
  ARENA_DEFINITIONS,
  resolveArenaId,
  CameraAngle,
  CameraViewOption,
  CAMERA_VIEWS,
  getCameraTransformForAngle,
} from '../../render/ThreeCombatArena';
import { Character3DFighter } from '../../game/character/Character3DController';

export type { CameraAngle, CameraViewOption };
export { CAMERA_VIEWS, getCameraTransformForAngle };

export interface ArenaSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedArenaId?: ArenaId;
  onSelectArena: (arenaId: ArenaId) => void;
  onStartFight?: (arenaId: ArenaId) => void;
  isFightLaunchFlow?: boolean;
  fightModeLabel?: string;
}

export function getCleanArenaName(name: string): string {
  return name.replace(/\s*\(?(3D|True\s*3D)\)?/gi, '').replace(/\s{2,}/g, ' ').trim();
}

const ARENA_ICONS: Record<ArenaId, React.ReactNode> = {
  highland_sanctuary: <Trees size={18} />,
  cyber_rooftop: <Building2 size={18} />,
  volcanic_caldera: <Flame size={18} />,
  celestial_void: <Moon size={18} />
};

// Global GLTF scene cache to ensure instant arena switching with zero reload lag
const gltfSceneCache = new Map<string, THREE.Group>();

export const ArenaSelectModal: React.FC<ArenaSelectModalProps> = ({
  isOpen,
  onClose,
  selectedArenaId = DEFAULT_ARENA_ID,
  onSelectArena,
  onStartFight,
  isFightLaunchFlow = false,
  fightModeLabel = 'Duel'
}) => {
  const arenas = getAllArenas();
  const [focusedId, setFocusedId] = useState<ArenaId>(selectedArenaId);
  const [cameraAngle, setCameraAngle] = useState<CameraAngle>('front');
  const [webglSupported, setWebglSupported] = useState<boolean>(true);

  // Sync focused arena when modal opens or selected prop changes (defaults to front zoom view)
  useEffect(() => {
    if (isOpen) {
      setFocusedId(selectedArenaId || DEFAULT_ARENA_ID);
      setCameraAngle('front');
    }
  }, [isOpen, selectedArenaId]);

  const focusedArena: ArenaDefinition = getArenaDefinition(focusedId);

  // Three.js 3D Viewport refs
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const arenaModelRef = useRef<THREE.Object3D | null>(null);
  const p1FighterRef = useRef<Character3DFighter | null>(null);
  const p2FighterRef = useRef<Character3DFighter | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  const targetCamPos = useRef<THREE.Vector3>(new THREE.Vector3());
  const targetCamLookAt = useRef<THREE.Vector3>(new THREE.Vector3());
  const currentCamLookAt = useRef<THREE.Vector3>(new THREE.Vector3());

  // Setup Three.js scene and 3D preview
  useEffect(() => {
    if (!isOpen) return;

    const container = canvasContainerRef.current;
    if (!container) return;

    let destroyed = false;
    let renderer: THREE.WebGLRenderer | null = null;

    try {
      const width = container.clientWidth || 460;
      const height = container.clientHeight || 280;

      const def = ARENA_DEFINITIONS[resolveArenaId(focusedId)];
      const initialTransform = getCameraTransformForAngle(focusedId, cameraAngle);

      targetCamPos.current.set(initialTransform.pos[0], initialTransform.pos[1], initialTransform.pos[2]);
      targetCamLookAt.current.set(initialTransform.lookAt[0], initialTransform.lookAt[1], initialTransform.lookAt[2]);
      currentCamLookAt.current.copy(targetCamLookAt.current);

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(def.skyColor);
      sceneRef.current = scene;

      const camera = new THREE.PerspectiveCamera(initialTransform.fov, width / height, 0.1, 1000);
      camera.position.copy(targetCamPos.current);
      camera.lookAt(currentCamLookAt.current);
      cameraRef.current = camera;

      renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: 'high-performance',
        alpha: false
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;

      container.innerHTML = '';
      container.appendChild(renderer.domElement);
      rendererRef.current = renderer;
      setWebglSupported(true);

      // Studio Lighting Rig
      const ambLight = new THREE.AmbientLight(0xffffff, def.ambientIntensity);
      scene.add(ambLight);

      const keyLight = new THREE.DirectionalLight(0xffffff, def.keyIntensity);
      keyLight.position.set(def.keyPos[0], def.keyPos[1], def.keyPos[2]);
      keyLight.castShadow = true;
      scene.add(keyLight);

      const fillLight = new THREE.DirectionalLight(0xddeeff, 0.45);
      fillLight.position.set(0, 3, 7);
      scene.add(fillLight);

      const rimLight = new THREE.DirectionalLight(def.rimColor, def.rimIntensity);
      rimLight.position.set(def.rimPos[0], def.rimPos[1], def.rimPos[2]);
      scene.add(rimLight);

      // Load 3D Sparring Fighters in Zoomed-in Combat Stance
      const fighterLoader = new GLTFLoader();
      const p1 = new Character3DFighter('ronin', 'left', fighterLoader);
      p1.baseY = def.fighterFloorY;
      p1.group.position.set(-1.40, def.fighterFloorY, 0);
      p1.setEntranceProgress(1.0);
      scene.add(p1.group);
      p1FighterRef.current = p1;

      const p2 = new Character3DFighter('valkyrie', 'right', fighterLoader);
      p2.baseY = def.fighterFloorY;
      p2.group.position.set(1.40, def.fighterFloorY, 0);
      p2.setEntranceProgress(1.0);
      scene.add(p2.group);
      p2FighterRef.current = p2;

      // Helper to apply LookDev calibrations
      const calibrateModel = (obj: THREE.Object3D) => {
        obj.traverse((child) => {
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
                if (name.includes('Facade')) {
                  stdMat.emissive.setHex(0x02050e);
                  stdMat.emissiveIntensity = 0.2;
                  stdMat.color.setHex(0x0a101f);
                } else if (name.includes('Sign_') || name.includes('Temple_Seal') || name === 'Mat_Magic_Floor') {
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
                } else if (name.includes('Crystal')) {
                  stdMat.emissive.setHex(0x9d4edd);
                  stdMat.emissiveIntensity = 1.4;
                }
                if (stdMat.roughness !== undefined && stdMat.roughness < 0.25) {
                  stdMat.roughness = 0.28;
                }
              });
            }
          }
        });
      };

      // Load Arena GLB (or clone from cache)
      const cached = gltfSceneCache.get(def.glb);
      if (cached) {
        const clone = cached.clone(true);
        calibrateModel(clone);
        scene.add(clone);
        arenaModelRef.current = clone;
      } else {
        const loader = new GLTFLoader();
        loader.load(def.glb, (gltf) => {
          if (destroyed) return;
          calibrateModel(gltf.scene);
          gltfSceneCache.set(def.glb, gltf.scene);
          scene.add(gltf.scene);
          arenaModelRef.current = gltf.scene;
        }, undefined, () => {
          // If GLB loading fails, fallback gracefully
          setWebglSupported(false);
        });
      }

      let lastTime = performance.now();
      let combatActionTimer = 0;
      let combatActionStep = 0;

      // Render & lerp loop with animated sparring fighters
      const render = (now: number) => {
        if (destroyed || !rendererRef.current || !sceneRef.current || !cameraRef.current) return;
        const delta = Math.min((now - lastTime) / 1000, 0.1);
        lastTime = now;

        // Dynamic sparring combat moves sequence between fighters
        combatActionTimer += delta;
        if (combatActionTimer >= 2.2) {
          combatActionTimer = 0;
          combatActionStep = (combatActionStep + 1) % 4;
          if (combatActionStep === 0) {
            p1.playJab();
            setTimeout(() => { if (!destroyed) p2.playHitLight(); }, 120);
          } else if (combatActionStep === 1) {
            p2.playKick();
            setTimeout(() => { if (!destroyed) p1.playHitLight(); }, 160);
          } else if (combatActionStep === 2) {
            p1.playHeavy();
            setTimeout(() => { if (!destroyed) p2.playHitHeavy(); }, 280);
          } else {
            p2.playJab();
            setTimeout(() => { if (!destroyed) p1.playHitLight(); }, 120);
          }
        }

        p1.update(delta, now * 0.001);
        p2.update(delta, now * 0.001);

        const cam = cameraRef.current;
        cam.position.lerp(targetCamPos.current, 0.14);
        currentCamLookAt.current.lerp(targetCamLookAt.current, 0.14);
        cam.lookAt(currentCamLookAt.current);

        rendererRef.current.render(sceneRef.current, cam);
        animFrameIdRef.current = requestAnimationFrame(render);
      };
      animFrameIdRef.current = requestAnimationFrame(render);

      // Handle dynamic resize
      const handleResize = () => {
        if (!container || !rendererRef.current || !cameraRef.current) return;
        const w = container.clientWidth;
        const h = container.clientHeight;
        if (w > 0 && h > 0) {
          cameraRef.current.aspect = w / h;
          cameraRef.current.updateProjectionMatrix();
          rendererRef.current.setSize(w, h);
        }
      };
      window.addEventListener('resize', handleResize);

      return () => {
        destroyed = true;
        window.removeEventListener('resize', handleResize);
        if (animFrameIdRef.current) {
          cancelAnimationFrame(animFrameIdRef.current);
          animFrameIdRef.current = null;
        }
        if (renderer) {
          renderer.dispose();
          rendererRef.current = null;
        }
        if (p1FighterRef.current) {
          sceneRef.current?.remove(p1FighterRef.current.group);
          p1FighterRef.current = null;
        }
        if (p2FighterRef.current) {
          sceneRef.current?.remove(p2FighterRef.current.group);
          p2FighterRef.current = null;
        }
        if (sceneRef.current) {
          sceneRef.current.clear();
          sceneRef.current = null;
        }
        arenaModelRef.current = null;
        cameraRef.current = null;
      };
    } catch (_err) {
      setWebglSupported(false);
      return;
    }
  }, [isOpen, focusedId]);

  // Update camera target coordinates whenever cameraAngle or focusedId changes
  useEffect(() => {
    if (!isOpen) return;
    const transform = getCameraTransformForAngle(focusedId, cameraAngle);
    targetCamPos.current.set(transform.pos[0], transform.pos[1], transform.pos[2]);
    targetCamLookAt.current.set(transform.lookAt[0], transform.lookAt[1], transform.lookAt[2]);
    if (cameraRef.current) {
      cameraRef.current.fov = transform.fov;
      cameraRef.current.updateProjectionMatrix();
    }
  }, [isOpen, focusedId, cameraAngle]);

  // Keyboard navigation for cycling arenas and camera views
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        soundManager.playClick();
        onClose();
        return;
      }

      // Camera preset angle hotkeys: F, B, L, R, S, T, W, V / Tab / Space
      const keyLower = e.key.toLowerCase();
      if (keyLower === 'f') {
        e.preventDefault();
        e.stopPropagation();
        setCameraAngle('front');
        saveSelectedCameraAngle('front');
        soundManager.playClick();
        return;
      } else if (keyLower === 'b') {
        e.preventDefault();
        e.stopPropagation();
        setCameraAngle('back');
        saveSelectedCameraAngle('back');
        soundManager.playClick();
        return;
      } else if (keyLower === 'l') {
        e.preventDefault();
        e.stopPropagation();
        setCameraAngle('left');
        saveSelectedCameraAngle('left');
        soundManager.playClick();
        return;
      } else if (keyLower === 'r') {
        e.preventDefault();
        e.stopPropagation();
        setCameraAngle('right');
        saveSelectedCameraAngle('right');
        soundManager.playClick();
        return;
      } else if (keyLower === 's') {
        e.preventDefault();
        e.stopPropagation();
        setCameraAngle('spider_cam');
        saveSelectedCameraAngle('spider_cam');
        soundManager.playClick();
        return;
      } else if (keyLower === 't') {
        e.preventDefault();
        e.stopPropagation();
        setCameraAngle('focused_60');
        saveSelectedCameraAngle('focused_60');
        soundManager.playClick();
        return;
      } else if (keyLower === 'w') {
        e.preventDefault();
        e.stopPropagation();
        setCameraAngle('wide_front');
        saveSelectedCameraAngle('wide_front');
        soundManager.playClick();
        return;
      } else if (keyLower === 'v' || e.key === 'Tab' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        const angles: CameraAngle[] = CAMERA_VIEWS.map((v) => v.id);
        const nextIdx = (angles.indexOf(cameraAngle) + 1) % angles.length;
        setCameraAngle(angles[nextIdx]);
        saveSelectedCameraAngle(angles[nextIdx]);
        soundManager.playClick();
        return;
      }

      const ids = arenas.map((a) => a.id);
      const currentIndex = ids.indexOf(focusedId);

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        const nextIndex = (currentIndex + 1) % ids.length;
        setFocusedId(ids[nextIndex]);
        soundManager.playClick();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        const prevIndex = (currentIndex - 1 + ids.length) % ids.length;
        setFocusedId(ids[prevIndex]);
        soundManager.playClick();
      } else if (e.key >= '1' && e.key <= '4') {
        const targetIndex = parseInt(e.key, 10) - 1;
        if (targetIndex >= 0 && targetIndex < ids.length) {
          setFocusedId(ids[targetIndex]);
          soundManager.playClick();
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        handleConfirmSelection(focusedId);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, focusedId, arenas, cameraAngle, onClose]);

  if (!isOpen) return null;

  const handleConfirmSelection = (arenaId: ArenaId) => {
    soundManager.playClick();
    onSelectArena(arenaId);
    saveSelectedArena(arenaId);
    saveSelectedCameraAngle(cameraAngle);
    if (isFightLaunchFlow && onStartFight) {
      onStartFight(arenaId);
    }
    onClose();
  };

  const isEquipped = selectedArenaId === focusedId;

  return (
    <div
      className="modal-overlay-wrapper"
      onClick={onClose}
    >
      <div
        className="glass-panel arena-modal-dialog"
        style={{
          width: '100%',
          maxWidth: '920px',
          maxHeight: '92vh',
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          border: `1.5px solid ${focusedArena.theme.primaryColor}55`,
          borderRadius: '24px',
          boxShadow: `0 20px 50px rgba(0, 0, 0, 0.7), 0 0 40px ${focusedArena.theme.ambientGlow}`,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: `linear-gradient(135deg, ${focusedArena.theme.primaryColor}22 0%, rgba(15, 23, 42, 0.95) 100%)`
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: `linear-gradient(135deg, ${focusedArena.theme.primaryColor}44, ${focusedArena.theme.accentColor}22)`,
                border: `1px solid ${focusedArena.theme.primaryColor}88`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: focusedArena.theme.primaryColor,
                flexShrink: 0
              }}
            >
              {isFightLaunchFlow ? <Swords size={18} /> : <Sparkles size={18} />}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2
                  style={{
                    margin: 0,
                    fontSize: '1.25rem',
                    fontWeight: 900,
                    letterSpacing: '0.5px',
                    color: '#ffffff'
                  }}
                >
                  {isFightLaunchFlow ? 'CHOOSE ARENA & FIGHT' : 'SELECT COMBAT ARENA'}
                </h2>
                {isFightLaunchFlow && (
                  <span
                    style={{
                      padding: '2px 6px',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(56, 189, 248, 0.2)',
                      border: '1px solid rgba(56, 189, 248, 0.4)',
                      color: 'var(--accent-cyan)',
                      fontSize: '0.7rem',
                      fontWeight: 800
                    }}
                  >
                    {fightModeLabel}
                  </span>
                )}
              </div>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>
                {isFightLaunchFlow
                  ? `Select your battleground, then click Start Fight to begin ${fightModeLabel}`
                  : 'Choose your battleground • Custom backgrounds, lighting & physics'}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              soundManager.playClick();
              onClose();
            }}
            aria-label="Close arena select modal"
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '10px',
              padding: '6px',
              color: '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div
          className="arena-body-grid"
          style={{
            overflowY: 'auto',
            flex: 1
          }}
        >
          {/* Left: 4 Arenas Grid Selector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.2px', color: '#64748b', marginBottom: '4px' }}>
              AVAILABLE BATTLEGROUNDS ({arenas.length})
            </div>

            <div className="arena-cards-grid">
              {arenas.map((arena, idx) => {
                const isFocused = arena.id === focusedId;
                const isSelected = arena.id === selectedArenaId;
                const bgUrl = ARENA_BACKGROUNDS[arena.id];

                return (
                <div
                  key={arena.id}
                  onClick={() => {
                    setFocusedId(arena.id);
                    soundManager.playClick();
                  }}
                  onDoubleClick={() => handleConfirmSelection(arena.id)}
                  style={{
                    position: 'relative',
                    height: '84px',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    border: isFocused
                      ? `2px solid ${arena.theme.primaryColor}`
                      : isSelected
                      ? '1px solid rgba(52, 211, 153, 0.6)'
                      : '1px solid rgba(255, 255, 255, 0.08)',
                    boxShadow: isFocused ? `0 0 20px ${arena.theme.primaryColor}55` : 'none',
                    transform: isFocused ? 'scale(1.02)' : 'scale(1)',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '12px 16px',
                    background: '#090d16'
                  }}
                >
                  {/* Background Image Preview */}
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      backgroundImage: `url(${bgUrl})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      filter: isFocused ? 'brightness(0.7) contrast(1.1)' : 'brightness(0.35)',
                      transition: 'filter 0.2s ease'
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: `linear-gradient(90deg, rgba(9, 13, 22, 0.85) 0%, rgba(9, 13, 22, 0.4) 100%)`
                    }}
                  />

                  {/* Arena Card Content */}
                  <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '10px',
                          backgroundColor: `${arena.theme.primaryColor}33`,
                          border: `1px solid ${arena.theme.primaryColor}88`,
                          color: arena.theme.primaryColor,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        {ARENA_ICONS[arena.id]}
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>{getCleanArenaName(arena.name)}</span>
                          <span style={{ fontSize: '0.7rem', color: '#94a3b8', background: 'rgba(0,0,0,0.5)', padding: '1px 5px', borderRadius: '4px' }}>
                            [{idx + 1}]
                          </span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: arena.theme.accentColor }}>
                          {arena.subtitle}
                        </div>
                      </div>
                    </div>

                    {isSelected && (
                      <div
                        style={{
                          backgroundColor: '#10b981',
                          color: '#ffffff',
                          borderRadius: '50%',
                          width: '24px',
                          height: '24px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 0 10px rgba(16, 185, 129, 0.6)'
                        }}
                      >
                        <Check size={14} />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            </div>
          </div>

          {/* Right: Detailed Arena Panoramic Showcase */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Cinematic 3D Multi-Angle Preview Banner */}
            <div
              style={{
                position: 'relative',
                width: '100%',
                height: '280px',
                borderRadius: '20px',
                overflow: 'hidden',
                border: `1.5px solid ${focusedArena.theme.primaryColor}66`,
                boxShadow: `0 12px 30px rgba(0,0,0,0.6), 0 0 30px ${focusedArena.theme.ambientGlow}`,
                backgroundColor: '#050b18'
              }}
              data-testid="arena-3d-preview-container"
              data-active-view={cameraAngle}
            >
              {/* 3D WebGL Canvas Viewport or Fallback Image */}
              {webglSupported ? (
                <div
                  ref={canvasContainerRef}
                  style={{ width: '100%', height: '100%', display: 'block' }}
                />
              ) : (
                <img
                  src={ARENA_BACKGROUNDS[focusedArena.id]}
                  alt={getCleanArenaName(focusedArena.name)}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block'
                  }}
                />
              )}

              {/* Preset Camera Angle Tabs & Active Badge */}
              <div
                style={{
                  position: 'absolute',
                  top: '12px',
                  left: '12px',
                  right: '12px',
                  zIndex: 10,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '6px',
                  flexWrap: 'wrap'
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    gap: '4px',
                    backgroundColor: 'rgba(9, 13, 22, 0.90)',
                    backdropFilter: 'blur(8px)',
                    padding: '4px',
                    borderRadius: '10px',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    flexWrap: 'wrap'
                  }}
                >
                  {CAMERA_VIEWS.map((view) => {
                    const isActive = cameraAngle === view.id;
                    return (
                      <button
                        key={view.id}
                        type="button"
                        data-testid={`camera-view-${view.id}`}
                        aria-label={`${view.label} camera view`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setCameraAngle(view.id);
                          saveSelectedCameraAngle(view.id);
                          soundManager.playClick();
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '4px 8px',
                          borderRadius: '7px',
                          border: isActive
                            ? `1.5px solid ${focusedArena.theme.primaryColor}`
                            : '1px solid transparent',
                          background: isActive
                            ? `${focusedArena.theme.primaryColor}33`
                            : 'transparent',
                          color: isActive ? '#ffffff' : '#94a3b8',
                          fontSize: '0.72rem',
                          fontWeight: isActive ? 800 : 600,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <span>{view.icon}</span>
                        <span>{view.label}</span>
                        <span style={{
                          fontSize: '0.60rem',
                          opacity: 0.65,
                          backgroundColor: 'rgba(0,0,0,0.4)',
                          padding: '1px 4px',
                          borderRadius: '4px'
                        }}>
                          [{view.hotkey}]
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div
                  style={{
                    backgroundColor: 'rgba(9, 13, 22, 0.88)',
                    backdropFilter: 'blur(8px)',
                    border: `1px solid ${focusedArena.theme.primaryColor}66`,
                    borderRadius: '8px',
                    padding: '4px 10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                    fontSize: '0.70rem',
                    fontWeight: 800,
                    letterSpacing: '0.5px',
                    textTransform: 'uppercase',
                    color: focusedArena.theme.accentColor
                  }}
                >
                  <span>{CAMERA_VIEWS.find((v) => v.id === cameraAngle)?.angleDeg || 'ACTIVE VIEW'}</span>
                </div>
              </div>

              {/* Bottom Subtle Gradient for Text Readability */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  pointerEvents: 'none',
                  background: 'linear-gradient(0deg, rgba(15, 23, 42, 0.95) 0%, rgba(15, 23, 42, 0.25) 40%, transparent 70%)'
                }}
              />

              {/* Arena Info Overlay */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '14px',
                  left: '18px',
                  right: '18px',
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'space-between',
                  pointerEvents: 'none',
                  zIndex: 5
                }}
              >
                <div>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 10px',
                      borderRadius: '8px',
                      backgroundColor: `${focusedArena.theme.primaryColor}33`,
                      border: `1px solid ${focusedArena.theme.primaryColor}88`,
                      color: focusedArena.theme.primaryColor,
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      marginBottom: '4px'
                    }}
                  >
                    {ARENA_ICONS[focusedArena.id]}
                    <span>{focusedArena.subtitle}</span>
                  </div>
                  <h3 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 900, color: '#ffffff' }}>
                    {getCleanArenaName(focusedArena.name)}
                  </h3>
                </div>

                <div
                  style={{
                    padding: '4px 10px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(0,0,0,0.65)',
                    backdropFilter: 'blur(6px)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    fontSize: '0.72rem',
                    color: '#94a3b8'
                  }}
                >
                  MOOD: <strong style={{ color: focusedArena.theme.accentColor }}>{focusedArena.theme.lightingMood.toUpperCase()}</strong>
                </div>
              </div>
            </div>

            {/* Lore & Platform Info */}
            <div
              style={{
                backgroundColor: 'rgba(15, 23, 42, 0.7)',
                borderRadius: '16px',
                padding: '16px 20px',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}
            >
              <div style={{ fontStyle: 'italic', color: '#cbd5e1', fontSize: '0.88rem' }}>
                "{focusedArena.tagline}"
              </div>
              <p style={{ margin: 0, fontSize: '0.84rem', color: '#94a3b8', lineHeight: '1.5' }}>
                {focusedArena.lore}
              </p>
            </div>

            {/* Palette Highlights */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: 'rgba(0, 0, 0, 0.35)',
                borderRadius: '14px',
                padding: '12px 18px',
                border: '1px solid rgba(255, 255, 255, 0.05)'
              }}
            >
              <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 700 }}>
                ARENA PARTICLES & LIGHTING
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                {focusedArena.theme.particlePalette.map((col, idx) => (
                  <div
                    key={idx}
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      backgroundColor: col,
                      border: '1.5px solid rgba(255,255,255,0.3)',
                      boxShadow: `0 0 8px ${col}88`
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Confirm / Select / Start Fight Action Button */}
            <button
              onClick={() => handleConfirmSelection(focusedArena.id)}
              style={{
                width: '100%',
                padding: '16px 24px',
                borderRadius: '14px',
                fontWeight: 900,
                fontSize: '1.08rem',
                letterSpacing: '1px',
                color: '#ffffff',
                border: 'none',
                cursor: 'pointer',
                backgroundColor: isFightLaunchFlow ? '#f97316' : isEquipped ? '#10b981' : focusedArena.theme.primaryColor,
                boxShadow: isFightLaunchFlow
                  ? '0 6px 25px rgba(249, 115, 22, 0.5), 0 0 20px rgba(249, 115, 22, 0.4)'
                  : isEquipped
                  ? '0 6px 20px rgba(16, 185, 129, 0.4)'
                  : `0 6px 20px ${focusedArena.theme.primaryColor}55`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                marginTop: 'auto',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px) scale(1.01)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
              }}
            >
              {isFightLaunchFlow ? (
                <>
                  <Swords size={22} />
                  <span>START FIGHT • {getCleanArenaName(focusedArena.name).toUpperCase()}</span>
                  <span
                    style={{
                      marginLeft: '6px',
                      backgroundColor: 'rgba(0,0,0,0.3)',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      fontWeight: 800
                    }}
                  >
                    Enter
                  </span>
                </>
              ) : isEquipped ? (
                <>
                  <Check size={18} /> ACTIVE BATTLEGROUND
                </>
              ) : (
                <>
                  <Play size={18} /> EQUIP {getCleanArenaName(focusedArena.name).toUpperCase()}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

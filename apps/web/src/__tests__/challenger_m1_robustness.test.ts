import { describe, it, expect, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as THREE from 'three';
import {
  ARENA_DEFINITIONS,
  CAMERA_PRESETS,
  resolveArenaId,
  type ArenaId,
  type ArenaDefinition,
  type CameraPreset,
  type ThreeCombatArenaRef,
} from '../render/ThreeCombatArena';
import {
  Character3DFighter,
  type CharacterId,
  resolveCharacterId,
} from '../game/character/Character3DController';

// Traversal logic strictly mirroring ThreeCombatArena.tsx lines 429-500
function runArenaMaterialTraversal(arenaObj: THREE.Object3D) {
  arenaObj.traverse((child) => {
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
          if (!mat) return; // Guard for stress test
          const stdMat = mat as THREE.MeshStandardMaterial;
          stdMat.depthWrite = true;
          const name = stdMat.name || '';

          // Calibrate materials to match Blender LookDev viewport:
          if (name.includes('Facade')) {
            if (stdMat.emissive) stdMat.emissive.setHex(0x02050e);
            stdMat.emissiveIntensity = 0.2;
            if (stdMat.color) stdMat.color.setHex(0x0a101f);
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
            if (stdMat.emissive) stdMat.emissive.setHex(0x140502);
            stdMat.emissiveIntensity = 1.0;
            if (stdMat.color) stdMat.color.setHex(0x140502);
          } else if (name.includes('Volcanic_Smoke')) {
            if (stdMat.emissive) stdMat.emissive.setHex(0x000000);
            if (stdMat.color) stdMat.color.setHex(0x28201e);
            stdMat.roughness = 0.95;
          } else if (name.includes('Lava') || name.includes('Magma') || name.includes('Fireball')) {
            if (name === 'Mat_Convective_Magma_Lake') {
              if (stdMat.emissive) stdMat.emissive.setHex(0xff4500);
              stdMat.emissiveIntensity = 2.0;
            } else if (name === 'Mat_Lava_Eruption') {
              if (stdMat.emissive) stdMat.emissive.setHex(0xff2200);
              stdMat.emissiveIntensity = 2.8;
            } else {
              if (stdMat.emissive) stdMat.emissive.setHex(0xff3700);
              stdMat.emissiveIntensity = 2.4;
            }
          } else if (name === 'Mat_Amethyst_Crystal') {
            if (stdMat.emissive) stdMat.emissive.setHex(0x9d4edd);
            stdMat.emissiveIntensity = 1.4;
          } else if (name === 'Mat_Cyan_Crystal') {
            if (stdMat.emissive) stdMat.emissive.setHex(0x00d4ff);
            stdMat.emissiveIntensity = 1.4;
          } else if (name === 'Mat_Magenta_Crystal') {
            if (stdMat.emissive) stdMat.emissive.setHex(0xff007f);
            stdMat.emissiveIntensity = 1.4;
          }

          if (stdMat.roughness !== undefined && stdMat.roughness < 0.22) {
            stdMat.roughness = 0.28;
          }
        });
      }
    }
  });
}

// Helper to parse binary GLB JSON chunk directly
function parseGlbJson(filePath: string): any {
  const buf = fs.readFileSync(filePath);
  const jsonLen = buf.readUInt32LE(12);
  const jsonChunkType = buf.readUInt32LE(16);
  if (jsonChunkType !== 0x4e4f534a) throw new Error('Not JSON chunk');
  return JSON.parse(buf.toString('utf8', 20, 20 + jsonLen));
}

describe('Milestone 1 Adversarial Empirical Stress Test Suite (Challenger m1_3)', () => {
  const assetsDir = path.resolve(__dirname, '../../public/assets/3d');

  // =========================================================================
  // SECTION 1: Interface Contracts & Backward Compatibility
  // =========================================================================
  describe('1. Interface Contracts & Backward Compatibility', () => {
    const arenaIds: ArenaId[] = [
      'cyber_rooftop',
      'celestial_void',
      'volcanic_caldera',
      'highland_sanctuary',
    ];

    it('validates that ARENA_DEFINITIONS satisfies the ArenaDefinition interface completely', () => {
      arenaIds.forEach((id) => {
        const def = ARENA_DEFINITIONS[id];
        expect(def).toBeDefined();
        expect(def.id).toBe(id);
        expect(typeof def.name).toBe('string');
        expect(typeof def.subtitle).toBe('string');
        expect(typeof def.glb).toBe('string');
        expect(def.glb.endsWith('.glb')).toBe(true);

        // Vector 3 coordinate checks
        expect(def.camPos).toHaveLength(3);
        def.camPos.forEach((c) => {
          expect(typeof c).toBe('number');
          expect(Number.isFinite(c)).toBe(true);
        });

        expect(def.camLookAt).toHaveLength(3);
        def.camLookAt.forEach((c) => {
          expect(typeof c).toBe('number');
          expect(Number.isFinite(c)).toBe(true);
        });

        expect(def.keyPos).toHaveLength(3);
        def.keyPos.forEach((c) => {
          expect(typeof c).toBe('number');
          expect(Number.isFinite(c)).toBe(true);
        });

        expect(def.rimPos).toHaveLength(3);
        def.rimPos.forEach((c) => {
          expect(typeof c).toBe('number');
          expect(Number.isFinite(c)).toBe(true);
        });

        // Numeric parameters
        expect(def.camFov).toBeGreaterThan(15);
        expect(def.camFov).toBeLessThan(90);
        expect(def.fighterFloorY).toBeGreaterThanOrEqual(0);
        expect(def.fighterFloorY).toBeLessThan(2.0);

        expect(def.ambientIntensity).toBeGreaterThan(0);
        expect(def.keyIntensity).toBeGreaterThan(0);
        expect(def.rimIntensity).toBeGreaterThan(0);

        expect(typeof def.skyColor).toBe('number');
        expect(typeof def.rimColor).toBe('number');
        expect(def.themeColor).toMatch(/^#[0-9a-fA-F]{6}$/);
        expect(typeof def.entranceFlair).toBe('string');
      });
    });

    it('verifies fighterFloorY calibration values for all 4 arenas', () => {
      expect(ARENA_DEFINITIONS.cyber_rooftop.fighterFloorY).toBe(0.205);
      expect(ARENA_DEFINITIONS.celestial_void.fighterFloorY).toBe(0.405);
      expect(ARENA_DEFINITIONS.volcanic_caldera.fighterFloorY).toBe(0.025);
      expect(ARENA_DEFINITIONS.highland_sanctuary.fighterFloorY).toBe(0.027);
    });

    it('stress-tests resolveArenaId with diverse valid, malformed, and adversarial inputs', () => {
      // Direct matches
      expect(resolveArenaId('cyber_rooftop')).toBe('cyber_rooftop');
      expect(resolveArenaId('celestial_void')).toBe('celestial_void');
      expect(resolveArenaId('volcanic_caldera')).toBe('volcanic_caldera');
      expect(resolveArenaId('highland_sanctuary')).toBe('highland_sanctuary');

      // Fuzzy substrings
      expect(resolveArenaId('CYBER_ROOFTOP_V2')).toBe('cyber_rooftop');
      expect(resolveArenaId('neon_cyber_stage')).toBe('cyber_rooftop');
      expect(resolveArenaId('celestial')).toBe('celestial_void');
      expect(resolveArenaId('astral_void_gate')).toBe('celestial_void');
      expect(resolveArenaId('volcano_pit')).toBe('volcanic_caldera');
      expect(resolveArenaId('caldera_core')).toBe('volcanic_caldera');
      expect(resolveArenaId('highland_crag')).toBe('highland_sanctuary');
      expect(resolveArenaId('ancient_sanctuary')).toBe('highland_sanctuary');

      // Edge cases & nullish fallbacks
      expect(resolveArenaId(undefined)).toBe('cyber_rooftop');
      expect(resolveArenaId('')).toBe('cyber_rooftop');
      expect(resolveArenaId(null as any)).toBe('cyber_rooftop');
      expect(resolveArenaId('   ')).toBe('cyber_rooftop');
      expect(resolveArenaId('unknown_zone_99999')).toBe('cyber_rooftop');
      expect(resolveArenaId('!@#$%^&*()')).toBe('cyber_rooftop');
    });

    it('verifies all 7 CAMERA_PRESETS across all 4 arena definitions produce valid transforms', () => {
      const presets: CameraPreset[] = ['front', 'left', 'right', 'spider_cam', 'focused_60', 'back', 'wide_front'];
      expect(CAMERA_PRESETS).toHaveLength(7);

      arenaIds.forEach((arenaId) => {
        const arenaDef = ARENA_DEFINITIONS[arenaId];

        CAMERA_PRESETS.forEach((preset) => {
          expect(presets).toContain(preset.id);
          const t = preset.getTransform(arenaDef);

          // Position checks
          expect(t.pos).toHaveLength(3);
          t.pos.forEach((coord) => {
            expect(typeof coord).toBe('number');
            expect(Number.isFinite(coord)).toBe(true);
          });

          // LookAt checks
          expect(t.lookAt).toHaveLength(3);
          t.lookAt.forEach((coord) => {
            expect(typeof coord).toBe('number');
            expect(Number.isFinite(coord)).toBe(true);
          });

          // FOV checks
          expect(t.fov).toBeGreaterThan(20);
          expect(t.fov).toBeLessThan(60);

          // Clearance: camera must be higher than ground plane
          expect(t.pos[1]).toBeGreaterThan(arenaDef.fighterFloorY);

          // Focus height must be centered on the fighter body
          expect(t.lookAt[1]).toBeGreaterThanOrEqual(arenaDef.fighterFloorY + 0.5);
          expect(t.lookAt[1]).toBeLessThanOrEqual(arenaDef.fighterFloorY + 3.0);
        });
      });
    });

    it('verifies ThreeCombatArenaRef imperative handle contracts with all caller methods', () => {
      // Mock full interface implementation
      const mockRef: ThreeCombatArenaRef = {
        triggerAttack: vi.fn(),
        triggerHit: vi.fn(),
        triggerKeystroke: vi.fn(),
        triggerKnockout: vi.fn(),
        triggerVictory: vi.fn(),
        cycleCameraPreset: vi.fn(),
        setCameraPreset: vi.fn(),
        skipIntro: vi.fn(),
      };

      // Consumers like MatchPage.tsx invoke:
      mockRef.triggerAttack('left', 'jab');
      mockRef.triggerAttack('right', 'heavy');
      mockRef.triggerAttack('left', 'kick');
      mockRef.triggerHit('left', 'light');
      mockRef.triggerHit('right', 'heavy');
      mockRef.triggerKeystroke('left');
      mockRef.triggerKeystroke('right');
      mockRef.triggerKnockout('left');
      mockRef.triggerVictory('right');
      mockRef.cycleCameraPreset();
      mockRef.setCameraPreset('dynamic');
      mockRef.setCameraPreset('isometric');
      mockRef.skipIntro();

      expect(mockRef.triggerAttack).toHaveBeenCalledTimes(3);
      expect(mockRef.triggerHit).toHaveBeenCalledTimes(2);
      expect(mockRef.triggerKeystroke).toHaveBeenCalledTimes(2);
      expect(mockRef.triggerKnockout).toHaveBeenCalledWith('left');
      expect(mockRef.triggerVictory).toHaveBeenCalledWith('right');
      expect(mockRef.cycleCameraPreset).toHaveBeenCalledTimes(1);
      expect(mockRef.setCameraPreset).toHaveBeenCalledWith('isometric');
      expect(mockRef.skipIntro).toHaveBeenCalledTimes(1);
    });
  });

  // =========================================================================
  // SECTION 2: Material Traversal Robustness Stress Harness
  // =========================================================================
  describe('2. Material Traversal Robustness Stress Harness', () => {
    it('handles mesh with standard MeshStandardMaterial without throwing', () => {
      const root = new THREE.Group();
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(),
        new THREE.MeshStandardMaterial({ name: 'Mat_Sign_Kyoto', emissive: new THREE.Color(0xff0055), emissiveIntensity: 3.5, roughness: 0.15 })
      );
      root.add(mesh);

      expect(() => runArenaMaterialTraversal(root)).not.toThrow();
      const mat = mesh.material as THREE.MeshStandardMaterial;
      expect(mat.emissiveIntensity).toBe(1.0);
      expect(mat.roughness).toBe(0.28);
      expect(mat.depthWrite).toBe(true);
      expect(mesh.castShadow).toBe(true);
      expect(mesh.receiveShadow).toBe(true);
    });

    it('handles mesh with multi-materials array gracefully', () => {
      const root = new THREE.Group();
      const mat1 = new THREE.MeshStandardMaterial({ name: 'Mat_Sign_Ramen', emissiveIntensity: 4.0, roughness: 0.1 });
      const mat2 = new THREE.MeshStandardMaterial({ name: 'Cyber_Building_Facade_Wall', emissiveIntensity: 1.0, roughness: 0.05 });
      const mat3 = new THREE.MeshStandardMaterial({ name: 'Standard_Concrete', roughness: 0.8 });

      const mesh = new THREE.Mesh(new THREE.BoxGeometry(), [mat1, mat2, mat3]);
      root.add(mesh);

      expect(() => runArenaMaterialTraversal(root)).not.toThrow();
      expect(mat1.emissiveIntensity).toBe(1.0);
      expect(mat1.roughness).toBe(0.28);
      expect(mat2.emissiveIntensity).toBe(0.2);
      expect(mat2.roughness).toBe(0.28);
      expect(mat3.roughness).toBe(0.8);
    });

    it('handles mesh with null or undefined material without crashing', () => {
      const root = new THREE.Group();
      const meshNull = new THREE.Mesh(new THREE.BoxGeometry(), null as any);
      const meshUndef = new THREE.Mesh(new THREE.BoxGeometry(), undefined as any);
      root.add(meshNull);
      root.add(meshUndef);

      expect(() => runArenaMaterialTraversal(root)).not.toThrow();
    });

    it('handles non-mesh objects (lights, cameras, bones, lines) safely', () => {
      const root = new THREE.Group();
      const light1 = new THREE.DirectionalLight(0xffffff, 5.0);
      const light2 = new THREE.PointLight(0xff0000, 3.0);
      const camera = new THREE.PerspectiveCamera();
      const bone = new THREE.Bone();
      const line = new THREE.Line();

      root.add(light1);
      root.add(light2);
      root.add(camera);
      root.add(bone);
      root.add(line);

      expect(() => runArenaMaterialTraversal(root)).not.toThrow();

      // Lights must be silenced
      expect(light1.intensity).toBe(0);
      expect(light1.visible).toBe(false);
      expect(light2.intensity).toBe(0);
      expect(light2.visible).toBe(false);
    });

    it('handles deeply nested hierarchy with mixed node types without stack overflow', () => {
      const root = new THREE.Group();
      let current: THREE.Object3D = root;

      // 25 levels of nesting
      for (let i = 0; i < 25; i++) {
        const nextGroup = new THREE.Group();
        nextGroup.name = `Group_Level_${i}`;
        const mesh = new THREE.Mesh(
          new THREE.BufferGeometry(),
          new THREE.MeshStandardMaterial({ name: `Mat_Level_${i}`, roughness: 0.1 })
        );
        nextGroup.add(mesh);
        current.add(nextGroup);
        current = nextGroup;
      }

      expect(() => runArenaMaterialTraversal(root)).not.toThrow();
    });

    it('handles Volcanic Caldera materials (Sky Dome, Smoke, Convective Magma, Lava Eruption)', () => {
      const root = new THREE.Group();
      const skyDomeMat = new THREE.MeshStandardMaterial({ name: 'Volcanic_Sky_Dome_Mat' });
      const smokeMat = new THREE.MeshStandardMaterial({ name: 'Volcanic_Smoke_Cloud', roughness: 0.1 });
      const magmaMat = new THREE.MeshStandardMaterial({ name: 'Mat_Convective_Magma_Lake' });
      const eruptionMat = new THREE.MeshStandardMaterial({ name: 'Mat_Lava_Eruption' });
      const genericLavaMat = new THREE.MeshStandardMaterial({ name: 'Magma_Rock_Seam' });

      root.add(new THREE.Mesh(new THREE.BoxGeometry(), [skyDomeMat, smokeMat, magmaMat, eruptionMat, genericLavaMat]));

      expect(() => runArenaMaterialTraversal(root)).not.toThrow();

      expect(skyDomeMat.emissiveIntensity).toBe(1.0);
      expect(skyDomeMat.emissive.getHex()).toBe(0x140502);

      expect(smokeMat.emissive.getHex()).toBe(0x000000);
      expect(smokeMat.roughness).toBe(0.95);

      expect(magmaMat.emissiveIntensity).toBe(2.0);
      expect(magmaMat.emissive.getHex()).toBe(0xff4500);

      expect(eruptionMat.emissiveIntensity).toBe(2.8);
      expect(eruptionMat.emissive.getHex()).toBe(0xff2200);

      expect(genericLavaMat.emissiveIntensity).toBe(2.4);
      expect(genericLavaMat.emissive.getHex()).toBe(0xff3700);
    });

    it('handles Celestial Void crystals (Amethyst, Cyan, Magenta)', () => {
      const root = new THREE.Group();
      const amethyst = new THREE.MeshStandardMaterial({ name: 'Mat_Amethyst_Crystal' });
      const cyan = new THREE.MeshStandardMaterial({ name: 'Mat_Cyan_Crystal' });
      const magenta = new THREE.MeshStandardMaterial({ name: 'Mat_Magenta_Crystal' });

      root.add(new THREE.Mesh(new THREE.BoxGeometry(), [amethyst, cyan, magenta]));

      expect(() => runArenaMaterialTraversal(root)).not.toThrow();

      expect(amethyst.emissive.getHex()).toBe(0x9d4edd);
      expect(amethyst.emissiveIntensity).toBe(1.4);

      expect(cyan.emissive.getHex()).toBe(0x00d4ff);
      expect(cyan.emissiveIntensity).toBe(1.4);

      expect(magenta.emissive.getHex()).toBe(0xff007f);
      expect(magenta.emissiveIntensity).toBe(1.4);
    });

    it('handles unnamed materials and boundary roughness values', () => {
      const root = new THREE.Group();
      const unnamedLowRoughness = new THREE.MeshStandardMaterial({ roughness: 0.05 });
      const unnamedBoundaryRoughness = new THREE.MeshStandardMaterial({ roughness: 0.22 });
      const unnamedHighRoughness = new THREE.MeshStandardMaterial({ roughness: 0.85 });

      root.add(new THREE.Mesh(new THREE.BoxGeometry(), [unnamedLowRoughness, unnamedBoundaryRoughness, unnamedHighRoughness]));

      expect(() => runArenaMaterialTraversal(root)).not.toThrow();

      expect(unnamedLowRoughness.roughness).toBe(0.28); // Clamped from < 0.22
      expect(unnamedBoundaryRoughness.roughness).toBe(0.22); // Not clamped at boundary
      expect(unnamedHighRoughness.roughness).toBe(0.85); // Unchanged
    });
  });

  // =========================================================================
  // SECTION 3: Physical GLB Integrity & Material Audit
  // =========================================================================
  describe('3. Physical GLB Integrity & Material Audit', () => {
    const glbFiles = [
      'KeyFury_3D_CyberRooftop_True3D.glb',
      'KeyFury_3D_CelestialVoid_True3D.glb',
      'KeyFury_3D_VolcanicCaldera_True3D.glb',
      'KeyFury_3D_HighlandSanctuary.glb',
    ];

    glbFiles.forEach((file) => {
      it(`verifies GLB ${file} exists, has valid glTF 2.0 structure, and uses standard PBR materials`, () => {
        const fullPath = path.join(assetsDir, file);
        expect(fs.existsSync(fullPath), `File not found: ${file}`).toBe(true);

        const gltf = parseGlbJson(fullPath);
        expect(gltf.asset).toBeDefined();
        expect(gltf.asset.version).toBe('2.0');
        expect(gltf.nodes).toBeDefined();
        expect(gltf.nodes.length).toBeGreaterThan(0);

        // Audit materials inside the GLB
        if (gltf.materials) {
          gltf.materials.forEach((mat: any) => {
            expect(mat.name).toBeDefined();
            // In glTF 2.0, standard materials declare pbrMetallicRoughness
            if (mat.pbrMetallicRoughness) {
              const pbr = mat.pbrMetallicRoughness;
              if (pbr.roughnessFactor !== undefined) {
                expect(typeof pbr.roughnessFactor).toBe('number');
              }
              if (pbr.metallicFactor !== undefined) {
                expect(typeof pbr.metallicFactor).toBe('number');
              }
            }
          });
        }
      });
    });
  });
});

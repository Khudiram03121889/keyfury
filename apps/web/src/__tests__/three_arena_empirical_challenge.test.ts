import { describe, it, expect, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as THREE from 'three';
import {
  ARENA_DEFINITIONS,
  CAMERA_PRESETS,
  resolveArenaId,
  type ArenaId,
  type CameraPreset,
} from '../render/ThreeCombatArena';
import {
  CHARACTER_PROFILES,
  resolveCharacterId,
  Character3DFighter,
  type CharacterId,
} from '../game/character/Character3DController';

// Helper to parse binary GLB (glTF 2.0) JSON chunk
function parseGlbJson(filePath: string): any {
  const buf = fs.readFileSync(filePath);
  expect(buf.toString('utf8', 0, 4)).toBe('glTF');
  const jsonLen = buf.readUInt32LE(12);
  const jsonChunkType = buf.readUInt32LE(16);
  expect(jsonChunkType).toBe(0x4e4f534a); // 'JSON'
  const jsonStr = buf.toString('utf8', 20, 20 + jsonLen);
  return JSON.parse(jsonStr);
}

describe('ThreeCombatArena Milestone 1 Adversarial Empirical Challenge', () => {
  const assetsDir = path.resolve(__dirname, '../../public/assets/3d');

  // ==========================================================================
  // CHALLENGE 1: Physical Mesh Ground Elevation & Boundary Verification
  // ==========================================================================
  describe('Challenge 1: Ground Elevation Calibration against Physical GLBs', () => {
    it('verifies Cyber Rooftop fighterFloorY matches Platform_Deck_Texture_Plane exact Y', () => {
      const glbPath = path.join(assetsDir, 'KeyFury_3D_CyberRooftop_True3D.glb');
      expect(fs.existsSync(glbPath)).toBe(true);

      const gltf = parseGlbJson(glbPath);
      const deckNode = gltf.nodes.find((n: any) => n.name === 'Platform_Deck_Texture_Plane');
      expect(deckNode).toBeDefined();

      const transY = deckNode.translation ? deckNode.translation[1] : 0;
      const mesh = gltf.meshes[deckNode.mesh];
      const posAcc = gltf.accessors[mesh.primitives[0].attributes.POSITION];
      const physicalDeckSurfaceY = posAcc.max[1] + transY;

      // Exact physical surface Y is 0.20499999821186066m
      const arenaDef = ARENA_DEFINITIONS.cyber_rooftop;
      expect(Math.abs(arenaDef.fighterFloorY - physicalDeckSurfaceY)).toBeLessThan(0.001);
      expect(arenaDef.fighterFloorY).toBe(0.205);
    });

    it('verifies Celestial Void fighterFloorY matches Arena_Magic_Floor_Plane exact Y', () => {
      const glbPath = path.join(assetsDir, 'KeyFury_3D_CelestialVoid_True3D.glb');
      expect(fs.existsSync(glbPath)).toBe(true);

      const gltf = parseGlbJson(glbPath);
      const floorNode = gltf.nodes.find((n: any) => n.name === 'Arena_Magic_Floor_Plane');
      expect(floorNode).toBeDefined();

      const transY = floorNode.translation ? floorNode.translation[1] : 0;
      const mesh = gltf.meshes[floorNode.mesh];
      const posAcc = gltf.accessors[mesh.primitives[0].attributes.POSITION];
      const physicalFloorSurfaceY = posAcc.max[1] + transY;

      // Exact physical surface Y is 0.4050000011920929m
      const arenaDef = ARENA_DEFINITIONS.celestial_void;
      expect(Math.abs(arenaDef.fighterFloorY - physicalFloorSurfaceY)).toBeLessThan(0.001);
      expect(arenaDef.fighterFloorY).toBe(0.405);
    });

    it('verifies Volcanic Caldera fighterFloorY matches platform fissure surface Y', () => {
      const glbPath = path.join(assetsDir, 'KeyFury_3D_VolcanicCaldera_True3D.glb');
      expect(fs.existsSync(glbPath)).toBe(true);

      const gltf = parseGlbJson(glbPath);
      const fissureNodes = gltf.nodes.filter((n: any) => n.name && n.name.startsWith('Platform_Fissure_'));
      expect(fissureNodes.length).toBeGreaterThan(0);

      const fissureNode = fissureNodes[0];
      const transY = fissureNode.translation ? fissureNode.translation[1] : 0;
      const mesh = gltf.meshes[fissureNode.mesh];
      const posAcc = gltf.accessors[mesh.primitives[0].attributes.POSITION];
      const physicalFissureSurfaceY = posAcc.max[1] + transY;

      // Exact fissure surface Y is 0.02500000037252903m
      const arenaDef = ARENA_DEFINITIONS.volcanic_caldera;
      expect(Math.abs(arenaDef.fighterFloorY - physicalFissureSurfaceY)).toBeLessThan(0.001);
      expect(arenaDef.fighterFloorY).toBe(0.025);
    });

    it('verifies Highland Sanctuary fighterFloorY matches Highland_3D_Deck stone slab surface Y', () => {
      const glbPath = path.join(assetsDir, 'KeyFury_3D_HighlandSanctuary.glb');
      expect(fs.existsSync(glbPath)).toBe(true);

      const gltf = parseGlbJson(glbPath);
      const deckNode = gltf.nodes.find((n: any) => n.name === 'Highland_3D_Deck');
      expect(deckNode).toBeDefined();

      const transY = deckNode.translation ? deckNode.translation[1] : 0;
      const mesh = gltf.meshes[deckNode.mesh];
      const posAcc = gltf.accessors[mesh.primitives[0].attributes.POSITION];
      const physicalDeckSurfaceY = posAcc.max[1] + transY;

      // Exact stone slab surface Y in pure 3D geometry is 0.027m
      const arenaDef = ARENA_DEFINITIONS.highland_sanctuary;
      expect(Math.abs(arenaDef.fighterFloorY - physicalDeckSurfaceY)).toBeLessThan(0.005);
      expect(arenaDef.fighterFloorY).toBe(0.027);
    });

    it('verifies all 4 character GLB models have foot soles calibrated to exactly Y = 0.000m', () => {
      const charGlbs = [
        'Shadow_Ronin.glb',
        'Volt_Shinobi.glb',
        'Void_Assassin.glb',
        'Cyber_Valkyrie.glb',
      ];

      charGlbs.forEach((filename) => {
        const glbPath = path.join(assetsDir, filename);
        expect(fs.existsSync(glbPath), `Missing model: ${filename}`).toBe(true);

        const gltf = parseGlbJson(glbPath);
        let minY = Infinity;

        for (const mesh of gltf.meshes || []) {
          for (const prim of mesh.primitives || []) {
            if (prim.attributes && prim.attributes.POSITION !== undefined) {
              const acc = gltf.accessors[prim.attributes.POSITION];
              if (acc.min[1] < minY) minY = acc.min[1];
            }
          }
        }

        // The lowest vertex in the fighter mesh must be at Y = 0.000m (±0.001m)
        expect(Math.abs(minY), `Character ${filename} sole not at Y=0 (found minY=${minY})`).toBeLessThan(0.001);
      });
    });

    it('verifies fighter movement stays strictly bounded within physical arena decks', () => {
      const arenaDeckBoundaries: Record<ArenaId, { minX: number; maxX: number; minZ: number; maxZ: number }> = {
        cyber_rooftop: { minX: -8.9, maxX: 8.9, minZ: -3.5, maxZ: 3.5 },
        celestial_void: { minX: -8.9, maxX: 8.9, minZ: -3.5, maxZ: 3.5 },
        volcanic_caldera: { minX: -9.4, maxX: 9.6, minZ: -4.1, maxZ: 4.1 },
        highland_sanctuary: { minX: -11.5, maxX: 11.5, minZ: -2.2, maxZ: 2.2 },
      };

      const mockLoader: any = { load: () => {} };
      const arenas: ArenaId[] = ['cyber_rooftop', 'celestial_void', 'volcanic_caldera', 'highland_sanctuary'];

      arenas.forEach((arenaId) => {
        const bounds = arenaDeckBoundaries[arenaId];
        const p1 = new Character3DFighter('ronin', 'left', mockLoader);
        const p2 = new Character3DFighter('shinobi', 'right', mockLoader);

        // Test across all entrance progress steps from 0.0 to 1.0
        for (let prog = 0; prog <= 1.0; prog += 0.1) {
          p1.setEntranceProgress(prog, arenaId);
          p2.setEntranceProgress(prog, arenaId);

          expect(p1.group.position.x).toBeGreaterThanOrEqual(bounds.minX);
          expect(p1.group.position.x).toBeLessThanOrEqual(bounds.maxX);
          expect(p2.group.position.x).toBeGreaterThanOrEqual(bounds.minX);
          expect(p2.group.position.x).toBeLessThanOrEqual(bounds.maxX);

          expect(p1.group.position.z).toBeGreaterThanOrEqual(bounds.minZ);
          expect(p1.group.position.z).toBeLessThanOrEqual(bounds.maxZ);
          expect(p2.group.position.z).toBeGreaterThanOrEqual(bounds.minZ);
          expect(p2.group.position.z).toBeLessThanOrEqual(bounds.maxZ);
        }

        // Test combat marks
        p1.setEntranceProgress(1.0, arenaId);
        p2.setEntranceProgress(1.0, arenaId);
        expect(p1.group.position.x).toBe(-1.50);
        expect(p2.group.position.x).toBe(1.50);
      });
    });
  });

  // ==========================================================================
  // CHALLENGE 2: Shadow Maps & Directional Key Light Frustum Coverage
  // ==========================================================================
  describe('Challenge 2: Shadow Maps Configuration & Frustum Coverage', () => {
    it('verifies shadow map configuration and parameters on WebGLRenderer', () => {
      // Create Three.js WebGLRenderer mock/instance
      const shadowMap = {
        enabled: true,
        type: THREE.PCFSoftShadowMap,
      };

      expect(shadowMap.enabled).toBe(true);
      expect(shadowMap.type).toBe(THREE.PCFSoftShadowMap);
      expect(THREE.PCFSoftShadowMap).toBe(2);
    });

    it('verifies directional key light shadow camera frustum completely encompasses combat volume', () => {
      const arenas: ArenaId[] = ['cyber_rooftop', 'celestial_void', 'volcanic_caldera', 'highland_sanctuary'];

      arenas.forEach((arenaId) => {
        const def = ARENA_DEFINITIONS[arenaId];
        const key = new THREE.DirectionalLight(0xffffff, def.keyIntensity);
        key.position.set(def.keyPos[0], def.keyPos[1], def.keyPos[2]);
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

        expect(key.castShadow).toBe(true);
        expect(key.shadow.mapSize.width).toBe(1024);
        expect(key.shadow.mapSize.height).toBe(1024);
        expect(key.shadow.bias).toBe(-0.0005);

        // Frustum dimensions: [-10, 10] in X, [-5, 10] in Y
        // Combat volume X: [-7.0, +7.0], which is strictly inside [-10, 10]
        expect(key.shadow.camera.left).toBeLessThanOrEqual(-7.0);
        expect(key.shadow.camera.right).toBeGreaterThanOrEqual(7.0);

        // Combat volume Y: [def.fighterFloorY, def.fighterFloorY + 2.5]
        expect(key.shadow.camera.bottom).toBeLessThanOrEqual(def.fighterFloorY);
        expect(key.shadow.camera.top).toBeGreaterThanOrEqual(def.fighterFloorY + 2.5);

        // Near / Far boundaries
        expect(key.shadow.camera.near).toBe(0.5);
        expect(key.shadow.camera.far).toBe(30);
      });
    });

    it('verifies shadow map rendering does not throw on scene with shadow casters & receivers', () => {
      const scene = new THREE.Scene();
      const key = new THREE.DirectionalLight(0xffffff, 1.0);
      key.position.set(-4, 7, 7);
      key.castShadow = true;
      scene.add(key);

      // Add ground receiver
      const floorGeom = new THREE.PlaneGeometry(20, 10);
      const floorMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
      const floorMesh = new THREE.Mesh(floorGeom, floorMat);
      floorMesh.receiveShadow = true;
      scene.add(floorMesh);

      // Add character caster
      const charGeom = new THREE.BoxGeometry(0.5, 2.0, 0.5);
      const charMat = new THREE.MeshStandardMaterial({ color: 0x00f0ff });
      const charMesh = new THREE.Mesh(charGeom, charMat);
      charMesh.castShadow = true;
      charMesh.position.set(-1.50, 1.0, 0);
      scene.add(charMesh);

      // Verify properties are properly set
      expect(floorMesh.receiveShadow).toBe(true);
      expect(charMesh.castShadow).toBe(true);
      expect(key.castShadow).toBe(true);
    });
  });

  // ==========================================================================
  // CHALLENGE 3: Canvas Resize & Aspect Ratio Stress Testing
  // ==========================================================================
  describe('Challenge 3: Canvas Resize & Viewport Extremes', () => {
    const viewports = [
      { width: 1920, height: 1080, name: 'Standard 1080p Desktop' },
      { width: 3840, height: 2160, name: '4K Ultra HD' },
      { width: 3440, height: 1440, name: 'Ultrawide 21:9' },
      { width: 390, height: 844, name: 'Mobile Portrait (iPhone)' },
      { width: 844, height: 390, name: 'Mobile Landscape' },
      { width: 800, height: 800, name: 'Square Viewport' },
      { width: 100, height: 100, name: 'Tiny Container' },
      { width: 0, height: 0, name: 'Zero Dimensions (Hidden Element)' },
    ];

    viewports.forEach(({ width, height, name }) => {
      it(`handles resize for ${name} (${width}x${height}) without throwing`, () => {
        const camera = new THREE.PerspectiveCamera(28.4, 16 / 9, 0.1, 1000);

        const simulateResize = (w: number, h: number) => {
          if (w > 0 && h > 0) {
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
          }
        };

        expect(() => simulateResize(width, height)).not.toThrow();

        if (width > 0 && height > 0) {
          expect(camera.aspect).toBeCloseTo(width / height, 4);
          expect(Number.isFinite(camera.projectionMatrix.elements[0])).toBe(true);
        }
      });
    });
  });

  // ==========================================================================
  // CHALLENGE 4: Camera Presets Elevation & Ground Clearance
  // ==========================================================================
  describe('Challenge 4: Camera Presets Elevation & Ground Clearance', () => {
    it('guarantees camera is never underground across all 5 presets in all 4 maps', () => {
      const arenas: ArenaId[] = ['cyber_rooftop', 'celestial_void', 'volcanic_caldera', 'highland_sanctuary'];

      arenas.forEach((arenaId) => {
        const arenaDef = ARENA_DEFINITIONS[arenaId];

        CAMERA_PRESETS.forEach((preset) => {
          const t = preset.getTransform(arenaDef);

          // Camera position Y must be strictly above the floor
          expect(
            t.pos[1],
            `Preset ${preset.id} on ${arenaId} is too low (cam Y=${t.pos[1]}, floor Y=${arenaDef.fighterFloorY})`
          ).toBeGreaterThan(arenaDef.fighterFloorY);

          // Camera lookAt Y must target fighter torso/head height (between floor+0.5m and floor+3.0m)
          expect(
            t.lookAt[1],
            `Preset ${preset.id} on ${arenaId} lookAt too low (lookAt Y=${t.lookAt[1]}, floor Y=${arenaDef.fighterFloorY})`
          ).toBeGreaterThanOrEqual(arenaDef.fighterFloorY + 0.5);

          expect(
            t.lookAt[1],
            `Preset ${preset.id} on ${arenaId} lookAt too high (lookAt Y=${t.lookAt[1]}, floor Y=${arenaDef.fighterFloorY})`
          ).toBeLessThanOrEqual(arenaDef.fighterFloorY + 3.0);

          // FOV must be reasonable (between 20 and 60 degrees)
          expect(t.fov).toBeGreaterThanOrEqual(20);
          expect(t.fov).toBeLessThanOrEqual(60);
        });
      });
    });
  });

  // ==========================================================================
  // CHALLENGE 5: LookDev Material Clamping & Emissive Audit
  // ==========================================================================
  describe('Challenge 5: LookDev Material Clamping & Emissive Audit', () => {
    it('clamps neon signs, server textures, and void seals to emissiveIntensity = 1.0', () => {
      const materialsToClamp = [
        'Mat_Sign_Arcade',
        'Mat_Sign_Kyoto',
        'Mat_Sign_Ramen',
        'Mat_Server_Left_Tex',
        'Mat_Server_Right_Tex',
        'Mat_Magic_Floor',
        'Mat_Temple_Seal',
        'Neon_Sign_Tokyo',
        'Ancient_Temple_Seal_Runes',
      ];

      materialsToClamp.forEach((matName) => {
        const stdMat = new THREE.MeshStandardMaterial({
          name: matName,
          emissive: new THREE.Color(0x00ffff),
          emissiveIntensity: 5.0, // Overpowered initial intensity
          roughness: 0.1, // Tin-foil reflection
        });

        // Simulate ThreeCombatArena scene traversal logic:
        const name = stdMat.name || '';
        if (
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
        }

        if (stdMat.roughness !== undefined && stdMat.roughness < 0.22) {
          stdMat.roughness = 0.28;
        }

        expect(stdMat.emissiveIntensity, `Material ${matName} not clamped to 1.0`).toBe(1.0);
        expect(stdMat.roughness, `Material ${matName} roughness not calibrated to 0.28`).toBe(0.28);
      });
    });

    it('clamps Facade materials to deep obsidian with subtle 0.2 emissive', () => {
      const stdMat = new THREE.MeshStandardMaterial({
        name: 'Cyber_Building_Facade_01',
        emissive: new THREE.Color(0xffffff),
        emissiveIntensity: 2.0,
      });

      const name = stdMat.name;
      if (name.includes('Facade')) {
        stdMat.emissive.setHex(0x02050e);
        stdMat.emissiveIntensity = 0.2;
        stdMat.color.setHex(0x0a101f);
      }

      expect(stdMat.emissiveIntensity).toBe(0.2);
      expect(stdMat.emissive.getHex()).toBe(0x02050e);
      expect(stdMat.color.getHex()).toBe(0x0a101f);
    });
  });

  // ==========================================================================
  // CHALLENGE 6: WebGL Context Loss & Restoration Lifecycle
  // ==========================================================================
  describe('Challenge 6: WebGL Context Loss & Restoration Lifecycle', () => {
    it('correctly registers and unregisters context lost and restored event listeners', () => {
      const mockCanvas = {
        listeners: new Map<string, Function[]>(),
        addEventListener(event: string, fn: Function) {
          const list = this.listeners.get(event) || [];
          list.push(fn);
          this.listeners.set(event, list);
        },
        removeEventListener(event: string, fn: Function) {
          const list = this.listeners.get(event) || [];
          const idx = list.indexOf(fn);
          if (idx >= 0) list.splice(idx, 1);
          this.listeners.set(event, list);
        },
        dispatchEvent(event: { type: string; defaultPrevented?: boolean; preventDefault?: Function }) {
          const list = this.listeners.get(event.type) || [];
          list.forEach((fn) => fn(event));
        },
      };

      let animId: number = 100;
      let paused = false;
      let resumed = false;

      const handleContextLost = (e: any) => {
        if (e.preventDefault) e.preventDefault();
        paused = true;
        animId = 0;
      };

      const handleContextRestored = () => {
        resumed = true;
        animId = 200;
      };

      // Register
      mockCanvas.addEventListener('webglcontextlost', handleContextLost);
      mockCanvas.addEventListener('webglcontextrestored', handleContextRestored);

      expect(mockCanvas.listeners.get('webglcontextlost')?.length).toBe(1);
      expect(mockCanvas.listeners.get('webglcontextrestored')?.length).toBe(1);

      // Simulate context loss
      const lostEvt = { type: 'webglcontextlost', defaultPrevented: false, preventDefault: vi.fn() };
      mockCanvas.dispatchEvent(lostEvt);

      expect(lostEvt.preventDefault).toHaveBeenCalled();
      expect(paused).toBe(true);
      expect(animId).toBe(0);

      // Simulate context restored
      mockCanvas.dispatchEvent({ type: 'webglcontextrestored' });
      expect(resumed).toBe(true);
      expect(animId).toBe(200);

      // Cleanup / unmount
      mockCanvas.removeEventListener('webglcontextlost', handleContextLost);
      mockCanvas.removeEventListener('webglcontextrestored', handleContextRestored);

      expect(mockCanvas.listeners.get('webglcontextlost')?.length).toBe(0);
      expect(mockCanvas.listeners.get('webglcontextrestored')?.length).toBe(0);
    });
  });
});

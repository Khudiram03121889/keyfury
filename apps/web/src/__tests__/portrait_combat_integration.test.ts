import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Portrait Mode Mobile Combat Architecture Integration Tests', () => {
  const matchPagePath = path.resolve(__dirname, '../pages/MatchPage.tsx');
  const arenaPath = path.resolve(__dirname, '../render/ThreeCombatArena.tsx');
  const capacitorPath = path.resolve(__dirname, '../../capacitor.config.json');
  const manifestPath = path.resolve(__dirname, '../../android/app/src/main/AndroidManifest.xml');

  const matchPageCode = fs.readFileSync(matchPagePath, 'utf-8');
  const arenaCode = fs.readFileSync(arenaPath, 'utf-8');
  const capacitorCode = fs.readFileSync(capacitorPath, 'utf-8');
  const manifestCode = fs.readFileSync(manifestPath, 'utf-8');

  describe('1. Portrait Viewport & wordsPerLine Constraints', () => {
    it('P1.1: defines isPortrait state tracking viewport width and aspect ratio', () => {
      expect(matchPageCode).toContain('const isPortrait = React.useMemo(');
      expect(matchPageCode).toMatch(/viewportWidth\s*<\s*768\s*\|\|\s*viewportHeight\s*>\s*viewportWidth/);
    });

    it('P1.2: restricts wordsPerLine to 2 in portrait mode to eliminate horizontal jitter', () => {
      expect(matchPageCode).toMatch(/if\s*\(isPortrait\)\s*return\s*2;/);
    });
  });

  describe('2. Dedicated Minimalist Numeric HUD in Portrait', () => {
    it('P2.1: renders dedicated top-hud-portrait container when isPortrait is true', () => {
      expect(matchPageCode).toContain('data-testid="top-hud-portrait"');
      expect(matchPageCode).toMatch(/isPortrait\s*\?\s*\(\s*<div[^>]*data-testid="top-hud-portrait"/);
    });

    it('P2.2: provides numeric health text with data-testid for left and right fighters', () => {
      expect(matchPageCode).toMatch(/data-testid="left-health"[^>]*>\s*\{leftHealth\}\s*HP/);
      expect(matchPageCode).toMatch(/data-testid="right-health"[^>]*>\s*\{rightHealth\}\s*HP/);
    });

    it('P2.3: maintains 36px ultra-compact height with safe area inset support', () => {
      expect(matchPageCode).toMatch(/height:\s*'36px'/);
      expect(matchPageCode).toMatch(/top:\s*'env\(safe-area-inset-top,\s*6px\)'/);
    });
  });

  describe('3. Ergonomic Two-Thumb Portrait Typing Deck Docking', () => {
    it('P3.1: docks typing banner to bottom when in portrait mode', () => {
      expect(matchPageCode).toMatch(/bottom:\s*isPortrait\s*\?\s*\(keyboardOffset\s*>\s*0\s*\?\s*'8px'\s*:\s*'18px'\)/);
      expect(matchPageCode).toMatch(/transform:\s*\(isPortrait\s*\|\|\s*keyboardOffset\s*>\s*0\)\s*\?\s*'translateX\(-50%\)'/);
    });

    it('P3.2: sets line 1 font size to crisp 20px (1.25rem) monospace for portrait typing', () => {
      expect(matchPageCode).toMatch(/fontSize:\s*isPortrait\s*\?\s*'1.25rem'/);
      expect(matchPageCode).toContain("'JetBrains Mono'");
    });

    it('P3.3: sets line 2 preview font size to 0.92rem in portrait mode', () => {
      expect(matchPageCode).toMatch(/fontSize:\s*isPortrait\s*\?\s*'0.92rem'/);
    });
  });

  describe('4. Three.js Portrait Dynamic Camera FOV & Frustum Compensation', () => {
    it('P4.1: detects aspect < 1.0 in ThreeCombatArena and calculates portrait camera transform', () => {
      expect(arenaCode).toMatch(/if\s*\(aspect\s*<\s*1\.0\)/);
      expect(arenaCode).toContain('targetCamPos.current.set(t.pos[0] * 0.7, t.pos[1] + 0.75, portraitZDist);');
      expect(arenaCode).toContain('targetCamLookAt.current.set(t.lookAt[0], t.lookAt[1] + 0.25, t.lookAt[2]);');
    });

    it('P4.2: clamps portrait FOV between 34 and 52 degrees to prevent wide-angle distortion', () => {
      expect(arenaCode).toMatch(/Math\.min\(Math\.max\(requiredVFovDeg,\s*34\),\s*52\)/);
    });

    it('P4.3: handles resize events and integrates ResizeObserver for container bounds', () => {
      expect(arenaCode).toContain('camera.aspect = container.clientWidth / Math.max(container.clientHeight, 1);');
      expect(arenaCode).toContain('applyPresetTransformRef.current(activePresetIndexRef.current);');
      expect(arenaCode).toContain('resizeObserver.observe(container);');
    });
  });

  describe('5. Android Capacitor Configuration & Manifest Verification', () => {
    it('P5.1: locks orientation to portrait in capacitor.config.json', () => {
      const config = JSON.parse(capacitorCode);
      expect(config.plugins?.ScreenOrientation?.orientation).toBe('portrait');
      expect(config.plugins?.Keyboard?.resize).toBe('body');
    });

    it('P5.2: configures sensorPortrait and adjustResize in AndroidManifest.xml', () => {
      expect(manifestCode).toContain('android:screenOrientation="sensorPortrait"');
      expect(manifestCode).toContain('android:windowSoftInputMode="adjustResize"');
    });
  });
});

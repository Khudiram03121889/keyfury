# Project: KeyFury (Keyboard Stickman Warrior) — Mobile Cyberpunk Virtual Touch Keypad

## Architecture
KeyFury is a real-time multiplayer 1v1 cyberpunk typing combat duel built as a monorepo (`pnpm` workspaces):
- `apps/web`: React + Vite + Phaser 3 client application with Web Audio sound synthesis (`SoundSynth.ts`).
- `apps/game-server`: Node.js + Colyseus multiplayer game room (`CombatRoom.ts`) running state synchronization at 60Hz.
- `packages/game-core`: Pure TypeScript combat rules engine (`combat.ts`, sequence validation, typo stun, combo scaling, damage formula).
- `packages/protocol`: Message definitions (`messages.ts`), schema types, and state models.
- `packages/content`: Word banks, difficulty categories, and combat dictionary assets.

### Input & Viewport Architecture
1. **Desktop Input Mode**: Global window capture `keydown` listener captures physical ASCII keystrokes and dispatches `key_intent` `{ seq, key, clientTimeMs }` to Colyseus.
2. **Mobile Input Mode**: A custom, low-latency, cyberpunk on-screen virtual touch keypad (`VirtualKeypad.tsx`) mounts in the lower zone (~45% viewport height). It intercepts touch/pointer events with `preventDefault()` (preventing native soft keyboard focus/popups and browser pinch-zoom), renders responsive neon keycaps with active target character highlighting, triggers instant procedural mechanical click SFX, and dispatches `handleKeyPress(char)` directly to Colyseus.
3. **Viewport & Arena Framing**: The viewport uses a responsive flex column layout on mobile. The upper zone (~55% viewport height) hosts the Phaser canvas (`Phaser.Scale.RESIZE`), compact player health cards, match timer, combo streak pill, and a prominent active word typing banner directly above the keypad for seamless thumb ergonomics.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Server Selection UI Removal | Complete cleanup of obsolete server modals/toggles; verify production env defaults | M1 | Survey / R3 |
| 2 | Virtual Keypad Component | Custom 4-row QWERTY touch keyboard with neon styling, tap animations, active key glow | M2 | Survey / R1 |
| 3 | Low-Latency Touch Handlers | `onTouchStart`/`onPointerDown` with `preventDefault()` to prevent OS soft keyboard popups | M2 | Survey / R1 |
| 4 | Virtual Keypad SFX | Tactile mechanical click sounds via `SoundSynth.playMechanicalClick` on key tap | M2 | Survey / R1 |
| 5 | Dual-Input Dispatch Pipeline | Direct `handleKeyPress` Colyseus dispatch with sequence numbers while preserving desktop physical keyboard | M2 | Survey / R1 |
| 6 | Mobile Arena Split-Viewport Framing | Upper arena zone (50-55% vh) framing Phaser stickman duel canvas and compact HUD | M3 | Survey / R2 |
| 7 | Active Word Banner Ergonomics | Prominent active typing word and combo pill positioned directly above keypad for thumb typing | M3 | Survey / R2 |
| 8 | OS Keyboard Elimination | Remove full-screen invisible `<input>` and refocus loops causing viewport squishing | M3 | Survey / R1, R2 |
| 9 | Comprehensive Verification & Build | Full typecheck, unit/integration test suite, production Vite build, zero TS errors | M4 | Survey / R4 |
| 10 | Visual Polish & Git Commit | Multi-resolution viewport verification (iPhone/Android/Desktop), git staging and commit | M4 | Survey / R4 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Server Selection UI Cleanup & Verification | Verify complete elimination of server modals and confirm clean production env binding | none | DONE |
| 2 | Cyberpunk Virtual Touch Keypad Component | Implement `VirtualKeypad.tsx`, ergonomic QWERTY layout, neon glow animations, active key lighting, and tactile SFX | M1 | IN_PROGRESS |
| 3 | Mobile Arena Framing, Viewport UX & Input Integration | Implement mobile dual-pane viewport in `MatchPage.tsx`, remove invisible input/refocus loops, frame arena & active word banner above keypad | M2 | PLANNED |
| 4 | Verification, Visual Inspection, Tests & Git Commit | Execute comprehensive test suites, build checks, visual checks across mobile viewports, and commit changes to git | M3 | PLANNED |

## Interface Contracts
### `VirtualKeypad` Props
```typescript
export interface VirtualKeypadProps {
  onKeyPress: (char: string) => void;
  activeChar?: string; // Current required character in active word (lowercased)
  disabled?: boolean;  // True when match is paused, countdown, or player is stunned
  isStunned?: boolean; // Visual glitch/lockout effect during typo stun
}
```

### Key Intent Message Contract (`packages/protocol/src/messages.ts`)
```typescript
export interface ClientMessageKeyIntent {
  type: 'key_intent';
  seq: number;
  key: string;
  clientTimeMs: number;
}
```

### Match Page Integration Contract
- `handleKeyPress(char: string)`:
  - Increments `keySeqRef.current++`
  - Sends `{ type: 'key_intent', seq: keySeqRef.current, key: char, clientTimeMs: Date.now() }` via Colyseus room
  - Runs local optimistic feedback and triggers mechanical click sound

## Code Layout
- `apps/web/src/components/game/VirtualKeypad.tsx`: Virtual touch keypad component with cyberpunk styling and touch event handling.
- `apps/web/src/components/game/VirtualKeypad.test.tsx`: Unit tests for virtual keypad interactions, layout, and active char highlighting.
- `apps/web/src/pages/MatchPage.tsx`: Game arena screen, viewport layout, dual-pane mobile container, active word banner positioning, input routing.
- `apps/web/src/game/audio/SoundSynth.ts`: Web Audio procedural sound synthesizer for tactile key clicks and combat audio.
- `apps/web/src/index.css`: Cyberpunk theme tokens, glassmorphism, responsive keycap styles, touch-action utilities.

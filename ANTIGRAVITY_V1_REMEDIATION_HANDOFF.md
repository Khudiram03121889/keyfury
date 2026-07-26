# KeyFury v1 Remediation Handoff — Do Not Treat as Optional

You are taking over an incomplete implementation. Your task is to make the repository a **genuine, usable v1 1v1 human-vs-human typing duel**, as defined by `FIRST_RELEASE_1V1_BUILD_SPEC.md`.

This is a remediation task, not a cosmetic pass. Do not reply that features are implemented unless you have run and passed the required verification at the end of this document.

## Working rules

1. Read `FIRST_RELEASE_1V1_BUILD_SPEC.md` fully before editing.
2. Inspect the current code. Preserve only code that conforms to the specification.
3. Do not add placeholders, mocked success states, demo-only paths, bots, fake multiplayer, or tests that avoid the real product path.
4. Do not put secrets in source code, documentation, committed `.env` files, or browser bundles.
5. Do not claim completion based on a landing-page test, a mocked room, a bot, or a test that suppresses real connection/authentication failures.
6. Use TypeScript strict mode. Keep combat resolution server-authoritative.
7. Make focused commits only if this repository has valid Git metadata. Do not rewrite or remove unrelated user work.

## Non-negotiable scope

The v1 product has one gameplay mode only:

- Desktop, English QWERTY, unranked, **human-vs-human 1v1** typing duels.
- A player chooses Quick Duel or Challenge a Friend.
- Both human players join, both click Ready, see a 3-2-1 countdown, then play a 90-second match.
- They type complete active English words to make their own stick fighter attack the other player.
- The server decides input validity, combo, damage, health, timer, forfeit, and winner.
- The result page supports two-player rematch, copying a challenge link, returning to lobby, and showing saved match statistics.

Remove the bot/practice/single-player mode entirely from UI, server, tests, and documentation. It violates the v1 scope and must not be used to make tests pass.

## Existing defects that must be fixed

### A. Local startup and configuration

1. `pnpm dev` must start both `apps/web` and `apps/game-server` successfully using the documented root `.env` file.
2. Resolve the dotenv working-directory problem. The server must explicitly load the root environment file, or the development scripts must provide it correctly.
3. When required environment values are absent, provide a clear, safe, actionable startup error. Do not silently use invalid credentials or fake successful multiplayer.
4. Update `.env.example` and `README.md` with exact setup and commands. Never place a real Supabase service-role key in client code or documentation.
5. Add a valid ESLint flat config so `pnpm lint` runs and passes.

### B. Supabase, identity, persistence, and security

1. Add the required `supabase/migrations/` SQL migrations and RLS policies from the build specification:
   - `profiles`
   - `matches`
   - `match_players`
   - `match_events`
2. Browser clients must use anonymous Supabase authentication. If anonymous guest creation fails, show a retryable error and do **not** enter matchmaking.
3. Remove hard-coded Supabase endpoint/key fallbacks from browser source. Use Vite environment variables only.
4. The browser must never receive a service-role key or write combat outcomes directly.
5. Persist each final result exactly once through the server. Store the rules version, content version, deck seed, compact event record, player stats, end reason, and integrity status.
6. If persistence fails, retain the authoritative result, retry once, and log the failure without changing the displayed winner.
7. Recent history must display only the latest 10 matches for the current guest.

### C. Real matchmaking and private challenges

1. Implement a public quick-match queue which pairs the two earliest waiting compatible human players into one room.
2. Do not place a quick-match player in a private challenge room.
3. A quick-match player waiting more than 30 seconds remains queued and sees a prominent Create a Challenge Link option. Do not substitute a bot.
4. Implement challenge rooms with:
   - an unguessable room token;
   - a short displayed room code;
   - a shareable URL;
   - automatic join when a visitor opens that URL;
   - maximum two human players;
   - expiry when no second player joins within 10 minutes.
5. Show Connected, Reconnecting, or Connection Lost throughout the lobby/match flow.
6. A player leaving before the match starts must return the other player to the lobby with an explanation.

### D. Server-authoritative combat and fair play

1. Keep all combat rules in one shared, versioned game-core rules module:
   - 90 seconds, 100 health;
   - jab 5 damage for 3–4 letters;
   - kick 8 damage for 5–6 letters;
   - heavy 12 damage for 7–9 letters;
   - combo bonus +1 per level capped at +4;
   - 20 key intents/sec with a documented short burst allowance;
   - 15-second reconnect grace period.
2. Validate every message with the shared Zod protocol schema.
3. Enforce strictly increasing per-player `seq` values. Duplicate, late, invalid, and out-of-order messages must not change game state.
4. Validate the expected next lower-case ASCII character on the server. Incorrect printable input must not advance the word and must reset combo.
5. Use server receipt time only for combat timing. Track each word from activation to accepted final character.
6. Implement reconnection with the framework's supported reservation/rejoin mechanism. A reconnect inside 15 seconds restores the authoritative snapshot; after 15 seconds, award a forfeit. If both players disconnect, do not manufacture a winner.
7. Detect and flag sustained implausible input timing and repeated rate-limit violations. Do not auto-ban.
8. Make final persistence idempotent and include a compact replay/event stream sufficient to reproduce final state.

### E. Word deck

1. Keep the word list in `packages/content`, versioned as `en-us-v1`.
2. Use 300+ common, neutral, lowercase ASCII English words, each exactly 3–9 letters.
3. Remove all invalid long words and duplicates. Exclude proper names, brands, profanity/slurs, sexual content, political terms, punctuation, numerals, and ambiguous spellings.
4. Ensure a seeded deck is deterministic and balances jab/kick/heavy difficulty across the 90-second match. Both players receive the same ordered deck.
5. Store both rules and content version with each persisted match.

### F. Actual fighting experience and UI

The key gameplay experience must be visible, understandable, and playable without developer assistance.

1. Mount the Phaser arena only for an active match and ensure it visibly renders two distinct stick fighters on a dark high-contrast arena.
2. Make fighters visibly attack on completed words:
   - wind-up;
   - jab/kick/heavy pose determined by word length;
   - hit reaction;
   - damage number/callout;
   - health-bar change;
   - combo callout;
   - brief screen shake;
   - sound effect.
3. Correct typing: immediate caret advance and subtle feedback.
4. Incorrect typing: red word flash and short error sound; do not interrupt the match.
5. Never cover the active word with effects. The active word must remain fully legible, with typed and remaining characters clearly differentiated.
6. The HUD must show correct values for both players: health, timer, active word, accepted WPM, accuracy, combo, and words completed. In particular, 0 HP must display as 0, never 100.
7. Include a functional mute toggle and honor `prefers-reduced-motion`.
8. Keep focus for match typing only while the match is active; release it on result/leave.
9. Add usable loading, server-wake, retry, cancel, reconnect, connection-loss, and leave-match states.

Important clarification: v1 uses individual active words, not sentence-typing prompts. If you add sentence prompts, do so only after the specified active-word duel is complete and do not replace the core loop.

### G. Result and rematch

1. Result page must show win/loss/draw, final health, accepted WPM, accuracy, highest combo, and words completed for **both** human players.
2. Ensure the result explanation matches the real reason: knockout, timer, draw, or forfeit.
3. Rematch must require both players to vote yes.
4. Once both accept, create a fresh match ID, fresh deck seed/deck, reset all state, run a new 3-second countdown, and navigate both clients back to the arena.
5. Do not reuse previous match result state.

## Required tests — no shortcuts

Replace the current bot-oriented test with real tests. Tests must fail when the real feature is broken.

### Unit tests

- Deterministic same-seed deck.
- Equal deck/difficulty for both players.
- Correct key advances one character.
- Incorrect key does not advance and resets combo.
- Attack kind/base damage by all word-length buckets.
- Combo and health caps.
- Knockout, timer win, draw, forfeit, and reconnect outcomes.
- Strict sequence validation.
- Replaying stored event stream produces saved final state.
- Content validation: at least 300 unique lowercase 3–9-character words.

### Server integration tests

- Two clients join the quick queue and are paired in one match.
- Challenge creator and a second isolated client join via the actual URL/token.
- Third client is rejected.
- Challenge expiry works.
- Invalid, duplicate, out-of-order, and rate-limited key intents cannot modify state.
- Reconnect within 15 seconds restores state; later reconnect causes forfeit.
- Persistence is idempotent.

### Playwright end-to-end tests

Use two isolated browser contexts for the genuine human-vs-human flow:

1. New guest reaches lobby.
2. One creates a challenge; the other opens and joins its copied URL.
3. Both click Ready.
4. Both see countdown and two visible stick fighters.
5. One player types complete displayed words; the opponent sees attacks, damage, and health change.
6. Incorrect key visibly flashes an error and resets combo.
7. A real result appears with correct statistics.
8. Both accept rematch and enter a fresh countdown/match.
9. Mute and reduced-motion behavior work.
10. Keyboard navigation on landing, lobby, errors, and results has no focus trap.

Do not suppress console errors. The test must fail on unexpected page errors, failed required network requests, or missing game-server connection.

## Completion gate

Do not report success until all commands pass from a clean setup:

```powershell
pnpm install
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
```

Before your final response, perform and report this manual verification:

1. Open two fresh browser sessions.
2. Create and join an actual challenge link.
3. Ready both players and play enough words to visibly trigger jab, kick, and heavy attacks.
4. Confirm damage, 0 HP, winner, result stats, and rematch are correct on both screens.
5. Confirm the server stays running via the documented `pnpm dev` command.

## Final response format

Respond with only:

1. A concise list of changed files and what each changed.
2. Exact commands run and their pass/fail output summary.
3. A short manual two-browser verification result.
4. Any remaining blocker. If any core acceptance criterion is not complete, say **NOT COMPLETE** clearly; do not claim v1 is done.

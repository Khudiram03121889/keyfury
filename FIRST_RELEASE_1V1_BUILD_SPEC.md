# KeyFury 1v1 Founder Beta - Build Specification

**Purpose:** This is the implementation handoff for the first complete public version of the game. An engineering agent should treat the scope, requirements, and acceptance criteria below as the build contract.

**Product mark:** a desktop visitor can open a URL, enter a live 1v1 typing fight with another person, type words to attack, see a clear winner in 90 seconds, rematch or share a challenge link, and leave knowing why they won or lost.

**Target:** founder beta / unranked public alpha.  
**Audience:** English-language desktop users with a physical QWERTY keyboard.  
**Business model:** none in this release. The game is free for players.  
**Working name:** KeyFury. Do not use the Steam title or imply an affiliation with any existing typing game.

---

## 1. Scope lock

Build **one game mode only**: live, unranked, human-vs-human 1v1 typing duels.

### In scope

- Landing page and a play-now path.
- Guest identity without mandatory signup.
- Public quick-match queue.
- Private challenge link / room code for inviting a friend.
- One 90-second 1v1 match format.
- One arena, two default stick fighters, one English word deck.
- Deterministic, server-authoritative combat resolution.
- Match result, rematch, and copyable challenge link.
- Saved match summary and basic recent-match list for the guest/profile.
- Minimal fair-play validation, error handling, settings, analytics, and tests.

### Explicitly out of scope

- AI/bot opponents and single-player game modes.
- Ratings, ranked queue, leaderboards, seasons, tournaments, teams, chat, friends, and spectators.
- Accounts beyond anonymous/guest identity; no email/OAuth UI in v1.
- Payments, ads, cosmetics, inventory, battle pass, marketplace, or virtual currency.
- Mobile gameplay, custom keyboard layouts, localisation, voice/chat, user-generated content, or video export.
- Physics combat, character movement controls, weapons, unlockable fighters, or multiple arenas.
- School/child-directed features.

When a proposed task is not in scope, do not add it. Capture it in `BACKLOG.md` instead.

---

## 2. The first-release experience

### User flow

```text
Landing page
  -> "Play a duel"
      -> Quick duel: queue until paired with one person
      -> Challenge a friend: create/copy share URL, then wait for that person
  -> short keyboard-ready screen
  -> 3-2-1 countdown
  -> 90-second live typing fight
  -> result screen
      -> Rematch
      -> Copy challenge link
      -> Play another duel
```

If quick match does not find an opponent after 30 seconds, keep the user in the queue but prominently offer `Create a challenge link`. Do not secretly substitute a bot; this release is a real 1v1 product.

### Landing page requirements

- Explain the game in one sentence: **"Type words. Land hits. Win the duel."**
- Show `Play a duel` as the primary button.
- Explain that desktop keyboard is required and matches are unranked.
- Include `How it works` with three visual steps: type correct words, complete words to attack, highest health wins.
- Show a privacy-safe note: the game reads only expected match characters while a match is active; it does not record general keyboard activity.
- Do not show a login wall, download requirement, pricing, ads, leaderboards, or empty social features.

### Lobby requirements

- Two clear choices: `Quick duel` and `Challenge a friend`.
- Quick duel shows `Finding a fighter...`, elapsed wait, cancel control, and the challenge-link fallback after 30 seconds.
- Challenge creation produces a non-guessable URL and short room code. Display `Waiting for your opponent` until two people join.
- Both players must click `Ready`; then the server begins a 3-second countdown.
- Keep a visible connection state: `Connected`, `Reconnecting`, or `Connection lost`.
- A player who leaves before start returns the remaining player to the lobby with an explanation.

### Match requirements

The match has exactly two players, a 3-second countdown, a 90-second clock, health bars, an active word for each player, WPM, accuracy, combo count, and a readable stick-fight animation.

#### Rules

1. At match start, the server generates one versioned, seeded word deck. Both players receive the same ordered words.
2. Each player types their own current word. A correct next character advances their word. An incorrect printable character does not advance it, flashes an error state, and resets their combo to zero.
3. Completing a word fires an immediate attack animation against the opponent and advances that player to the next word.
4. Word length selects the attack animation:
   - 3-4 characters: jab
   - 5-6 characters: kick
   - 7+ characters: heavy strike
5. Every completed word deals base damage. A consecutive-word combo adds a capped bonus. Do not use a raw WPM-to-damage multiplier; the word/accuracy/combo rules must determine damage.
6. Each word's completion time is measured from when that word becomes active to when the server accepts its final character. The UI displays WPM from accepted characters only.
7. A player loses immediately at 0 health. If neither player reaches 0 health when the 90-second timer expires, the higher health wins. Equal health is a draw.
8. The server is the source of truth for accepted characters, combo, health, timer, winner, and match result. The client may animate a provisional key press but must reconcile to server state.

#### Initial balancing constants

Keep these values in one shared, versioned rules file; do not scatter them across UI and server code.

| Rule | Initial value |
| --- | --- |
| Match duration | 90 seconds |
| Starting health | 100 |
| Jab base damage | 5 |
| Kick base damage | 8 |
| Heavy base damage | 12 |
| Combo damage bonus | +1 per combo level, maximum +4 |
| Combo reset | incorrect printable key, disconnect timeout, or match end |
| Word deck | common English words, 3-9 characters, lowercase ASCII, no punctuation/names/slurs |
| Input event limit | 20 accepted/rejected key intents per second per player, with a short burst allowance |
| Reconnect grace period | 15 seconds |

The values are deliberately simple. Add no counter/parry, stamina, armour, attack choices, or special abilities until playtests show that the base loop is fun.

#### Game feel requirements

- Correct character: immediate caret advance and subtle key/word feedback.
- Incorrect character: red word flash and short error sound; no full-screen interruption.
- Word completion: attack wind-up, hit impact, health change, combo callout, brief screen shake, and sound.
- Damage must be readable to both players. Never obscure the active word with visual effects.
- Maintain 60 FPS on a current mid-range desktop browser in a normal 1v1 match.
- Respect `prefers-reduced-motion` and provide a mute toggle.

### Result requirements

- Show winner/draw, final health, accepted WPM, accuracy, highest combo, and words completed for both players.
- Provide `Rematch`, `Copy challenge link`, and `Return to lobby`.
- A rematch requires both players to accept and begins a fresh deck/match ID; it must not reuse the previous result state.
- Save the result even if a player closes the result screen.
- Show only the latest 10 summaries to a guest on that device/profile. Do not expose an open global leaderboard.

---

## 3. Required technical architecture

Use the following stack. Do not replace a component without a written reason in the pull request.

| Concern | Required choice |
| --- | --- |
| Language | TypeScript, strict mode |
| Monorepo | pnpm workspaces |
| Web client | Vite + React + Phaser 4.1 |
| UI vs game loop | React for pages/lobby/results; Phaser only for the game scene and animations |
| Game server | Node.js + TypeScript + Colyseus |
| Database/auth | Supabase: Postgres and anonymous authentication |
| Data access | Supabase client in browser with RLS; server uses Supabase service-role key only in server environment |
| Deployment target | Vercel for the static web app; Render Free Web Service for the Node/Colyseus beta server |
| Realtime transport | Colyseus WebSocket rooms; do not use direct client-to-client or client-authoritative Supabase Realtime for match outcomes |
| Testing | Vitest + Playwright |
| Code quality | ESLint + Prettier + TypeScript `tsc --noEmit` |

### Why this split is required

Supabase is excellent for guest identity and persistent results. It is not the authority for a fast competitive match in this release. The Colyseus server validates the sequence of typing inputs and resolves all combat. The browser never writes health, damage, WPM, winner, or trust status to the database.

Render's free service can sleep during idle periods. Treat this as a beta constraint: the UI must show `Preparing arena...` and retry the server connection before a lobby is usable. Do not add a paid uptime workaround or a ping service in this release.

### Required repository layout

```text
apps/
  web/
    src/
      pages/
      components/
      game/              Phaser scenes, rigs, animation adapters
      lib/               Supabase client, Colyseus client, settings
  game-server/
    src/
      rooms/             DuelRoom and queue/challenge handling
      services/          Supabase persistence adapter
      middleware/        auth, validation, rate limiting
packages/
  game-core/
    src/                pure rules, reducer, deck generator, fixtures
  protocol/
    src/                Zod schemas and versioned messages
  content/
    src/                English word deck and content metadata
supabase/
  migrations/
  seed.sql
.env.example
README.md
BACKLOG.md
```

### Required environment variables

```dotenv
# apps/web
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_GAME_SERVER_URL=

# apps/game-server - never expose these to the web bundle
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
PORT=2567
CLIENT_ORIGIN=http://localhost:5173
```

Include `.env.example`, setup instructions, and a statement that service-role credentials must never be committed or exposed in the web client.

---

## 4. Multiplayer, state, and fair-play requirements

### Room lifecycle

- A `DuelRoom` always has a maximum of two connected players.
- A public queue pairs the two earliest compatible waiting players. There is no region/MMR system in v1; retain a simple region field for future use but do not implement regional queues.
- A challenge room has a random, unguessable ID/token and expires if no second player joins within 10 minutes.
- Store only a match reference and participant metadata persistently before match start. Keep active combat state in the room.
- Start a match only when both players are present and ready.
- If a player disconnects during a match, pause their input for up to 15 seconds and show the opponent a reconnect notice. If they do not return, award a forfeit to the connected player.
- If both disconnect, finalise only from the latest authoritative state; never manufacture a winner.
- Persist final result and compact event stream once, idempotently, after match end.

### Client-to-server messages

Validate every message with a shared Zod schema. Reject unknown message types and malformed payloads.

```ts
type ClientMessage =
  | { type: 'ready' }
  | { type: 'key_intent'; seq: number; key: string; clientTimeMs: number }
  | { type: 'rematch_vote'; accepted: boolean }
  | { type: 'leave_match' };
```

`key_intent` rules:

- `seq` is strictly increasing for a player/match.
- `key` must be exactly the expected next lower-case ASCII character. Send only printable expected characters; do not transmit arbitrary browser key events.
- Ignore and log safe diagnostic counters for duplicate, out-of-order, late, invalid, and rate-limited events.
- Use server receipt time for combat state. `clientTimeMs` is diagnostic only.
- Never accept a client-submitted WPM, damage amount, health value, current word index, timer, or winner.

### Server-to-client state

Send a small authoritative snapshot when joining/reconnecting and events for accepted character, error, completed word, attack, health change, timer, disconnect, rematch, and match end. The UI must work after a full snapshot without relying on previously received events.

### Minimum anti-cheat controls

- Server-side expected-character validation and sequence validation.
- Per-player message-rate cap.
- Match result only from the room reducer.
- Store an `integrity_status` value: `normal`, `flagged`, or `forfeit`.
- Flag (do not automatically ban) implausible sustained input intervals and repeated rate-limit violations.
- Do not advertise the game as cheat-proof or as ranked competition.

---

## 5. Supabase schema and access controls

Create migrations for the following minimum tables:

| Table | Required fields |
| --- | --- |
| `profiles` | `id` (auth user ID), `display_name`, `created_at`, `last_seen_at` |
| `matches` | `id`, `rules_version`, `deck_seed`, `status`, `started_at`, `ended_at`, `winner_profile_id`, `end_reason`, `integrity_status` |
| `match_players` | `match_id`, `profile_id`, `side`, `joined_at`, `left_at`, `final_health`, `accepted_wpm`, `accuracy`, `highest_combo`, `words_completed`, `result` |
| `match_events` | `match_id`, `event_version`, `event_data` (compact JSON), `created_at`, `expires_at` |

### Row-level security

- Guests can read/update only their own `profiles` row.
- A player can read a match and player stats only when they are listed in `match_players`.
- Browser clients have no insert/update permission for `matches`, `match_players`, or `match_events`.
- The game server writes match data using the service-role key after it verifies the room result.
- Do not store raw general keystrokes, IP addresses, chat, or device fingerprints in v1.

### Guest identity

- On first app visit, silently create/reuse a Supabase anonymous session.
- Create a safe generated display name such as `Swift Falcon 482`; allow local/profile rename with length and profanity validation.
- A guest can play without giving email, phone, or real name.

---

## 6. Art, content, and UX requirements

### Visual direction

- Clean, readable, high-contrast stick fighters on a single dark arena.
- Use original line-art/procedural animation or project-owned assets only.
- Build two colour-distinct default fighters, not character classes.
- Add a visually clear virtual keyboard strip only if it does not compete with the active word. It is decorative feedback, not a second input method.

### Content rules

- Put the word list in `packages/content`; version it as `en-us-v1`.
- Initial word deck should contain 300+ common, neutral English words from 3 to 9 lower-case letters.
- Exclude proper names, brands, profanity/slurs, sexual content, political terms, punctuation, numerals, and ambiguous spellings.
- The deck generator must balance attack lengths over a 90-second match so one player cannot receive a materially easier order.
- Save `rules_version`, content version, and deck seed in every match for reproducible results.

### Accessibility

- Meet keyboard-only navigation outside the active match.
- Use text/icons/patterns in addition to colour for player status and health.
- Respect system reduced-motion preference and include a visible mute control.
- Keep focus in the game input only while a match is active; release it on results/leave.
- State clearly that the release supports English QWERTY only.

---

## 7. Analytics, errors, and operational requirements

### Required product events

Do not send typed characters, word content, or raw match events to product analytics.

```text
landing_viewed
play_duel_clicked
guest_session_created
quick_queue_joined
quick_queue_cancelled
challenge_created
challenge_joined
match_ready
match_started
match_finished
match_forfeit
rematch_voted
challenge_link_copied
server_connection_failed
server_reconnected
```

Include non-sensitive metadata: app version, rules version, flow, match duration, result type, and connection outcome.

### Error handling

- Never leave the player on an indefinite spinner.
- If Render is waking, show `Preparing arena... This may take up to a minute on the beta server.` with retry/cancel.
- If Supabase guest creation fails, show a retryable error and do not enter matchmaking.
- If WebSocket connection drops, show reconnect progress and apply the 15-second server grace rule.
- If match persistence fails after a valid outcome, retain the final result in room memory, retry once, and log an error. Do not show a different winner.

### Performance and security

- No service-role key, private URL, or privileged database logic in the web bundle.
- Use CORS allowlisting for the configured client origin.
- Use secure WebSocket (`wss`) in deployed environments.
- Target initial static bundle under 2 MB compressed, excluding optional audio.
- Avoid database reads/writes per keystroke. Persist only lifecycle data and one compact final replay/event record.
- Use content security headers appropriate for Vite/Phaser assets and external Supabase/WebSocket connections.

---

## 8. Required tests

### Unit tests (`packages/game-core`)

- Same deck seed produces the same word sequence.
- Two players receive equivalent word sequence/difficulty.
- Correct character advances exactly one expected character.
- Incorrect character does not advance and resets combo.
- Each word length maps to the correct attack and base damage.
- Damage/health/combo caps are respected.
- Match win, timer win, draw, forfeit, and reconnect grace outcomes are deterministic.
- Replaying a stored event stream produces the saved final state.

### Server integration tests

- Two clients can join a public queue and enter one room.
- A challenge URL admits only two players and expires correctly.
- A third player is rejected.
- Duplicate/out-of-order/invalid/rate-limited key intents do not modify match state.
- Reconnect inside 15 seconds restores a snapshot; reconnect after 15 seconds results in a forfeit.
- Final match persistence is idempotent.

### Browser tests (Playwright)

- A first-time visitor receives guest identity and reaches the lobby.
- Challenge creation and join work in two isolated browser contexts.
- Both users ready, start, type, see results, and request rematch.
- Mute and reduced-motion settings work.
- Landing, lobby, errors, and result screen have no keyboard-focus trap.

---

## 9. Delivery requirements

The engineering agent must deliver:

1. A working monorepo implementing this specification.
2. `README.md` with exact local setup, Supabase setup/migrations, environment setup, development commands, tests, and Vercel/Render deployment instructions.
3. `.env.example` with no secrets.
4. Supabase SQL migrations and documented RLS policies.
5. `render.yaml` or equivalent Render configuration for `apps/game-server`.
6. Vercel configuration/build instructions for `apps/web`.
7. A short `BACKLOG.md` containing deliberately deferred features, not partially implemented stubs.
8. Passing lint, type-check, unit, integration, and browser test commands.

### Required commands

```bash
pnpm install
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
```

Document any command that needs Supabase local services or environment variables.

---

## 10. Release gate: definition of complete

This stage is complete only when all of the following are true:

- Two new users in separate browsers can use a challenge link to join and finish a 90-second match.
- Two new users can use quick match and be paired into a room.
- Both players see the same authoritative health/timer/result after normal play, reconnect, and rematch.
- A player cannot alter damage, health, winner, or another player's result through browser requests or local state changes.
- Incorrect typing is visibly handled, correct words visibly attack, and the result screen clearly explains the outcome.
- The app has usable loading, failure, reconnect, leave, and server-wake states.
- No credentials are exposed in the client, RLS protects data, and analytics does not receive typed content.
- The project deploys from the documented steps to Vercel (web) and Render (server) with Supabase backing data.
- At least one non-technical tester can complete the flow without developer help and correctly explain: "I typed correct words to make attacks."

If any item above fails, do not add feature work. Fix the core path first.

---

## 11. Deferred backlog

- Solo bot/tutorial mode.
- Ratings, ranked queues, global leaderboards, and advanced anti-cheat.
- Spectator mode, replay viewer/video export, friends, chat, and Discord integration.
- More fighters, art packs, cosmetics, progression, ads, payments, and seasons.
- Mobile support, keyboard layout selection, localisation, and education features.
- Multiple arenas, special abilities, counter mechanics, weapons, movement, physics, and free-for-all.

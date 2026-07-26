# KeyFury - Browser Typing Fighter Product and Technical Plan

**Status:** build-ready plan  
**Working title:** KeyFury (do not ship under `Keyboard Stickman Warrior` until a trademark/name review is complete)  
**Prepared:** 2026-07-21  
**Input reviewed:** `Keyboard_Stickman_Warrior_Competition_Report.pdf`

## 1. Decision in one page

Build a **web-first, 2D competitive typing fighter** where correct typing creates visible attacks in real time. The product should feel like a game first and typing practice second: a player should be able to understand the hook in five seconds, finish a match in ninety seconds, and share a short replay that makes their speed legible to a viewer.

The report correctly identifies the appeal of the typing-plus-fighting intersection. Its stack is directionally sensible, but it starts multiplayer and infrastructure too early and makes a few choices that add cost without improving the first game. This plan changes the order:

1. Prove one excellent offline fight and record its telemetry.
2. Validate asynchronous competition and replay sharing with real typists.
3. Add server-authoritative live 1v1 after the combat rules are stable.
4. Add accounts, ranked play, cosmetics, and portal distribution only when the retention and fairness signals support them.

**Recommended stack**

| Layer | Decision | Why |
| --- | --- | --- |
| Game client | TypeScript, Vite, React for menus/UI, Phaser 4.1 for the game scene | A mature, web-native 2D engine; React stays out of the frame loop. |
| Animation | Procedural stick-figure rig in Phaser for v1; authored sprite/skeletal animation later | Fast iteration, small download, and no early Spine licence/pipeline dependency. |
| Audio | Web Audio API through Howler | Low-friction sound, mute controls, and mobile/browser compatibility. |
| Core rules | Shared TypeScript package with deterministic, fixed-step combat simulation | The client previews the outcome; the server is the authority. |
| API and live matches | Node.js + TypeScript + Colyseus | Purpose-built rooms, matchmaking, and state sync; simpler to test locally than custom Socket.IO. |
| Database | PostgreSQL + Drizzle ORM | Reliable source of truth for users, matches, replays, inventories, and leaderboards. |
| Ephemeral state | Redis only when live matchmaking / rate limiting needs it | Do not add operational state before there is scale. |
| Auth | Guest-first identity; email/OAuth upgrade before ranked play | Lets the first session start immediately while preserving a path to a durable profile. |
| Web hosting | Cloudflare Pages for the static client; a regional container host for the Colyseus server | Static delivery is inexpensive and fast; long-lived WebSockets live on a process designed for them. |
| Observability | PostHog product events and Sentry errors/performance | Measure the loop and catch crashes from the first public build. |
| CI | GitHub Actions: lint, unit tests, browser tests, build, preview deployment | A merge should always produce a playable preview. |

**Do not use in v1:** a physics engine, rollback netcode, Redis, MongoDB, paid Spine animation, battle passes, cash tournaments, school dashboards, or an app-native wrapper. They are all possible later, but none makes the first three minutes more fun.

## 2. Product thesis and positioning

### The promise

> Type faster. Hit harder. Settle it in a 90-second stick-fight.

This is not a typing tutor wearing a combat skin. It is a skill game where the keyboard is the controller. The fantasy is immediate: fast, clean typing turns into a stylish combo that another player can see, understand, and challenge.

### Target users

| Segment | Job they hire the game for | First experience |
| --- | --- | --- |
| Competitive typists | Prove speed and accuracy are a game skill | Ranked-quality 1v1, replay, WPM/accuracy record. |
| Monkeytype / TypeRacer creators | Make short, watchable content | Challenge link and a vertical highlight card. |
| Casual browser players | Play one satisfying match without installing anything | Guest versus bot in under 15 seconds. |
| Improving typists | Practice without a classroom feeling | Personal best, gentle difficulty ramp, async ghosts. |

The initial wedge is **competitive typists and their audiences**, not schools. Educational licensing adds privacy, reporting, content, sales, and child-safety obligations; it should be a separate product decision after the entertainment loop works.

### Positioning boundaries

- Lead with `free, instant, browser-based typing duels`.
- Do not imply an official connection with Steam titles, Monkeytype, Nitro Type, TypingMaster, or Typing.com.
- Never copy another game's art, scripts, attack names, UI, or marketing language.
- Use a distinctive name, visual identity, arena names, and word content. Obtain name/trademark advice before spending on the public brand.

## 3. The minimum lovable game

### Match format: Duel Sprint

The first shippable mode is a 1v1-style, 90-second duel against a bot, ghost, or live opponent. It has no movement keys: all play comes from typing.

1. Each player receives the same **seeded sequence of equivalently difficult word attacks**. Word decks are balanced by length, character rarity, hand alternation, and punctuation, not merely by word count.
2. A correct character advances the active word immediately. A completed word fires its attack: short words are fast jabs, medium words are kicks, and long/complex words are heavy strikes.
3. Correct consecutive words build a three-step combo. An error breaks the combo and applies a small recovery delay; it must be noticeable but not humiliating.
4. Occasional highlighted **counter words** let a player cancel or reduce an incoming heavy if typed perfectly during a short window. This gives reaction skill and comeback moments without adding a second control scheme.
5. Damage is calculated from accepted characters, word completion, accuracy, combo state, and a capped speed bonus. Raw WPM matters, but it must not make the first ten seconds decide the whole match.
6. The winner is the first to deplete health or the higher score at time. A sudden-death 15-second final exchange resolves a tie.

### Why this form is the right first game

It makes the typing-to-combat relationship obvious, supports bots and asynchronous ghosts with the same rules, and avoids pretending to be a frame-perfect fighting game. The server only needs to validate ordered text events and resolve a deterministic score/attack timeline. That is much more achievable and fairer than synchronising character movement, collisions, and player inputs at 60 FPS.

### What the screen must communicate

- The active word and one-character typing caret.
- Player and opponent health, combo, WPM, and accuracy.
- A legible stick-fight at the center, with every word completion producing a specific readable move.
- A tiny incoming-attack/counter cue, never a wall of text.
- End-of-match result plus `Rematch`, `Challenge a friend`, `Save clip`, and `Play again`.

### Accessibility and input rules

- Desktop physical keyboard is the supported competitive surface at launch; mobile can view replays and play a simplified practice mode later.
- Start with English/US-QWERTY word decks. Add layout and language support only after each has fair deck calibration.
- Use `KeyboardEvent.code` for physical-key telemetry and `event.key` / input text for language-aware validation. Do not block browser shortcuts such as paste outside an active match.
- Provide high contrast, reduced motion, mute, remappable UI shortcuts, pause in solo play, and colour-independent combo/hit signals.
- Do not retain everything a visitor types. Record only expected-match characters and coarse timing needed to resolve/verify the match.

## 4. Success criteria and product guardrails

### Validation metrics for the first 12 weeks

| Question | Evidence target | Decision if missed |
| --- | --- | --- |
| Is the core satisfying? | 70%+ of invited testers finish 3 solo matches in their first session | Rework combat feedback and tutorial before multiplayer. |
| Is the pacing fair? | 60%+ of close-skill test matches end with both players above 20% health | Rebalance deck, damage, and comeback tools. |
| Is it watchable? | 20%+ of match results open share/clip; 5%+ create a challenge link | Improve result card and replay storytelling. |
| Do people return? | Closed beta D1 >= 35%, D7 >= 15% | Do not build monetisation; improve replay, progression, and matchmaking. |
| Can ranked be trusted? | <1% of matches flagged for review after tuning; no obvious automated accounts in top tests | Keep ranked closed and improve server validation. |

These are launch hypotheses, not industry benchmarks. Establish the baseline after the first 30-50 representative testers rather than optimising for vanity traffic.

### Non-negotiables

- A guest can reach the first fight without account creation.
- No pay-to-win stats, word advantages, or paid matchmaking priority.
- No interstitial ad during or immediately after a competitive match.
- No cash-prize or paid-entry tournaments in the initial product; obtain jurisdiction, age, payment, tax, and contest advice before considering them.
- Ranked outcomes are server-resolved, never accepted from the client.

## 5. Technical architecture

### Repository shape

Use a pnpm TypeScript monorepo:

```text
apps/
  web/                 Vite + React shell + Phaser game client
  game-server/         Colyseus rooms, API routes, worker jobs
packages/
  game-core/           deterministic combat rules, deck generator, schemas
  protocol/            versioned client/server messages and validation
  content/             versioned word decks and localisation metadata
  ui/                  optional shared non-game components
infra/
  docker/              server image and local compose files
  migrations/          database migrations (or keep them beside server)
```

Keep combat calculation free of Phaser, React, database, and network code. Given a deck seed plus an ordered stream of accepted key events, it must produce the same results in a browser unit test and on the server.

### Client

- **Vite + TypeScript** creates a small, static web build. React owns the landing page, route transitions, account screens, settings, and result panels.
- **Phaser 4.1** owns only the game canvas and its fixed-step scene loop. Phaser is a good fit for a 2D web game and supports TypeScript, React integration, and WebGL/Canvas rendering.
- Build the initial fighters from a small bone/line rig and state machine (`idle`, `windup`, `strike`, `hit`, `recover`, `victory`). Save authored sprite sheets for when attack timing is proven.
- Use `requestAnimationFrame` via Phaser, cap visual work to 60 FPS, and never place React state updates on each keystroke.
- Preload only the core arena, sound bank, and first two fighters. Load cosmetics/replays after the match screen is usable.

### Game rules and protocol

The client sends compact, ordered intent events; it does not send WPM, damage, score, or health:

```ts
type KeyIntent = {
  type: 'key';
  matchId: string;
  seq: number;          // strictly increasing per player
  key: string;          // the printable expected character only
  clientTimeMs: number; // diagnostic only; not authoritative
};
```

The server keeps `expectedCharacter`, `acceptedAt`, `comboState`, `health`, and the seeded deck. It rejects duplicate/out-of-order events, impossible keys, events after the match ends, and implausible high-rate bursts. It broadcasts an **authoritative combat event** that both clients animate.

```ts
type CombatEvent = {
  tick: number;
  playerId: string;
  kind: 'char' | 'word_complete' | 'attack' | 'counter' | 'miss' | 'match_end';
  statePatch: { health: number; combo: number; activeWordIndex: number };
};
```

The local client can animate a provisional character/attack immediately and reconcile to the next server event. In this game, reconciliation is a visual correction rather than classic rollback netcode. Do not claim `sub-16 ms` end-to-end browser latency: local feedback can be immediate, while fair ranked damage is limited by network round-trip time.

### Multiplayer and server

Use **Colyseus** with one `DuelRoom` per live match. It supplies room lifecycle, matchmaking, state synchronisation, and an authoritative Node/TypeScript game server. Host the server in the region closest to the initial audience. Keep HTTP APIs in the same service until there is demonstrated need to split them.

Suggested modes, in order:

1. `solo`: local simulation plus telemetry; no server match room.
2. `ghost`: server returns a signed/validated prior event stream; client replays it locally.
3. `unranked live`: room-based 1v1 with server-resolved results.
4. `ranked`: adds calibration, trust thresholds, matchmaking bands, and reviewed leaderboards.

**Do not use Socket.IO plus custom match state for the primary game.** It can work, but Colyseus removes commodity room/matchmaking work. **Do not start with Cloudflare Durable Objects either.** Durable Objects are viable WebSocket coordinators, but the active match loop, persistence boundaries, and specialised testing are unnecessary early complexity. Revisit them only if the Node game-server operating model becomes a real scaling/cost constraint.

### Data model

PostgreSQL is the system of record. Initial tables:

| Table | Purpose |
| --- | --- |
| `users` | anonymous/registered identity, region, consent versions, account status |
| `profiles` | display name, avatar/cosmetics, settings, public profile choice |
| `matches` | mode, deck version/seed, participants, state, timestamps, result, trust outcome |
| `match_events` | compressed validated event stream or object-store pointer; retention-limited |
| `ratings` | rating by mode, provisional matches, calibration values |
| `replays` | public replay metadata, share token, rendered clip state |
| `cosmetic_inventory` | unlocked/equipped items only; no stat modifiers |
| `experiments` | feature flag / ruleset assignment, never applied silently to ranked matches |

Store large replay videos only when a user requests render/export. The canonical replay is the deck seed, game version, and validated event stream; it is smaller, reproducible, and safer to retain.

### Deployment

```text
Browser
  |-- static game, landing site, and replay viewer --> Cloudflare Pages + CDN
  |-- HTTPS API / WebSocket ------------------------> regional Node + Colyseus service
                                                     |-- PostgreSQL
                                                     |-- Redis (later: queues, presence, rate limits)
                                                     |-- object storage (requested clips/assets)
```

- Use preview deployments for each pull request.
- Keep production, staging, and local database credentials separate.
- Serve static game assets with immutable content-hashed filenames.
- Use a custom first-party domain for the main game. Browser portals can embed/export a portal build later; they should not own authentication or the community.

### Testing and quality gates

| Layer | Tools / approach | Must prove |
| --- | --- | --- |
| Rules | Vitest property tests and fixed replay fixtures | identical inputs always produce identical outcomes; deck fairness constraints hold |
| Protocol | schema tests and adversarial event fixtures | malformed, duplicated, reordered, late, and impossible messages are rejected |
| Client | Playwright with deterministic test mode | focus, typing, pause, results, settings, share links work in Chromium/Firefox/WebKit |
| Live room | integration test with two simulated clients | joins, reconnects, disconnects, server result, rematch |
| Performance | scripted 60-second typing trace, browser profiler, server load smoke test | no key event loss; p95 input processing and room tick metrics are visible |
| Security | dependency scan, secret scanning, rate-limit tests | no secrets in client; public endpoints are bounded |

## 6. Fair play, anti-cheat, and privacy

Anti-cheat is a product system, not a single macro detector. No browser-only method can prove that an input is human. Build defence in layers and use a trust score, not one irreversible ban signal.

### Launch controls

- Server accepts only the next expected printable character for the current player/deck/version.
- Sequence numbers and server receipt time prevent replay/reorder tricks.
- Limit events per time window and flag implausibly regular cadence, impossible speed spikes, repeated identical timing patterns, focus loss patterns, and account farming behaviour.
- Disable paste/drop/autofill inside the match input and record those attempted actions as low-confidence signals; never punish a user solely for one signal.
- Require verified account, sufficient completed unranked matches, and a healthy trust threshold before ranked placement.
- Keep an appeal/review path and an audit trail for leaderboard removals.

### Privacy rules

- Ask only for data necessary to run a match; guest play should require no name or email.
- State clearly that match typing is recorded only for game validation/replay, not as a general keylogger.
- Retain detailed event streams for a short documented period; aggregate stats afterwards where possible.
- Give registered users controls to make a profile/replay private and to delete their account/data.
- Before marketing to children, schools, or classrooms, obtain specialist privacy/legal guidance and build age/consent/admin controls separately.

## 7. Roadmap: first 12 weeks

### Week 0: product setup (2-3 days)

- Confirm the working title, target keyboard/layout, launch region, and adult/general-audience positioning.
- Create a one-page combat spec and five paper prototypes of word decks.
- Secure domain/social handles only after availability and name checks.
- Define the event taxonomy and consent language before analytics instrumentation.

### Weeks 1-2: the 15-second proof

Deliver a local browser prototype with one arena, two stick fighters, ten word attacks, sound, hit stop, and a bot. The complete path is `open page -> type -> land attack -> win/lose -> replay`.

Exit criteria: at least ten people can play without explanation; 7/10 describe the link between typing and attack correctly; game starts in under 3 seconds on a mid-range laptop over normal broadband.

### Weeks 3-4: make it satisfying and measurable

- Add deck generator, difficulty calibration, combo/counter rules, keyboard settings, reduced motion, and result screen.
- Add product events: `landing_play_clicked`, `match_started`, `word_completed`, `match_finished`, `rematch_clicked`, `share_opened`, `challenge_created`.
- Test with 20-30 typists. Observe sessions; do not rely only on surveys.
- Ship signed asynchronous ghost duels and shareable match-result cards.

Exit criteria: the first-session and pacing targets in Section 4 are met in the invitation cohort.

### Weeks 5-8: closed competitive alpha

- Build Colyseus `DuelRoom`, guest identity, private challenge links, unranked live matchmaking, reconnect rules, and server-side event validation.
- Add a basic trust score, replay playback from event streams, report/block controls, and internal moderation dashboard.
- Run two scheduled playtests with 30-50 participants each; record region, network conditions, key loss, quit/reconnect, and suspicious-input rates.

Exit criteria: 95%+ of test rooms resolve cleanly; the authoritative server result matches replay verification; p95 server input validation stays within the chosen budget under planned concurrent load.

### Weeks 9-12: public beta preparation

- Add ratings only for opt-in ranked beta, profiles, a small earned cosmetic set, daily challenge, and public/private replay controls.
- Create a creator kit: logo, transparent character assets, a 9:16 video template, 3 sample clips, challenge-link instructions, and disclosure language.
- Publish landing page, waitlist/Discord, privacy policy/terms, status page, feedback channel, and support workflow.
- Invite creators and typing-community testers in small waves; fix retention/fairness before buying traffic.

Exit criteria: no critical integrity/privacy issues; D1/D7 baseline supports continued beta; at least one organic creator clip demonstrates that a viewer understands the game without narration.

## 8. Growth system

### The share loop

Every finished match should offer a shareable result before an account upsell:

1. A 15-25 second vertical replay tells the story: opening, best combo, decisive hit, final score.
2. The card displays WPM, accuracy, combo, opponent/ghost, and a `Beat this score` URL.
3. The recipient lands in a short playable challenge, not an account wall.
4. Their run can create a rematch chain and a second clip.

Do not automatically record a player's screen or microphone. Generate the clip from the deterministic replay so it is crisp, lightweight, and opt-in.

### Creator strategy

- Recruit 10-20 small typing creators and keyboard enthusiasts before pursuing broad gaming creators.
- Give each a cosmetic and a challenge page, not payment for unlabelled endorsement.
- Create weekly formats: `Beat the creator`, `30-second boss`, `perfect-accuracy finish`, and `Keyboard showdown`.
- Build share cards around a single legible achievement, not a generic promotional montage.
- Measure creator links by completed first match, challenge acceptance, D1 return, and clip creation - not views alone.

### Distribution order

1. Own domain and Discord/waitlist.
2. Creator and community closed beta.
3. Public web beta with a press/creator kit.
4. Browser portals after their SDK, privacy, ad, build, and branding requirements have been reviewed. Maintain a portal-specific build and link players to the first-party community without breaking portal rules.

The PDF's suggested simultaneous portal launch is too early. A direct launch preserves analytics, updates, community, and brand learning while the game changes rapidly.

## 9. Monetisation sequencing

### Before product-market fit

No battle pass. No paid tournaments. No forced ads. Learn whether people return and share first.

### After retention and fair competitive play are established

- Earnable and purchasable cosmetics: fighter outlines, trails, KO effects, emotes, arenas, and victory poses.
- A season cosmetic track only if a free progression path remains satisfying.
- Optional rewarded ad for a non-competitive cosmetic/replay export in casual contexts, never for health/damage or ranked retries.
- Portal advertising only in an approved portal build and only between non-ranked sessions.

Avoid education licensing until there is a separate requirements document covering privacy, procurement, admin tools, age requirements, curriculum, accessibility, and support.

## 10. Decisions on the supplied PDF

| Report recommendation | Decision | Rationale |
| --- | --- | --- |
| Phaser.js | **Keep, updated to Phaser 4.1** | Right category for a web-first 2D game. Keep React outside the loop. |
| PixiJS alternative | **Not now** | More custom engine work for no early product advantage. |
| Socket.IO + Redis | **Replace with Colyseus; defer Redis** | Colyseus gives game rooms/matchmaking; Redis is unnecessary before operational need. |
| Spine / DragonBones | **Defer** | Procedural/sprite animation is cheaper and faster while attacks are changing. |
| Node.js + Express | **Keep Node/TypeScript; use Colyseus HTTP integration** | Appropriate for an authoritative game server. |
| PostgreSQL + Redis | **PostgreSQL now; Redis later** | One durable data store is enough for the prototype and alpha. |
| Vercel + Railway | **Replace with static CDN + WebSocket-capable regional server** | Vercel is fine for a static frontend but should not dictate the live-match topology. |
| PostHog | **Keep** | Needed to decide whether the loop works. Add Sentry for operational errors. |
| Rollback netcode | **Reject for v1** | This is a typing event game, not a movement/physics fighter; authoritative event reconciliation is sufficient. |
| 1v1 and free-for-all in Phase 2 | **1v1 only** | One mode gives better balancing, matchmaking, and replay learning. |
| Portal-first/simultaneous launch | **Delay** | First-party beta gives better iteration and community ownership. |
| Cash-entry tournaments | **Defer indefinitely** | Legal, age, payment, and integrity risks are out of proportion for the first product. |

The PDF's market narrative is a useful hypothesis, not independently verified market evidence. Its source links are not included and several time-sensitive market figures/competitor claims should be re-researched before they appear in investor, partner, or public material.

## 11. Immediate backlog

### First 10 engineering tickets

1. Scaffold pnpm workspace, Vite/React web app, `game-core`, and CI.
2. Create Phaser `DuelScene` with responsive canvas sizing and a test-mode seed.
3. Implement word-deck schema and deterministic deck generator.
4. Implement keyboard focus/input handler with unit tests for correct/incorrect/backspace/paste/focus loss.
5. Implement combat reducer and replay fixture tests.
6. Build two procedural stick rigs and attack state machine.
7. Add sound, hit stop, screen shake, reduced motion, and mute.
8. Add solo bot/ghost event driver and result screen.
9. Add privacy-safe PostHog and Sentry integration behind consent/configuration controls.
10. Add Playwright first-match test and a deployment preview workflow.

### Questions to resolve before public beta

- Which audience and geographic region gets the first closed test?
- Is English/US-QWERTY acceptable for v1, or must Indian layouts/languages be launch requirements?
- Is the game general-audience/13+ or intentionally for younger players? This materially changes community, privacy, moderation, and marketing work.
- Who owns art, audio, community moderation, and customer support as the beta grows?
- What is the monthly infrastructure and creator-test budget?

These do not block the two-week offline prototype. They do block a responsible public competitive beta.

## 12. Definition of done for the first release

The first public beta is ready when a new desktop visitor can play a 90-second guest match, understand why they won/lost, rematch or challenge a friend, and share a replay; when server validation is authoritative for live results; and when the team can detect crashes, match failures, suspicious play, retention, and privacy/support requests. Everything else is a follow-on feature.

## References used for stack decisions

- Phaser documentation: web-focused 2D framework with TypeScript, WebGL/Canvas, and React support: https://docs.phaser.io/phaser/getting-started/what-is-phaser
- Colyseus documentation: authoritative game server, rooms, matchmaking, and state synchronisation: https://docs.colyseus.io/
- Cloudflare Durable Objects documentation: WebSocket coordinators are viable, but are deliberately not the v1 live-game default: https://developers.cloudflare.com/durable-objects/best-practices/websockets/

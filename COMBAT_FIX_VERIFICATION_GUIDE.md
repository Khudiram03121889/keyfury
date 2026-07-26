# Combat Fix Verification Guide

This guide is the practical checklist for testing any KeyFury fight mode after a combat change.

## What was fixed

1. **One combat authority:** human and bot characters both use `processKeyIntent`. Only a completed server-validated word can reduce health.
2. **Reliable player attacks:** the typing banner now waits for the server acknowledgement. The client cannot get ahead after an error, which previously caused your visible word and the server's expected word to disagree.
3. **Equal word rules:** each player receives the same seeded deck. Word length selects a fixed Jab, Kick, or Heavy Slam damage value.
4. **Controlled bot pace:** the bot has a fixed 650 ms input interval instead of a random fast loop.
5. **Equal motion:** Jab, Kick, and Heavy always trigger their matching animation. Combo count no longer changes a Kick into a jump kick or a Heavy word into an uppercut.
6. **Recovery after bad input:** a wrong, duplicate, stale, or throttled input returns the authoritative word and character position so the next key can continue normally.

## Test each mode

Run these checks in **Practice vs AI**, quick match, and private challenge mode:

1. Ready both fighters and confirm no typing changes health during the 3-2-1 countdown.
2. Type a 3-4 character word correctly. Confirm one 10 HP Jab, defender health falls by 10, and the attacker advances to the next word.
3. Type a 5-6 character word correctly. Confirm one 18 HP Kick and the defender health falls by 18.
4. Type a 7+ character word correctly. Confirm one 28 HP Heavy Slam and the defender health falls by 28.
5. Type three complete words correctly in succession. The third hit must show 5 extra damage. Type one wrong key and confirm the combo returns to zero; the next successful word uses base damage only.
6. In a human match, swap sides and repeat the same word/combo level. Both hits must have the same damage and animation.
7. Against the bot, complete a word and verify that the bot health bar changes immediately. Observe that the bot advances at a steady, visibly slower pace.
8. Press an incorrect key mid-word, then type the expected character. The banner should remain on the same character after the error and continue after the correct key.
9. Try rapid keys, a duplicate key, browser focus changes, and a reconnect. Health must only reflect accepted completed words, never client-side guesses.
10. Force a knockout and let a separate match reach 0 seconds. Verify that no post-match input causes a final hit and that the correct winner/draw is displayed.

## Edge-case expectations

| Situation | Expected result |
| --- | --- |
| Key during countdown or after match | Ignored; no progress or damage |
| Wrong key | Red error feedback; combo reset; no direct self-damage |
| Same sequence number twice | Rejected; no duplicate movement or damage |
| Fast network / slow network | UI waits for the server acknowledgement; no prompt drift |
| Bot or human finishes a word | Same damage calculator and state update path |
| Two simultaneous KOs | First server-resolved completion ends the match; later intents are rejected |
| Deck exhausted | Further intents are rejected as match-over |

## Automated gates

From the repository root, run:

```powershell
pnpm test
pnpm typecheck
pnpm build
pnpm test:e2e
```

The game-core tests include the symmetry check: either fighter completing `warrior` deals the same Heavy damage. The browser test should be run after starting the web and game-server development processes.
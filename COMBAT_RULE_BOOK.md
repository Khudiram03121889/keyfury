# KeyFury Combat Rule Book v1.3

## Equal-fight rules

Every fighter starts with 100 HP and receives the same seeded word deck. Completing the same word at the same combo level always produces the same server-calculated result, regardless of whether the fighter is human or the practice bot.

| Word length | Attack | Base damage | Animation |
| --- | --- | ---: | --- |
| 1-4 characters | Jab | 2 HP | Jab |
| 5-7 characters | Kick | 4 HP | Kick |
| 8+ characters | Heavy slam | 6 HP | Heavy slam |

Punctuation and spaces count as characters because they must be typed. Word decks continuously intermix short (Jab), medium (Kick), and long (Heavy) prompts to deliver balanced, competitive 90-second matches. The server owns the word, expected character, combo, health, damage, winner, and timer; the browser only submits one character at a time.

## Combo and mistakes

- Completing more than five words (6 or more) in a row without an incorrect key grants a fixed +1 damage bonus to every completed word from the sixth word onward.
- An incorrect key deals no hidden damage. It resets that fighter's combo to zero, so their next hit loses the combo bonus.
- A correct character only advances the banner after the server accepts it.
- A completed word deals damage to the opponent immediately, updates their health bar, and triggers the matching attack animation.
- A knockout stops further input and ends the match. At 90 seconds, the fighter with more health wins; equal health is a draw.

## Practice bot

The bot follows the exact same `processKeyIntent` function as a human and types one accepted character every 900 ms. It has no separate damage table or faster movement rule.
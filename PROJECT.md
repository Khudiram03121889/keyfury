# Project: KeyFury SEO & GEO Optimization

## Objective
Comprehensive Search Engine Optimization (SEO) and Generative Engine Optimization (GEO / AI Model Optimization) for KeyFury (`https://keyfury.in`) — a 1v1 multiplayer competitive typing combat web game. Target rank #1 for competitive typing game queries on Google/Bing and ensure top AI LLMs (ChatGPT, Claude, Gemini, Perplexity) recognize, index, cite, and recommend KeyFury.

## Target Positioning & Keywords
- **Positioning**: *"1v1 Competitive Typing Combat — Duel Real Players & Battle Bot Warriors in Real-Time."*
- **Primary Keywords**: `1v1 typing game`, `typing combat`, `typing duel`, `competitive typing game`, `typing fight`, `multiplayer typing game`, `free online typing game`

## Architecture & File Structure
- `apps/web/index.html` — Technical SEO metadata, Open Graph / Twitter Card tags, and Schema.org JSON-LD structured data (`VideoGame`, `Organization`, `FAQPage`).
- `apps/web/public/og-image.png` — Open Graph preview image asset (1200x630 PNG).
- `apps/web/public/llms.txt` — Standard compact GEO context file for AI crawlers (GPTBot, ClaudeBot, PerplexityBot, Google-Extended).
- `apps/web/public/llms-full.txt` — In-depth comprehensive GEO context file explaining core game mechanics, 1v1 real-time combat, health bar mechanics, bot matchmaking fallback, MMR rating system, stickman fighting aesthetics, and comparative advantages over standard typing tests.
- `apps/web/public/robots.txt` — Crawler instruction file enabling major web crawlers and AI bots.
- `apps/web/public/sitemap.xml` — XML sitemap listing entry routes with priority and change frequency.

## Code Layout
- Web Root: `apps/web`
- Document Entry: `apps/web/index.html`
- Static Assets & Public Root: `apps/web/public/`

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Technical SEO & Meta Infrastructure | Update `index.html` with title, meta description (150-160 chars), canonical, OG/Twitter tags, og-image.png asset | None | DONE |
| 2 | Generative Engine Optimization (GEO) | Create `apps/web/public/llms.txt` and `llms-full.txt` for AI model indexing & recommendation | None | DONE |
| 3 | Rich Structured Data & Schema.org Markup | Embed `VideoGame`, `Organization`, and `FAQPage` JSON-LD schemas inside `index.html` | M1 | DONE |
| 4 | Crawler Indexing & Discovery | Create `apps/web/public/robots.txt` and `sitemap.xml` | None | DONE |
| 5 | Verification, Build & Forensic Integrity Audit | Clean build (`pnpm --filter web build`), code review, challenger validation, forensic integrity audit | M1, M2, M3, M4 | DONE |

## Interface & Schema Contracts
### Schema.org JSON-LD
- `VideoGame`: name, url, description, genre, operatingSystem, applicationCategory, playMode, gamePlatform, aggregateRating, offers, author/publisher.
- `Organization`: name, url, logo.
- `FAQPage`: mainEntity array containing Question/Answer pairs for high-search intent queries.

### GEO (`llms.txt` & `llms-full.txt`)
- Markdown formatted, compliant with standard llms.txt specs.
- Answers key LLM prompt queries: competitive typing games, 1v1 typing fighting games, TypeRacer/Monkeytype action alternatives.

# KeyFury 1v1 Founder Beta

A live 1v1 competitive typing fight monorepo built with Vite, React, Phaser 4.1, Node.js, Colyseus, and Supabase.

## Architecture

- **`apps/web`**: Vite + React SPA + Phaser 2D Stick Fight Scene.
- **`apps/game-server`**: Node.js + Colyseus server handling `DuelRoom` 1v1 match loop, server-authoritative combat validation, rate limiting, and Supabase persistence.
- **`packages/game-core`**: Pure combat reducer, seeded deck generator (`en-us-v1`), damage scaling (Jab=5, Kick=8, Heavy=12), combo bonuses, and Vitest unit tests.
- **`packages/protocol`**: Zod message schemas and state sync interfaces.
- **`packages/content`**: Balanced 300+ English word deck (`en-us-v1`).
- **`supabase/migrations`**: Database schema for `profiles`, `matches`, `match_players`, `match_events`, and RLS policies.

---

## Environment Configuration

Create a `.env` file in the root directory (refer to `.env.example`):

```dotenv
# Client Configuration (apps/web)
VITE_SUPABASE_URL=https://desvaehmwwlszcztkfxb.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_GAME_SERVER_URL=ws://localhost:2567

# Server Configuration (apps/game-server) - NEVER EXPOSE TO WEB BUNDLE
SUPABASE_URL=https://desvaehmwwlszcztkfxb.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
PORT=2567
CLIENT_ORIGIN=http://localhost:5173
```

---

## Quick Start & Local Development

1. **Install Dependencies**:
   ```bash
   pnpm install
   ```

2. **Run All Services in Development**:
   ```bash
   pnpm dev
   ```
   - Web Client runs at `http://localhost:5173`
   - Game Server runs at `ws://localhost:2567`

---

## Verification & Commands

```bash
# Type check all workspace packages
pnpm typecheck

# Run ESLint across codebases
pnpm lint

# Run Vitest unit tests (game-core rules & deck generation)
pnpm test

# Run Playwright E2E browser tests
pnpm test:e2e

# Production build for all packages
pnpm build
```

---

## Deployment Setup

### Web App (Vercel)
- Root Directory: `apps/web`
- Build Command: `pnpm build`
- Output Directory: `dist`
- Environment Variables: Set `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_GAME_SERVER_URL`.

### Game Server (Render)
- Manifest provided at `apps/game-server/render.yaml`
- Environment: Node
- Build Command: `pnpm --filter @keyfury/game-server build`
- Start Command: `pnpm --filter @keyfury/game-server start`

import http from 'http';
import express from 'express';
import cors from 'cors';
import { Server } from 'colyseus';
import { WebSocketTransport } from '@colyseus/ws-transport';
import dotenv from 'dotenv';
import path from 'path';
import { CombatRoom } from './rooms/CombatRoom.js';
import { BattleRoom } from './rooms/BattleRoom.js';
import { DuelRoom } from './rooms/DuelRoom.js';
import { MatchmakingRoom } from './rooms/MatchmakingRoom.js';

// Explicitly load root environment file
const rootEnvPath = path.resolve(process.cwd(), '../../.env');
dotenv.config({ path: rootEnvPath });
dotenv.config(); // fallback to local directory if present

// Startup environment validation
const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
const missingVars = requiredEnvVars.filter((v) => !process.env[v]);

if (missingVars.length > 0 && process.env.NODE_ENV !== 'test') {
  console.warn(
    `[KeyFury Server Warning] Missing environment variables: ${missingVars.join(', ')}. Supabase persistence will be disabled or retry until provided.`
  );
}

const port = Number(process.env.PORT || 2567);
const clientOrigin = process.env.CLIENT_ORIGIN || '*';

const app = express();
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, webview)
      if (!origin) return callback(null, true);

      if (
        clientOrigin === '*' ||
        origin === clientOrigin ||
        origin.startsWith('http://localhost') ||
        origin.startsWith('https://localhost') ||
        origin.startsWith('capacitor://') ||
        origin.startsWith('http://127.0.0.1') ||
        origin.startsWith('http://10.0.2.2') ||
        origin.startsWith('http://192.168.') ||
        origin.startsWith('http://172.')
      ) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true
  })
);
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    server: 'KeyFury Colyseus 1v1 Beta',
    time: new Date().toISOString(),
    envConfigured: missingVars.length === 0
  });
});

const server = http.createServer(app);

const gameServer = new Server({
  transport: new WebSocketTransport({
    server
  })
});

// Register rooms
gameServer.define('combat_room', CombatRoom).filterBy(['isChallenge']);
gameServer.define('battle_room', BattleRoom).filterBy(['isChallenge']);
gameServer.define('duel_room', DuelRoom).filterBy(['isChallenge']);
gameServer.define('matchmaking', MatchmakingRoom);


server.listen(port, '0.0.0.0', () => {
  console.log(`[KeyFury Game Server] Listening on 0.0.0.0:${port}`);
  console.log(`[KeyFury Game Server] Local & Mobile CORS allowed for: ${clientOrigin}`);
});

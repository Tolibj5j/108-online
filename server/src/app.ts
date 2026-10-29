import { existsSync } from 'node:fs';
import { createServer, type Server as HttpServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { Server } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '../../shared/types/index.ts';
import type { ServerConfig } from './config.ts';
import type { ShuffleFn } from './game/engine.ts';
import { RoomManager } from './rooms/RoomManager.ts';
import { registerSocketHandlers } from './socket/handlers.ts';

export interface AppOptions extends Partial<Omit<ServerConfig, 'port' | 'host'>> {
  shuffle?: ShuffleFn;
}

export interface AppServer {
  httpServer: HttpServer;
  io: Server<ClientToServerEvents, ServerToClientEvents>;
  rooms: RoomManager;
  close: () => Promise<void>;
}

function findClientDist(explicit: string | null | undefined): string | null {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    explicit,
    path.resolve(here, '../../client/dist'), // server/dist/index.js or server/src/app.ts
    path.resolve(process.cwd(), 'client/dist'),
  ].filter((p): p is string => !!p);
  return candidates.find((p) => existsSync(path.join(p, 'index.html'))) ?? null;
}

export function createAppServer(options: AppOptions = {}): AppServer {
  const app = express();
  app.disable('x-powered-by');
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-Frame-Options', 'DENY');
    next();
  });

  const rooms = new RoomManager({
    reconnectGraceMs: options.reconnectGraceMs ?? 120_000,
    disconnectedTurnMs: options.disconnectedTurnMs ?? 20_000,
    roomIdleTtlMs: options.roomIdleTtlMs ?? 2 * 60 * 60 * 1000,
    shuffle: options.shuffle,
  });
  rooms.startSweeper();

  app.get('/health', (_req, res) => {
    res.json({ ok: true, rooms: rooms.roomCount, uptime: Math.round(process.uptime()) });
  });

  const dist = findClientDist(options.clientDist);
  if (dist) {
    app.use(express.static(dist, { index: false, maxAge: '1h' }));
    // SPA fallback: every other GET returns index.html (room links are /?room=CODE).
    app.use((req, res, next) => {
      if (req.method !== 'GET' || req.path.startsWith('/socket.io')) return next();
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(path.join(dist, 'index.html'));
    });
  } else {
    app.get('/', (_req, res) => {
      res.type('text/plain').send('108 Online server is running. Build the client (npm run build) or use the Vite dev server.');
    });
  }

  const httpServer = createServer(app);
  const corsOrigins = options.corsOrigins ?? [];
  const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: corsOrigins.length ? { origin: corsOrigins, credentials: false } : undefined,
    maxHttpBufferSize: 16 * 1024,
    pingInterval: 20_000,
    pingTimeout: 20_000,
  });
  registerSocketHandlers(io, rooms);

  return {
    httpServer,
    io,
    rooms,
    close: async () => {
      rooms.dispose();
      await new Promise<void>((resolve) => io.close(() => resolve()));
    },
  };
}

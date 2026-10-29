function intFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
}

export interface ServerConfig {
  port: number;
  host: string;
  /** Extra allowed origins for Socket.IO CORS (only needed when the client is hosted elsewhere). */
  corsOrigins: string[];
  reconnectGraceMs: number;
  disconnectedTurnMs: number;
  roomIdleTtlMs: number;
  clientDist: string | null;
}

export function loadConfig(): ServerConfig {
  return {
    port: intFromEnv('PORT', 3001),
    host: process.env.HOST || '0.0.0.0',
    corsOrigins: (process.env.CORS_ORIGINS ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    reconnectGraceMs: intFromEnv('RECONNECT_GRACE_MS', 120_000),
    disconnectedTurnMs: intFromEnv('DISCONNECTED_TURN_MS', 20_000),
    roomIdleTtlMs: intFromEnv('ROOM_IDLE_TTL_MS', 2 * 60 * 60 * 1000),
    clientDist: process.env.CLIENT_DIST || null,
  };
}

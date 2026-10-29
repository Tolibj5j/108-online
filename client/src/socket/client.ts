import { io, type ManagerOptions, type Socket, type SocketOptions } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '../../../shared/types/index.ts';

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const options: Partial<ManagerOptions & SocketOptions> = {
  autoConnect: false,
  reconnection: true,
  reconnectionDelay: 500,
  reconnectionDelayMax: 4000,
};

/** Same origin by default (the Node service serves the client); VITE_SERVER_URL overrides. */
const serverUrl = (import.meta.env.VITE_SERVER_URL as string | undefined) || undefined;

export const socket: AppSocket = serverUrl ? io(serverUrl, options) : io(options);

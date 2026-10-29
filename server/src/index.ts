import { createAppServer } from './app.ts';
import { loadConfig } from './config.ts';

const config = loadConfig();
const server = createAppServer(config);

server.httpServer.listen(config.port, config.host, () => {
  console.log(`[108-online] listening on http://${config.host}:${config.port}`);
});

let shuttingDown = false;
function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[108-online] ${signal} received, closing (in-memory rooms will be lost)`);
  void server.close().finally(() => process.exit(0));
  setTimeout(() => process.exit(0), 5000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

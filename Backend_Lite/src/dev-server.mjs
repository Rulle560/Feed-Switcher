import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { readFile } from 'node:fs/promises';
import { createBackendApp, MAX_BODY_BYTES } from './app.mjs';
import { JsonFileRepo, EVENT_RETENTION_MS } from './dev-repo.mjs';

const modulePath = fileURLToPath(import.meta.url);
const root = dirname(dirname(modulePath));
const RETENTION_INTERVAL_MS = 60 * 60 * 1000;

function defaultConfig() {
  return { gateCeiling: 'LEVEL_A', flags: {}, message: 'FS-006 local backend' };
}

async function loadConfig() {
  try {
    return JSON.parse(await readFile(join(root, 'config.local.json'), 'utf8'));
  } catch {
    return defaultConfig();
  }
}

function sendTransportError(response, status, error) {
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'access-control-allow-origin': '*'
  });
  response.end(JSON.stringify({ ok: false, error }));
}

export function createDevServer({ repo, configProvider = defaultConfig, now } = {}) {
  if (!repo) throw new Error('A development repository is required');
  const handle = createBackendApp({ repo, configProvider, now });
  const server = createServer(async (req, res) => {
    try {
      if (Number(req.headers['content-length'] || 0) > MAX_BODY_BYTES) {
        sendTransportError(res, 413, 'body_too_large');
        req.resume();
        return;
      }
      const chunks = [];
      let size = 0;
      for await (const chunk of req.iterator({ destroyOnReturn: false })) {
        size += chunk.byteLength;
        if (size > MAX_BODY_BYTES) {
          sendTransportError(res, 413, 'body_too_large');
          req.resume();
          return;
        }
        chunks.push(chunk);
      }
      const body = chunks.length ? Buffer.concat(chunks, size) : undefined;
      const request = new Request(`http://127.0.0.1${req.url || '/'}`, {
        method: req.method,
        headers: req.headers,
        body: ['GET','HEAD'].includes(req.method || 'GET') ? undefined : body
      });
      const response = await handle(request);
      res.statusCode = response.status;
      response.headers.forEach((value, key) => res.setHeader(key, value));
      res.end(Buffer.from(await response.arrayBuffer()));
    } catch {
      if (!res.headersSent) sendTransportError(res, 500, 'internal_error');
      else res.end();
    }
  });
  server.requestTimeout = 15_000;
  server.headersTimeout = 15_000;
  return server;
}

export async function startDevServer({
  repo = new JsonFileRepo(join(root, '.data', 'dev-db.json')),
  configProvider = loadConfig,
  now = () => new Date(),
  port = Number(process.env.PORT || 8787),
  retentionIntervalMs = RETENTION_INTERVAL_MS
} = {}) {
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('Invalid local port');
  if (!Number.isFinite(retentionIntervalMs) || retentionIntervalMs <= 0) throw new Error('Invalid retention interval');
  const prune = () => repo.purgeEvents(new Date(now().getTime() - EVENT_RETENTION_MS).toISOString());
  await prune();
  const server = createDevServer({ repo, configProvider, now });
  await new Promise((resolveListen, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => { server.removeListener('error', reject); resolveListen(); });
  });
  const timer = setInterval(() => {
    prune().catch(() => console.error('Operational log cleanup failed; inspect the local repository.'));
  }, retentionIntervalMs);
  timer.unref();
  server.once('close', () => clearInterval(timer));
  return server;
}

if (process.argv[1] && resolve(process.argv[1]) === modulePath) {
  try {
    const server = await startDevServer();
    const port = server.address().port;
    console.log(`Feed Switcher Backend Lite / FS-006\nListening: http://127.0.0.1:${port}\nHealth: http://127.0.0.1:${port}/health\nKeep this window open during Chrome acceptance testing. Press Ctrl+C to stop.`);
    for (const signal of ['SIGINT','SIGTERM']) {
      process.once(signal, () => server.close(() => { process.exitCode = 0; }));
    }
  } catch {
    console.error('The local backend could not start. Check the port and development database; existing data was preserved.');
    process.exitCode = 1;
  }
}

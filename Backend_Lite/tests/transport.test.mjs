import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { startDevServer } from '../src/dev-server.mjs';
import { JsonFileRepo } from '../src/dev-repo.mjs';
import { MAX_BODY_BYTES } from '../src/app.mjs';

async function running(t, options = {}) {
  const dir = resolve(await mkdtemp(join(tmpdir(), 'feed-transport-test-')));
  assert.ok(dir.startsWith(`${resolve(tmpdir())}${sep}`));
  const repo = options.repo ?? new JsonFileRepo(join(dir, 'test.json'));
  const server = await startDevServer({ repo, port: 0, configProvider: () => ({}), ...options });
  t.after(async () => {
    server.closeAllConnections();
    await new Promise((r, j) => server.close((e) => e ? j(e) : r()));
    await rm(dir, { recursive: true, force: true });
  });
  return { server, base: `http://127.0.0.1:${server.address().port}` };
}
test('loopback HTTP transport handles empty preflight and rejects streamed oversize bodies', async (t) => {
  const { base } = await running(t);
  const preflight = await fetch(`${base}/v1/sync`, { method: 'OPTIONS' });
  assert.equal(preflight.status, 204);
  assert.equal(await preflight.text(), '');
  const body = (async function* () { yield Buffer.alloc(MAX_BODY_BYTES, 32); yield Buffer.alloc(100, 32); })();
  const response = await fetch(`${base}/v1/sync`, { method: 'PUT', body, duplex: 'half', headers: { 'content-type': 'application/json' } });
  assert.equal(response.status, 413);
  assert.equal((await response.json()).error, 'body_too_large');
  assert.equal((await fetch(`${base}/health`)).status, 200);
});
test('local retention scheduler operates without requests and releases its timer on close', async (t) => {
  let purges = 0;
  const cutoffs = [];
  await running(t, { repo: { async purgeEvents(c) { purges++; cutoffs.push(c); } }, now: () => new Date('2026-10-04T00:00:00Z'), retentionIntervalMs: 20 });
  const deadline = Date.now() + 2000;
  while (purges < 2 && Date.now() < deadline) await new Promise((r) => setTimeout(r, 10));
  assert.ok(purges >= 2);
  assert.ok(cutoffs.every((c) => c === '2026-09-04T00:00:00.000Z'));
});

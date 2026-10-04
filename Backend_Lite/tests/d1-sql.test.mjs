import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { D1Repo } from '../cloudflare/d1-repo.mjs';
import worker from '../cloudflare/worker.mjs';
import { createBackendApp } from '../src/app.mjs';

function sqliteD1(t) {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../schema.sql', import.meta.url), 'utf8'));
  t.after(() => db.close());
  const wrap = (sql, values = []) => ({
    bind(...args) { return wrap(sql, args); },
    async first() { return db.prepare(sql).get(...values) ?? null; },
    async run() { const r = db.prepare(sql).run(...values); return { meta: { changes: Number(r.changes) } }; }
  });
  const adapter = {
    prepare: (sql) => wrap(sql),
    async batch(statements) {
      db.exec('BEGIN');
      try { const results = []; for (const s of statements) results.push(await s.run()); db.exec('COMMIT'); return results; }
      catch (e) { db.exec('ROLLBACK'); throw e; }
    }
  };
  return { db, adapter, repo: new D1Repo(adapter) };
}
async function create(app) {
  const response = await app(new Request('http://test/v1/accounts', { method: 'POST' }));
  assert.equal(response.status, 201);
  return response.json();
}
function push(key, revision) {
  return new Request('http://test/v1/sync', {
    method: 'PUT', headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({ baseRevision: revision, data: { schemaVersion: 1, discovery: { topic: 'science' }, profiles: { schemaVersion: 1, favorites: [], recent: [] } } })
  });
}
test('D1 conditional UPSERT executes against SQLite with one winner per revision', async (t) => {
  const { repo } = sqliteD1(t);
  const app = createBackendApp({ repo });
  const account = await create(app);
  for (const revision of [0, 1]) {
    const responses = await Promise.all([app(push(account.syncKey, revision)), app(push(account.syncKey, revision))]);
    assert.deepEqual(responses.map((r) => r.status).sort(), [200, 409]);
    assert.equal((await repo.getSnapshot(account.accountId)).revision, revision + 1);
  }
  assert.equal((await app(push(account.syncKey, 0))).status, 409);
});
test('D1 account deletion cascades and a delayed writer cannot revive the snapshot', async (t) => {
  const { repo, db } = sqliteD1(t);
  const app = createBackendApp({ repo });
  const account = await create(app);
  assert.equal((await app(push(account.syncKey, 0))).status, 200);
  const deletion = await app(new Request('http://test/v1/account', { method: 'DELETE', headers: { authorization: `Bearer ${account.syncKey}` } }));
  assert.equal(deletion.status, 200);
  assert.equal(db.prepare('SELECT count(*) AS n FROM sync_snapshots').get().n, 0);
  assert.deepEqual(await repo.compareAndSetSnapshot(account.accountId, 0, { revision: 1, updatedAt: new Date().toISOString(), payload: {} }), { ok: false, reason: 'unauthorized' });
  assert.equal((await app(push(account.syncKey, 1))).status, 401);
});
test('Worker scheduled cleanup removes expired D1 events without API traffic', async (t) => {
  const { db, adapter } = sqliteD1(t);
  const now = Date.parse('2026-10-04T00:00:00Z');
  const cutoff = now - 30 * 24 * 60 * 60 * 1000;
  const insert = db.prepare('INSERT INTO operational_events (type, created_at) VALUES (?, ?)');
  for (const time of [cutoff - 1, cutoff, cutoff + 1]) insert.run('sync_pull', new Date(time).toISOString());
  const pending = [];
  await worker.scheduled({ scheduledTime: now }, { DB: adapter }, { waitUntil(p) { pending.push(p); } });
  await Promise.all(pending);
  assert.equal(db.prepare('SELECT count(*) AS n FROM operational_events').get().n, 1);
  assert.equal(db.prepare('SELECT created_at FROM operational_events').get().created_at, new Date(cutoff + 1).toISOString());
});

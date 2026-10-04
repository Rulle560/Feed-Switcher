import test from 'node:test';
import assert from 'node:assert/strict';
import { createBackendApp } from '../src/app.mjs';
import { JsonFileRepo } from '../src/dev-repo.mjs';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';

class MemoryRepo {
  accounts = new Map();
  snapshots = new Map();
  events = [];
  async createAccount(a){ this.accounts.set(a.id, structuredClone(a)); }
  async getAccount(id){ return this.accounts.get(id) || null; }
  async getSnapshot(id){ return this.snapshots.get(id) || null; }
  async compareAndSetSnapshot(id, baseRevision, snapshot){
    if (!this.accounts.has(id)) return { ok:false, reason:'unauthorized' };
    const currentRevision = this.snapshots.get(id)?.revision || 0;
    if (currentRevision !== baseRevision) return { ok:false, reason:'conflict', currentRevision };
    this.snapshots.set(id, structuredClone(snapshot));
    return { ok:true };
  }
  async deleteAccount(id, _deletedAt){ this.accounts.delete(id); this.snapshots.delete(id); }
  async appendEvent(e){ this.events.push(structuredClone(e)); }
}

function make() {
  const repo = new MemoryRepo();
  const app = createBackendApp({
    repo,
    now: () => new Date('2026-09-19T00:00:00.000Z'),
    configProvider: () => ({
      gateCeiling: 'LEVEL_A',
      flags: { API_ENHANCED_SEARCH: false, DERIVED_METRICS: false },
      message: 'test'
    })
  });
  return { repo, app };
}

async function body(res){ return res.json(); }
async function createAccount(app) {
  const res = await app(new Request('http://test/v1/accounts', { method:'POST', headers:{'x-fs-client-version':'0.6.0'} }));
  return { res, data: await body(res) };
}

function authHeaders(key){ return { authorization:`Bearer ${key}`, 'content-type':'application/json', 'x-fs-client-version':'0.6.0' }; }

function syncPayload() {
  return { schemaVersion:1, discovery:{ topic:'science' }, profiles:{ schemaVersion:1, favorites:[], recent:[] } };
}

function syncRequest(key, baseRevision = 0, data = syncPayload(), extra = {}) {
  return new Request('http://test/v1/sync', { method:'PUT', headers:authHeaders(key), body:JSON.stringify({ baseRevision, data, ...extra }) });
}

async function temporaryRepo(t) {
  const dir = resolve(await mkdtemp(join(tmpdir(), 'feed-switcher-test-')));
  assert.ok(dir.startsWith(`${resolve(tmpdir())}${sep}`));
  t.after(() => rm(dir, { recursive:true, force:true }));
  const file = join(dir, 'db.json');
  return { repo: new JsonFileRepo(file), file };
}

test('CORS preflight returns a valid empty 204 response without side effects', async () => {
  const { app, repo } = make();
  const res = await app(new Request('http://test/v1/sync', { method:'OPTIONS', headers:{origin:'https://example.test','access-control-request-method':'PUT'} }));
  assert.equal(res.status, 204);
  assert.equal(await res.text(), '');
  assert.match(res.headers.get('access-control-allow-methods'), /PUT/);
  assert.match(res.headers.get('access-control-allow-headers'), /authorization/);
  assert.equal(repo.events.length, 0);
});

test('health and remote config are public and flags default-safe', async () => {
  const { app } = make();
  const health = await app(new Request('http://test/health'));
  assert.equal(health.status, 200);
  const cfg = await app(new Request('http://test/v1/config'));
  const data = await body(cfg);
  assert.equal(data.config.gateCeiling, 'LEVEL_A');
  assert.equal(data.config.flags.DERIVED_METRICS, false);
  assert.equal(data.config.flags.ALERTS, false);
});

test('account creation returns a recoverable sync key but repo stores only hash', async () => {
  const { app, repo } = make();
  const { res, data } = await createAccount(app);
  assert.equal(res.status, 201);
  assert.match(data.syncKey, /^fs1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
  const account = repo.accounts.get(data.accountId);
  assert.ok(account.secretHash);
  assert.equal(JSON.stringify(account).includes(data.syncKey.split('.')[2]), false);
});

test('sync push/pull uses optimistic revision and rejects conflicts', async () => {
  const { app } = make();
  const { data: account } = await createAccount(app);
  const payload = { schemaVersion:1, discovery:{ topic:'science' }, profiles:{ schemaVersion:1, favorites:[], recent:[] } };
  const push = await app(new Request('http://test/v1/sync', {
    method:'PUT', headers:authHeaders(account.syncKey), body:JSON.stringify({baseRevision:0,data:payload})
  }));
  assert.equal(push.status, 200);
  assert.equal((await body(push)).revision, 1);

  const conflict = await app(new Request('http://test/v1/sync', {
    method:'PUT', headers:authHeaders(account.syncKey), body:JSON.stringify({baseRevision:0,data:payload})
  }));
  assert.equal(conflict.status, 409);
  assert.equal((await body(conflict)).currentRevision, 1);

  const pull = await app(new Request('http://test/v1/sync', { headers:authHeaders(account.syncKey) }));
  const pulled = await body(pull);
  assert.equal(pulled.revision, 1);
  assert.equal(pulled.data.discovery.topic, 'science');
});

test('invalid token cannot read sync state', async () => {
  const { app } = make();
  const res = await app(new Request('http://test/v1/sync', { headers:{ authorization:'Bearer fs1.fake.fakefakefakefakefakefake' } }));
  assert.equal(res.status, 401);
});

test('account deletion hard-deletes account/snapshot and invalidates token', async () => {
  const { app, repo } = make();
  const { data: account } = await createAccount(app);
  assert.equal((await app(syncRequest(account.syncKey))).status, 200);
  assert.equal(repo.snapshots.has(account.accountId), true);
  const del = await app(new Request('http://test/v1/account', { method:'DELETE', headers:authHeaders(account.syncKey) }));
  assert.equal(del.status, 200);
  assert.equal(repo.accounts.has(account.accountId), false);
  assert.equal(repo.snapshots.has(account.accountId), false);
  const me = await app(new Request('http://test/v1/me', { headers:authHeaders(account.syncKey) }));
  assert.equal(me.status, 401);
});

test('operational events never persist sync keys or user discovery payload', async () => {
  const { app, repo } = make();
  const { data: account } = await createAccount(app);
  await app(new Request('http://test/v1/me', { headers:authHeaders(account.syncKey) }));
  const serialized = JSON.stringify(repo.events);
  assert.equal(serialized.includes(account.syncKey), false);
  assert.equal(serialized.includes('science'), false);
  for (const event of repo.events) {
    assert.deepEqual(Object.keys(event).sort(), ['accountHash','at','clientVersion','status','type'].sort());
  }
});


test('development repo purges operational events older than 30 days', async (t) => {
  const { repo, file } = await temporaryRepo(t);
  await repo.appendEvent({ type:'config_fetch', accountHash:'old', status:'ok', clientVersion:'0.6.0', at:'2026-07-01T00:00:00.000Z' });
  await repo.appendEvent({ type:'config_fetch', accountHash:'new', status:'ok', clientVersion:'0.6.0', at:'2026-09-21T00:00:00.000Z' });
  const data = JSON.parse(await readFile(file, 'utf8'));
  assert.equal(data.events.length, 1);
  assert.equal(data.events[0].accountHash, 'new');
});

test('simultaneous API uploads from the same revision yield exactly one winner', async () => {
  const { app } = make();
  const { data: account } = await createAccount(app);
  const payloadA = syncPayload();
  const payloadB = syncPayload();
  payloadB.discovery.topic = 'history';
  const results = await Promise.all([app(syncRequest(account.syncKey, 0, payloadA)), app(syncRequest(account.syncKey, 0, payloadB))]);
  assert.deepEqual(results.map((response) => response.status).sort(), [200,409]);
  const final = await body(await app(new Request('http://test/v1/sync', {headers:authHeaders(account.syncKey)})));
  assert.equal(final.revision, 1);
  assert.equal(final.data.discovery.topic, results[0].status === 200 ? 'science' : 'history');
});

test('sync whitelist rejects malformed nested inputs without storing arbitrary fields', async (t) => {
  const { app, repo } = make();
  const { data: account } = await createAccount(app);
  const badInputs = [
    ['array discovery', (data) => { data.discovery = []; }],
    ['array profiles', (data) => { data.profiles = []; }],
    ['unknown payload field', (data) => { data.syncKey = 'not-a-permitted-field'; }],
    ['unknown discovery field', (data) => { data.discovery.history = ['not-a-permitted-field']; }],
    ['unknown profiles field', (data) => { data.profiles.credentials = 'not-a-permitted-field'; }],
    ['wrong schema version', (data) => { data.schemaVersion = 2; }],
    ['wrong profiles schema version', (data) => { data.profiles.schemaVersion = 2; }],
    ['invalid topic', (data) => { data.discovery.topic = 'invalid'; }],
    ['invalid active type', (data) => { data.discovery.active = 'true'; }],
    ['oversize custom topic', (data) => { data.discovery.customTopic = 'x'.repeat(81); }],
    ['null favorite', (data) => { data.profiles.favorites = [null]; }],
    ['invalid favorite timestamp', (data) => { data.profiles.favorites = [{id:'test',name:'Test',discovery:{},createdAt:'invalid',updatedAt:'invalid'}]; }],
    ['unknown favorite field', (data) => { data.profiles.favorites = [{id:'test',name:'Test',discovery:{},createdAt:'2026-09-19T00:00:00Z',updatedAt:'2026-09-19T00:00:00Z',secret:'not-permitted'}]; }],
    ['too many favorites', (data) => { data.profiles.favorites = Array.from({length:25}, () => ({})); }],
    ['too many recent presets', (data) => { data.profiles.recent = Array.from({length:9}, () => ({})); }],
    ['invalid recent fingerprint', (data) => { data.profiles.recent = [{key:'wrong',discovery:{},lastUsedAt:'2026-09-19T00:00:00Z'}]; }]
  ];
  for (const [name, modify] of badInputs) {
    await t.test(name, async () => {
      const payload = syncPayload();
      modify(payload);
      const response = await app(syncRequest(account.syncKey, 0, payload));
      assert.equal(response.status, 400);
      assert.equal((await body(response)).error, 'invalid_sync_payload');
      assert.equal(repo.snapshots.has(account.accountId), false);
    });
  }
  for (const baseRevision of [-1, 0.5, '0', Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal((await app(syncRequest(account.syncKey, baseRevision))).status, 400);
  }
  assert.equal((await app(syncRequest(account.syncKey, 0, syncPayload(), {enabled:true}))).status, 400);
});

test('valid profiles round-trip with every active state forced off', async () => {
  const { app } = make();
  const { data: account } = await createAccount(app);
  const payload = syncPayload();
  payload.discovery.active = true;
  payload.profiles.favorites = [{id:'profile-1',name:'Science',discovery:{topic:'science',active:true},createdAt:'2026-09-18T08:00:00Z',updatedAt:'2026-09-19T08:00:00Z'}];
  payload.profiles.recent = [{key:'science||any|GLOBAL|7D|RELEVANCE',discovery:{topic:'science',active:true},lastUsedAt:'2026-09-19T08:00:00Z'}];
  assert.equal((await app(syncRequest(account.syncKey, 0, payload))).status, 200);
  const pulled = await body(await app(new Request('http://test/v1/sync', {headers:authHeaders(account.syncKey)})));
  assert.equal(pulled.data.discovery.active, false);
  assert.equal(pulled.data.profiles.favorites[0].discovery.active, false);
  assert.equal(pulled.data.profiles.recent[0].discovery.active, false);
  assert.equal(pulled.data.profiles.favorites[0].name, 'Science');
});

test('JSON media type, valid object and actual UTF-8 byte limits are enforced', async () => {
  const { app, repo } = make();
  const { data: account } = await createAccount(app);
  for (const raw of ['{','null','[]','123','"string"','']) {
    const response = await app(new Request('http://test/v1/sync', {method:'PUT',headers:authHeaders(account.syncKey),body:raw}));
    assert.equal(response.status, 400);
  }
  const textResponse = await app(new Request('http://test/v1/sync', {method:'PUT',headers:{...authHeaders(account.syncKey),'content-type':'text/plain'},body:'{}'}));
  assert.equal(textResponse.status, 400);
  assert.equal((await body(textResponse)).error, 'json_required');
  const unicodeBody = JSON.stringify({topic:'中'.repeat(90_000)});
  assert.ok(unicodeBody.length < 256 * 1024);
  const tooLarge = await app(new Request('http://test/v1/sync', {method:'PUT',headers:authHeaders(account.syncKey),body:unicodeBody}));
  assert.equal(tooLarge.status, 413);
  assert.equal(repo.snapshots.has(account.accountId), false);
});

test('operational events discard untrusted version text and use the injected clock', async () => {
  const { app, repo } = make();
  await app(new Request('http://test/v1/config', {headers:{'x-fs-client-version':'https://private.test/query'}}));
  assert.equal(repo.events[0].clientVersion, '');
  assert.equal(repo.events[0].at, '2026-09-19T00:00:00.000Z');
});

test('JSON repository atomically resolves concurrent writes and preserves snapshots across reopen', async (t) => {
  const { repo, file } = await temporaryRepo(t);
  await repo.createAccount({id:'test-account',secretHash:'test-hash',createdAt:'2026-09-19T00:00:00Z',deletedAt:null});
  const results = await Promise.all([
    repo.compareAndSetSnapshot('test-account',0,{revision:1,payload:{topic:'a'},updatedAt:'2026-09-19T00:00:00Z'}),
    repo.compareAndSetSnapshot('test-account',0,{revision:1,payload:{topic:'b'},updatedAt:'2026-09-19T00:00:00Z'})
  ]);
  assert.equal(results.filter((result) => result.ok).length, 1);
  assert.equal(results.find((result) => !result.ok).currentRevision, 1);
  const reopened = new JsonFileRepo(file);
  assert.equal((await reopened.getSnapshot('test-account')).payload.topic, 'a');
  await reopened.deleteAccount('test-account');
  assert.deepEqual(await reopened.compareAndSetSnapshot('test-account',0,{revision:1,payload:{},updatedAt:'2026-09-19T00:00:00Z'}), {ok:false,reason:'unauthorized'});
  assert.equal(await reopened.getSnapshot('test-account'), null);
});

test('JSON repository preserves corrupt files and independent cleanup deletes expired/invalid events', async (t) => {
  const { repo, file } = await temporaryRepo(t);
  await writeFile(file, '{broken', 'utf8');
  await assert.rejects(repo.createAccount({id:'new'}));
  assert.equal(await readFile(file,'utf8'), '{broken');
  await writeFile(file, JSON.stringify({accounts:{},snapshots:{},events:[
    {at:'2026-08-20T00:00:00.000Z'}, {at:'2026-08-21T00:00:00.000Z'}, {at:'invalid'}, {at:'2026-08-21T00:00:00.001Z'}
  ]}), 'utf8');
  assert.equal(await repo.purgeEvents('2026-08-21T00:00:00.000Z'), 3);
  assert.equal(JSON.parse(await readFile(file,'utf8')).events.length, 1);
});

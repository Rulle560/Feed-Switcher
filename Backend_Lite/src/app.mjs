export const MAX_BODY_BYTES = 256 * 1024;
const TOKEN_PREFIX = 'fs1';
const ALLOWED_EVENTS = new Set(['account_create','account_validate','sync_pull','sync_push','sync_conflict','config_fetch','account_delete']);

function json(data, status = 200, headers = {}) {
  return new Response(status === 204 ? null : JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'access-control-allow-origin': '*',
      'access-control-allow-headers': 'authorization, content-type, x-fs-client-version',
      'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS',
      ...headers
    }
  });
}

function safeString(value, max = 120) {
  return typeof value === 'string' ? value.slice(0, max) : '';
}

function nowIso(now = new Date()) {
  return now.toISOString();
}

function bytesToBase64Url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

function randomBase64Url(byteLength = 24) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return bytesToBase64Url(bytes);
}

async function sha256Hex(text) {
  const bytes = new TextEncoder().encode(text);
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  return [...digest].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function readJson(request) {
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type') || '')) {
    throw Object.assign(new Error('json_required'), { status: 400 });
  }
  const size = Number(request.headers.get('content-length') || '0');
  if (size > MAX_BODY_BYTES) throw Object.assign(new Error('body_too_large'), { status: 413 });
  const reader = request.body?.getReader();
  if (!reader) throw Object.assign(new Error('invalid_json'), { status: 400 });
  const chunks = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_BODY_BYTES) {
        await reader.cancel();
        throw Object.assign(new Error('body_too_large'), { status: 413 });
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  try {
    const body = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    if (!isRecord(body)) throw new Error('invalid_json');
    return body;
  } catch { throw Object.assign(new Error('invalid_json'), { status: 400 }); }
}

function isRecord(input) {
  return !!input && typeof input === 'object' && !Array.isArray(input);
}

function hasOnlyKeys(input, keys) {
  return isRecord(input) && Object.keys(input).every((key) => keys.includes(key));
}

const DISCOVERY_DEFAULTS = Object.freeze({ active: false, topic: 'history', customTopic: '', language: 'any', region: 'GLOBAL', timeRange: '7D', sort: 'RELEVANCE' });
const DISCOVERY_VALUES = Object.freeze({
  topic: ['history','technology','finance','military','politics','film','celebrity','science','business','geopolitics','gaming','custom'],
  language: ['any','zh-Hans','zh-Hant','en','ja','ko','es','de','fr'],
  region: ['GLOBAL','US','GB','JP','KR','DE','CA','AU','IN','TW','HK','SG'],
  timeRange: ['24H','7D','30D','ANY'],
  sort: ['RELEVANCE','LATEST','VIEW_COUNT']
});

function normalizeDiscovery(input) {
  if (!hasOnlyKeys(input, Object.keys(DISCOVERY_DEFAULTS))) return null;
  if (input.active !== undefined && typeof input.active !== 'boolean') return null;
  if (input.customTopic !== undefined && (typeof input.customTopic !== 'string' || input.customTopic.length > 80)) return null;
  for (const [key, values] of Object.entries(DISCOVERY_VALUES)) {
    if (input[key] !== undefined && !values.includes(input[key])) return null;
  }
  return { ...DISCOVERY_DEFAULTS, ...input, active: false };
}

function validTimestamp(value) {
  return typeof value === 'string' && value.length <= 40 && Number.isFinite(Date.parse(value));
}

function normalizeProfiles(input) {
  if (!hasOnlyKeys(input, ['schemaVersion','favorites','recent']) || input.schemaVersion !== 1 ||
      !Array.isArray(input.favorites) || input.favorites.length > 24 ||
      !Array.isArray(input.recent) || input.recent.length > 8) return null;
  const favorites = [];
  const recent = [];
  const ids = new Set();
  const recentKeys = new Set();
  for (const item of input.favorites) {
    if (!hasOnlyKeys(item, ['id','name','discovery','createdAt','updatedAt']) ||
        typeof item.id !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(item.id) || ids.has(item.id) ||
        typeof item.name !== 'string' || !item.name.trim() || item.name.length > 40 ||
        !validTimestamp(item.createdAt) || !validTimestamp(item.updatedAt)) return null;
    const discovery = normalizeDiscovery(item.discovery);
    if (!discovery) return null;
    ids.add(item.id);
    favorites.push({ id: item.id, name: item.name, discovery, createdAt: new Date(item.createdAt).toISOString(), updatedAt: new Date(item.updatedAt).toISOString() });
  }
  for (const item of input.recent) {
    if (!hasOnlyKeys(item, ['key','discovery','lastUsedAt']) || !validTimestamp(item.lastUsedAt)) return null;
    const discovery = normalizeDiscovery(item.discovery);
    if (!discovery) return null;
    const key = [discovery.topic, discovery.customTopic.toLocaleLowerCase(), discovery.language, discovery.region, discovery.timeRange, discovery.sort].join('|');
    if (item.key !== key || recentKeys.has(key)) return null;
    recentKeys.add(key);
    recent.push({ key, discovery, lastUsedAt: new Date(item.lastUsedAt).toISOString() });
  }
  return { schemaVersion: 1, favorites, recent };
}

function normalizeGate(value) {
  return value === 'LEVEL_C' || value === 'LEVEL_B' ? value : 'LEVEL_A';
}

function normalizeFlags(input) {
  const keys = ['API_ENHANCED_SEARCH','DERIVED_METRICS','AI_TOPIC_TAGGING','HISTORICAL_TRACKING','CREATOR_RANKINGS','ALERTS'];
  const source = input && typeof input === 'object' ? input : {};
  return Object.fromEntries(keys.map((key) => [key, source[key] === true]));
}

function normalizeConfig(input = {}) {
  if (!isRecord(input)) input = {};
  return {
    gateCeiling: normalizeGate(input.gateCeiling),
    flags: normalizeFlags(input.flags),
    message: safeString(input.message, 240),
    updatedAt: safeString(input.updatedAt, 40) || nowIso()
  };
}

function normalizeSyncPayload(input) {
  if (!hasOnlyKeys(input, ['schemaVersion','discovery','profiles']) || input.schemaVersion !== 1) return null;
  const discovery = normalizeDiscovery(input.discovery);
  const profiles = normalizeProfiles(input.profiles);
  if (!discovery || !profiles) return null;
  return {
    schemaVersion: 1,
    discovery,
    profiles
  };
}

function parseToken(request) {
  const header = request.headers.get('authorization') || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  const token = match[1].trim();
  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== TOKEN_PREFIX) return null;
  const accountId = parts[1];
  const secret = parts[2];
  if (!/^[a-zA-Z0-9_-]{8,80}$/.test(accountId) || !/^[a-zA-Z0-9_-]{20,100}$/.test(secret)) return null;
  return { token, accountId, secret };
}

async function authenticate(request, repo) {
  const parsed = parseToken(request);
  if (!parsed) return null;
  const account = await repo.getAccount(parsed.accountId);
  if (!account || account.deletedAt) return null;
  const secretHash = await sha256Hex(parsed.secret);
  if (secretHash !== account.secretHash) return null;
  return { account, parsed };
}

async function writeEvent(repo, type, details = {}, at = new Date()) {
  if (!ALLOWED_EVENTS.has(type)) return;
  const safe = {
    type,
    accountHash: safeString(details.accountHash, 80),
    status: safeString(details.status, 40),
    clientVersion: /^[0-9]{1,4}\.[0-9]{1,4}\.[0-9]{1,4}(?:-[A-Za-z0-9.]{1,8})?$/.test(details.clientVersion || '') ? details.clientVersion : '',
    at: nowIso(at)
  };
  try { await repo.appendEvent(safe); } catch { /* operational logs must never break API */ }
}

export function createBackendApp({ repo, configProvider = () => ({}), now = () => new Date() }) {
  function event(type, details) { return writeEvent(repo, type, details, now()); }
  async function accountHash(accountId) {
    return (await sha256Hex(accountId)).slice(0, 16);
  }

  return async function handle(request) {
    if (request.method === 'OPTIONS') return json(null, 204);
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';
    const clientVersion = safeString(request.headers.get('x-fs-client-version') || '', 24);

    try {
      if (request.method === 'GET' && path === '/health') {
        return json({ ok: true, service: 'feed-switcher-backend-lite', version: 1, time: nowIso(now()) });
      }

      if (request.method === 'GET' && path === '/v1/config') {
        const config = normalizeConfig(await configProvider());
        await event('config_fetch', { status: 'ok', clientVersion });
        return json({ ok: true, config });
      }

      if (request.method === 'POST' && path === '/v1/accounts') {
        const accountId = randomBase64Url(12);
        const secret = randomBase64Url(32);
        const secretHash = await sha256Hex(secret);
        const createdAt = nowIso(now());
        await repo.createAccount({ id: accountId, secretHash, createdAt, deletedAt: null });
        await event('account_create', { accountHash: await accountHash(accountId), status: 'ok', clientVersion });
        return json({ ok: true, accountId, syncKey: `${TOKEN_PREFIX}.${accountId}.${secret}`, revision: 0 }, 201);
      }

      if (request.method === 'GET' && path === '/v1/me') {
        const auth = await authenticate(request, repo);
        if (!auth) return json({ ok: false, error: 'unauthorized' }, 401);
        const snapshot = await repo.getSnapshot(auth.account.id);
        await event('account_validate', { accountHash: await accountHash(auth.account.id), status: 'ok', clientVersion });
        return json({ ok: true, accountId: auth.account.id, revision: snapshot?.revision || 0, hasSnapshot: !!snapshot?.payload });
      }

      if (request.method === 'GET' && path === '/v1/sync') {
        const auth = await authenticate(request, repo);
        if (!auth) return json({ ok: false, error: 'unauthorized' }, 401);
        const snapshot = await repo.getSnapshot(auth.account.id);
        await event('sync_pull', { accountHash: await accountHash(auth.account.id), status: 'ok', clientVersion });
        return json({
          ok: true,
          accountId: auth.account.id,
          revision: snapshot?.revision || 0,
          updatedAt: snapshot?.updatedAt || null,
          data: snapshot?.payload || null
        });
      }

      if (request.method === 'PUT' && path === '/v1/sync') {
        const auth = await authenticate(request, repo);
        if (!auth) return json({ ok: false, error: 'unauthorized' }, 401);
        const body = await readJson(request);
        const baseRevision = Number.isSafeInteger(body.baseRevision) && body.baseRevision >= 0 && body.baseRevision < Number.MAX_SAFE_INTEGER ? body.baseRevision : -1;
        const payload = normalizeSyncPayload(body.data);
        if (!hasOnlyKeys(body, ['baseRevision','data']) || baseRevision < 0 || !payload) return json({ ok: false, error: 'invalid_sync_payload' }, 400);

        const nextRevision = baseRevision + 1;
        const updatedAt = nowIso(now());
        const result = await repo.compareAndSetSnapshot(auth.account.id, baseRevision, { revision: nextRevision, updatedAt, payload });
        if (!result.ok) {
          if (result.reason === 'unauthorized') return json({ ok: false, error: 'unauthorized' }, 401);
          await event('sync_conflict', { accountHash: await accountHash(auth.account.id), status: 'conflict', clientVersion });
          return json({ ok: false, error: 'revision_conflict', currentRevision: result.currentRevision }, 409);
        }
        await event('sync_push', { accountHash: await accountHash(auth.account.id), status: 'ok', clientVersion });
        return json({ ok: true, revision: nextRevision, updatedAt });
      }

      if (request.method === 'DELETE' && path === '/v1/account') {
        const auth = await authenticate(request, repo);
        if (!auth) return json({ ok: false, error: 'unauthorized' }, 401);
        const hash = await accountHash(auth.account.id);
        await repo.deleteAccount(auth.account.id, nowIso(now()));
        await event('account_delete', { accountHash: hash, status: 'ok', clientVersion });
        return json({ ok: true });
      }

      return json({ ok: false, error: 'not_found' }, 404);
    } catch (error) {
      const errorStatus = Number(error?.status);
      const status = Number.isInteger(errorStatus) && errorStatus >= 400 && errorStatus <= 599 ? errorStatus : 500;
      const code = status >= 500 ? 'internal_error' : safeString(error?.message || 'bad_request', 80);
      return json({ ok: false, error: code }, status);
    }
  };
}

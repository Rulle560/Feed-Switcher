import { mkdir, readFile, writeFile, rename, unlink } from 'node:fs/promises';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';

export const EVENT_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

function purgeExpiredEvents(data, cutoffMs) {
  const previousCount = data.events.length;
  data.events = data.events.filter((item) => {
    const atMs = Date.parse(item.at);
    return Number.isFinite(atMs) && atMs > cutoffMs;
  });
  return previousCount - data.events.length;
}

export class JsonFileRepo {
  constructor(filePath) {
    this.filePath = filePath;
    this.queue = Promise.resolve();
  }

  async _load() {
    try {
      const text = await readFile(this.filePath, 'utf8');
      const data = JSON.parse(text);
      if (!data || typeof data !== 'object' || Array.isArray(data) ||
          !data.accounts || typeof data.accounts !== 'object' || Array.isArray(data.accounts) ||
          !data.snapshots || typeof data.snapshots !== 'object' || Array.isArray(data.snapshots) ||
          !Array.isArray(data.events)) throw new Error('Invalid development database');
      return { accounts: data.accounts, snapshots: data.snapshots, events: data.events };
    } catch (error) {
      if (error.code === 'ENOENT') return { accounts: {}, snapshots: {}, events: [] };
      throw error;
    }
  }

  async _save(data) {
    await mkdir(dirname(this.filePath), { recursive: true });
    const temporaryPath = `${this.filePath}.tmp-${randomUUID()}`;
    try {
      await writeFile(temporaryPath, JSON.stringify(data, null, 2), { encoding: 'utf8', mode: 0o600 });
      await rename(temporaryPath, this.filePath);
    } finally {
      await unlink(temporaryPath).catch((error) => { if (error.code !== 'ENOENT') throw error; });
    }
  }

  async _mutate(fn) {
    const task = this.queue.then(async () => {
      const data = await this._load();
      const result = await fn(data);
      await this._save(data);
      return result;
    });
    this.queue = task.catch(() => {});
    return task;
  }

  async createAccount(account) {
    return this._mutate((data) => {
      data.accounts[account.id] = account;
    });
  }

  async getAccount(id) {
    await this.queue;
    const data = await this._load();
    return data.accounts[id] || null;
  }

  async getSnapshot(accountId) {
    await this.queue;
    const data = await this._load();
    return data.snapshots[accountId] || null;
  }

  async compareAndSetSnapshot(accountId, baseRevision, snapshot) {
    return this._mutate((data) => {
      if (!Object.hasOwn(data.accounts, accountId) || data.accounts[accountId].deletedAt) return { ok: false, reason: 'unauthorized' };
      const currentRevision = data.snapshots[accountId]?.revision || 0;
      if (currentRevision !== baseRevision) return { ok: false, reason: 'conflict', currentRevision };
      data.snapshots[accountId] = structuredClone(snapshot);
      return { ok: true };
    });
  }

  async deleteAccount(accountId, _deletedAt) {
    return this._mutate((data) => {
      delete data.accounts[accountId];
      delete data.snapshots[accountId];
    });
  }

  async appendEvent(event) {
    return this._mutate((data) => {
      const atMs = Date.parse(event.at);
      if (!Number.isFinite(atMs)) throw new Error('Invalid event timestamp');
      purgeExpiredEvents(data, atMs - EVENT_RETENTION_MS);
      data.events.push(structuredClone(event));
      if (data.events.length > 500) data.events.splice(0, data.events.length - 500);
    });
  }

  async purgeEvents(beforeIso) {
    const cutoffMs = Date.parse(beforeIso);
    if (!Number.isFinite(cutoffMs)) throw new Error('Invalid retention cutoff');
    return this._mutate((data) => purgeExpiredEvents(data, cutoffMs));
  }
}

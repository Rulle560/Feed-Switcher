export class D1Repo {
  constructor(db) { this.db = db; }

  async createAccount(account) {
    await this.db.prepare('INSERT INTO accounts (id, secret_hash, created_at, deleted_at) VALUES (?, ?, ?, NULL)')
      .bind(account.id, account.secretHash, account.createdAt).run();
  }

  async getAccount(id) {
    const row = await this.db.prepare('SELECT id, secret_hash, created_at, deleted_at FROM accounts WHERE id = ?').bind(id).first();
    if (!row) return null;
    return { id: row.id, secretHash: row.secret_hash, createdAt: row.created_at, deletedAt: row.deleted_at };
  }

  async getSnapshot(accountId) {
    const row = await this.db.prepare('SELECT revision, updated_at, payload_json FROM sync_snapshots WHERE account_id = ?').bind(accountId).first();
    if (!row) return null;
    return { revision: Number(row.revision), updatedAt: row.updated_at, payload: JSON.parse(row.payload_json) };
  }

  async compareAndSetSnapshot(accountId, baseRevision, snapshot) {
    // Check the account and revision within this one SQL statement. A stale
    // writer must neither overwrite another client nor recreate a deleted row.
    const result = await this.db.prepare(`
      INSERT INTO sync_snapshots (account_id, revision, updated_at, payload_json)
      SELECT ?, ?, ?, ? FROM accounts
      WHERE id = ? AND deleted_at IS NULL
        AND (? = 0 OR EXISTS (
          SELECT 1 FROM sync_snapshots WHERE account_id = ? AND revision = ?
        ))
      ON CONFLICT(account_id) DO UPDATE SET revision = excluded.revision, updated_at = excluded.updated_at, payload_json = excluded.payload_json
      WHERE sync_snapshots.revision = ?
    `).bind(accountId, snapshot.revision, snapshot.updatedAt, JSON.stringify(snapshot.payload), accountId, baseRevision, accountId, baseRevision, baseRevision).run();
    if (result.meta?.changes === 1) return { ok: true };
    const account = await this.getAccount(accountId);
    if (!account || account.deletedAt) return { ok: false, reason: 'unauthorized' };
    const current = await this.getSnapshot(accountId);
    return { ok: false, reason: 'conflict', currentRevision: current?.revision || 0 };
  }

  async deleteAccount(accountId, _deletedAt) {
    await this.db.prepare('DELETE FROM accounts WHERE id = ?').bind(accountId).run();
  }

  async appendEvent(event) {
    const atMs = Date.parse(event.at);
    const cutoff = new Date((Number.isNaN(atMs) ? Date.now() : atMs) - 30 * 24 * 60 * 60 * 1000).toISOString();
    await this.db.batch([
      this.db.prepare('INSERT INTO operational_events (type, account_hash, status, client_version, created_at) VALUES (?, ?, ?, ?, ?)')
        .bind(event.type, event.accountHash || '', event.status || '', event.clientVersion || '', event.at),
      this.db.prepare('DELETE FROM operational_events WHERE created_at <= ?').bind(cutoff)
    ]);
  }

  async purgeEvents(beforeIso) {
    if (!Number.isFinite(Date.parse(beforeIso))) throw new Error('Invalid retention cutoff');
    const result = await this.db.prepare('DELETE FROM operational_events WHERE created_at <= ?').bind(beforeIso).run();
    return Number(result.meta?.changes || 0);
  }
}

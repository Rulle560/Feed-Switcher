const test = require('node:test');
const assert = require('node:assert/strict');
const { mkdtempSync, readFileSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');
const { createHash } = require('node:crypto');

test('offline package is repeatable, source-identical and contains no legacy/private files', async () => {
  const p = await import('../scripts/extension-package.mjs');
  const directory = mkdtempSync(join(p.ROOT, '.test-build-'));
  const hashes = () => p.RUNTIME_FILES.map((name) => createHash('sha256').update(readFileSync(join(directory, name))).digest('hex'));
  try {
    p.buildExtension(directory); const first = hashes();
    p.buildExtension(directory);
    assert.deepEqual(hashes(), first);
    assert.equal(p.validateExtension(directory, { compareSource: true }).version, '0.6.3');
    const current = readFileSync(join(directory, 'popup.js'), 'utf8');
    writeFileSync(join(directory, 'popup.js'), `${current}\n// unexpected hand edit\n`);
    assert.throws(() => p.validateExtension(directory, { compareSource: true }), /differs from source/);
  } finally { p.removeOutputDirectory(directory); }
});

test('manifest validation rejects expanded permissions and mismatched versions', async () => {
  const p = await import('../scripts/extension-package.mjs');
  const directory = mkdtempSync(join(p.ROOT, '.test-build-'));
  try {
    p.buildExtension(directory);
    const path = join(directory, 'manifest.json'); const manifest = JSON.parse(readFileSync(path));
    writeFileSync(path, JSON.stringify({ ...manifest, permissions: ['storage', 'history'] }));
    assert.throws(() => p.validateExtension(directory), /permissions.*mismatch/i);
    writeFileSync(path, JSON.stringify({ ...manifest, version: '0.4.1' }));
    assert.throws(() => p.validateExtension(directory), /versions differ/);
    assert.throws(() => p.removeOutputDirectory(p.ROOT), /Refusing/);
  } finally { p.removeOutputDirectory(directory); }
});

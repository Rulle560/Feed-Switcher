const test = require('node:test');
const assert = require('node:assert/strict');
const { makeHarness, syntheticAccount } = require('./helpers/extension-harness.cjs');

test('current background refuses all upload/download/account creation actions without current consent', async () => {
  const h = makeHarness(); h.load('background.js');
  for (const action of ['CREATE_ACCOUNT', 'CONNECT_ACCOUNT', 'PUSH', 'PULL']) {
    assert.equal((await h.message(action)).error, 'privacy_consent_required');
  }
  assert.equal(h.calls.fetch.length, 0);
});

test('outdated policy consent is rejected before any request', async () => {
  const h = makeHarness({ initial: { 'fs.privacy-consent.v1': { schemaVersion: 1, policyVersion: 'obsolete', cloudSyncAcceptedAt: '2026-09-01T00:00:00Z' } } });
  h.load('background.js');
  assert.equal((await h.message('PUSH')).error, 'privacy_consent_required');
  assert.equal(h.calls.fetch.length, 0);
});

test('consent withdrawn between async state reads blocks the pending upload', async () => {
  const h = makeHarness({ initial: { 'fs.backend-account.v1': syntheticAccount() }, getHook: ({ state, count }) => {
    if (count === 3) delete state['fs.privacy-consent.v1'];
  } });
  h.load('background.js');
  h.state['fs.privacy-consent.v1'] = h.context.FSCore.createPrivacyConsent();
  assert.equal((await h.message('PUSH')).error, 'privacy_consent_required');
  assert.equal(h.calls.fetch.length, 0);
});

test('cloud deletion remains available without consent and keeps local favorites', async () => {
  const h = makeHarness({ initial: { 'fs.backend-account.v1': syntheticAccount(), 'fs.profiles.v1': { schemaVersion: 1, favorites: [{ id: 'saved', name: 'Local favorite', discovery: { topic: 'science' } }], recent: [] } },
    fetchImpl: async () => new Response(JSON.stringify({ ok: true }), { status: 200 }) });
  h.load('background.js');
  const before = structuredClone(h.state['fs.profiles.v1']);
  assert.equal((await h.message('DELETE_ACCOUNT')).ok, true);
  assert.equal(h.calls.fetch.length, 1);
  assert.equal(h.calls.fetch[0].init.method, 'DELETE');
  assert.equal('fs.backend-account.v1' in h.state, false);
  assert.deepEqual(h.state['fs.profiles.v1'], before);
});

test('disconnect removes only local account custody and sends no network request', async () => {
  const h = makeHarness({ initial: { 'fs.backend-account.v1': syntheticAccount(), 'fs.profiles.v1': { schemaVersion: 1, favorites: [], recent: [] } } });
  h.load('background.js');
  assert.equal((await h.message('DISCONNECT')).ok, true);
  assert.equal('fs.backend-account.v1' in h.state, false);
  assert.equal('fs.profiles.v1' in h.state, true);
  assert.equal(h.calls.fetch.length, 0);
});

test('manual upload exposes only normalized discovery/profiles and preserves revision conflict', async () => {
  const h = makeHarness({ initial: { 'fs.backend-account.v1': syntheticAccount(), 'fs.settings.v1': { enabled: true, gate: 'LEVEL_C', discovery: { active: true, topic: 'science' }, history: ['private-example'], flags: { AI_TOPIC_TAGGING: true } } },
    fetchImpl: async () => new Response(JSON.stringify({ ok: false, error: 'revision_conflict', currentRevision: 3 }), { status: 409 }) });
  h.load('background.js'); h.state['fs.privacy-consent.v1'] = h.context.FSCore.createPrivacyConsent();
  const result = await h.message('PUSH');
  assert.equal(result.conflict, true);
  assert.equal(h.state['fs.backend-account.v1'].revision, 2);
  const payload = JSON.parse(h.calls.fetch[0].init.body);
  assert.equal(payload.baseRevision, 2);
  assert.deepEqual(Object.keys(payload.data).sort(), ['discovery', 'profiles', 'schemaVersion']);
  assert.equal(payload.data.discovery.active, false);
  assert.equal(JSON.stringify(payload).includes('private-example'), false);
  assert.equal(JSON.stringify(payload).includes(syntheticAccount().syncKey), false);
});

test('privacy export downloads a usable summary without the stored sync credential', async () => {
  const h = makeHarness({ initial: { 'fs.backend-account.v1': syntheticAccount() } });
  h.load('core.js'); h.load('privacy.js'); await h.flush();
  await h.context.exportLocalData();
  const text = await h.calls.blobs[0].text(); const exported = JSON.parse(text);
  assert.equal(exported.format, 'feed-switcher-privacy-export');
  assert.equal(exported.local.cloudConnection.accountId, syntheticAccount().accountId);
  assert.equal(text.includes(syntheticAccount().syncKey), false);
  assert.equal('syncKey' in exported.local.cloudConnection, false);
  assert.deepEqual(exported.excludedSecrets, ['syncKey']);
});

test('privacy disconnect confirmation explains lost recovery and can be cancelled', async () => {
  const h = makeHarness({ initial: { 'fs.backend-account.v1': syntheticAccount() }, confirm: () => false });
  h.load('core.js'); h.load('privacy.js'); await h.flush();
  await h.context.disconnectDevice();
  assert.match(h.calls.prompts[0], /无法重新连接/);
  assert.equal(h.calls.messages.length, 0);
  assert.equal('fs.backend-account.v1' in h.state, true);
});

test('popup consent withdrawal disables controls synchronously and busy completion cannot enable them', async () => {
  const h = makeHarness(); h.load('core.js');
  h.state['fs.privacy-consent.v1'] = h.context.FSCore.createPrivacyConsent();
  const checkbox = h.element('[data-privacy-consent]');
  const buttons = ['[data-cloud-create-account]', '[data-cloud-connect]', '[data-cloud-push]', '[data-cloud-pull]'].map(h.element);
  h.load('popup.js'); await h.flush();
  assert.equal(buttons.every((button) => !button.disabled), true);
  checkbox.checked = false;
  const pending = checkbox.listeners.change();
  assert.equal(buttons.every((button) => button.disabled), true);
  h.context.setCloudBusy(true); h.context.setCloudBusy(false);
  assert.equal(buttons.every((button) => button.disabled), true);
  await pending;
  assert.equal('fs.privacy-consent.v1' in h.state, false);
  const before = h.calls.messages.length;
  await h.context.runBackendAction('PUSH', { requiresConsent: true });
  assert.equal(h.calls.messages.length, before);
});

const test = require('node:test');
const assert = require('node:assert/strict');
const { makeHarness, syntheticAccount } = require('./helpers/extension-harness.cjs');

function installPermissionOutcome(h, outcome) {
  const calls = { contains: [], request: [] };
  h.context.chrome.permissions.contains = async ({ origins }) => {
    calls.contains.push(Array.from(origins));
    if (outcome === 'contains rejects') throw new Error('Synthetic permission API failure');
    return false;
  };
  h.context.chrome.permissions.request = async ({ origins }) => {
    calls.request.push(Array.from(origins));
    if (outcome === 'request rejects') throw new Error('Synthetic permission API failure');
    return false;
  };
  return calls;
}

function checkPermissionCalls(calls, outcome) {
  assert.deepEqual(calls.contains, [['http://127.0.0.1:8787/*']]);
  assert.deepEqual(calls.request, outcome === 'contains rejects' ? [] : [['http://127.0.0.1:8787/*']]);
}

for (const outcome of ['contains rejects', 'request rejects', 'request returns false (simulated denial)']) {
  test(`popup handles ${outcome} without an unhandled rejection or backend action`, async () => {
    const h = makeHarness();
    h.load('core.js');
    h.state['fs.privacy-consent.v1'] = h.context.FSCore.createPrivacyConsent();
    h.element('[data-privacy-consent]');
    const status = h.element('[data-cloud-status]');
    const create = h.element('[data-cloud-create-account]');
    h.load('popup.js'); await h.flush();
    const permissions = installPermissionOutcome(h, outcome);
    const beforeMessages = h.calls.messages.length;
    const before = structuredClone(h.state);
    await assert.doesNotReject(async () => {
      assert.equal(await h.context.runBackendAction('CREATE_ACCOUNT', { requiresConsent: true }), null);
    });
    assert.equal(status.dataset.kind, 'error');
    assert.match(status.textContent, /网络权限/);
    checkPermissionCalls(permissions, outcome);
    assert.equal(create.disabled, false, 'the control remains available for an intentional retry');
    assert.equal(h.calls.messages.length, beforeMessages);
    assert.equal(h.calls.fetch.length, 0);
    assert.deepEqual(structuredClone(h.state), before);
  });

  test(`privacy deletion handles ${outcome} while retaining account and local profiles`, async () => {
    const h = makeHarness({ initial: {
      'fs.backend-account.v1': syntheticAccount(),
      'fs.profiles.v1': { schemaVersion: 1, favorites: [{ id: 'saved', name: 'Synthetic local favorite', discovery: { topic: 'science' } }], recent: [] }
    } });
    h.load('core.js');
    const status = h.element('[data-privacy-status]');
    h.load('privacy.js'); await h.flush();
    const permissions = installPermissionOutcome(h, outcome);
    const beforeMessages = h.calls.messages.length;
    const before = structuredClone(h.state);
    await assert.doesNotReject(() => h.context.deleteCloudAccount());
    assert.equal(status.dataset.kind, 'error');
    assert.match(status.textContent, /网络权限/);
    checkPermissionCalls(permissions, outcome);
    assert.equal(h.calls.messages.length, beforeMessages);
    assert.equal(h.calls.fetch.length, 0);
    assert.deepEqual(structuredClone(h.state), before);
  });
}

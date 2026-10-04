const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');

class FakeElement {
  constructor(tagName, registry) {
    this.tagName = tagName;
    this.registry = registry;
    this.id = '';
    this.dataset = {};
    this.className = '';
    this.textContent = '';
    this._innerHTML = '';
    this.listeners = {};
  }
  set innerHTML(value) { this._innerHTML = value; }
  get innerHTML() { return this._innerHTML; }
  appendChild(node) {
    if (node.id) this.registry.set(node.id, node);
    return node;
  }
  remove() {
    if (this.id) this.registry.delete(this.id);
  }
  addEventListener(name, callback) { this.listeners[name] = callback; }
  querySelectorAll() { return []; }
  querySelector(selector) {
    if (selector === '.fs-launcher') return new FakeElement('button', this.registry);
    if (selector === '.fs-panel') {
      const panel = new FakeElement('div', this.registry);
      panel.dataset.open = 'false';
      return panel;
    }
    return null;
  }
}

function makeHarness(initialEnabled = true) {
  const registry = new Map();
  const documentElement = new FakeElement('html', registry);
  const body = new FakeElement('body', registry);
  const head = new FakeElement('head', registry);
  let settings = {
    schemaVersion: 1,
    enabled: initialEnabled,
    gate: 'LEVEL_A',
    flags: {
      API_ENHANCED_SEARCH: false,
      DERIVED_METRICS: false,
      AI_TOPIC_TAGGING: false,
      HISTORICAL_TRACKING: false,
      CREATOR_RANKINGS: false,
      ALERTS: false
    }
  };
  let storageListener = null;
  let messageListener = null;
  let observerCallback = null;

  const document = {
    body,
    head,
    documentElement,
    createElement: (tag) => new FakeElement(tag, registry),
    getElementById: (id) => registry.get(id) || null,
    querySelector: () => null,
    querySelectorAll: () => []
  };

  const chrome = {
    storage: {
      local: {
        get: async () => ({ 'fs.settings.v1': settings }),
        set: async (items) => { settings = items['fs.settings.v1'] ?? settings; }
      },
      onChanged: {
        addListener: (callback) => { storageListener = callback; }
      }
    },
    runtime: {
      onInstalled: { addListener: () => {} },
      onMessage: { addListener: (callback) => { messageListener = callback; } }
    },
    tabs: { query: async () => [], sendMessage: async () => ({}) }
  };

  class MutationObserver {
    constructor(callback) { observerCallback = callback; }
    observe() {}
  }

  const context = vm.createContext({
    chrome,
    document,
    MutationObserver,
    console,
    Promise,
    Object,
    Array,
    String,
    Boolean,
    Date,
    URL,
    URLSearchParams,
    globalThis: null
  });
  context.globalThis = context;
  vm.runInContext(fs.readFileSync('src/extension/core.js', 'utf8'), context);
  const script = fs.readFileSync('src/extension/content.js', 'utf8');
  vm.runInContext(script, context);

  return {
    registry,
    async flush() { await new Promise((resolve) => setImmediate(resolve)); },
    async setEnabledViaStorage(enabled) {
      settings = { ...settings, enabled };
      storageListener?.({ 'fs.settings.v1': { newValue: settings } }, 'local');
      await this.flush();
    },
    async setEnabledViaMessage(enabled) {
      settings = { ...settings, enabled };
      let response;
      messageListener?.(
        { type: 'FS_APPLY_SETTINGS', settings },
        {},
        (value) => { response = value; }
      );
      await this.flush();
      return response;
    },
    async simulateDomMutation() {
      observerCallback?.();
      await this.flush();
    }
  };
}

test('FS UI disappears immediately when disabled via storage and does not remount on mutation', async () => {
  const h = makeHarness(true);
  await h.flush();
  assert.equal(h.registry.has('feed-switcher-root'), true);

  await h.setEnabledViaStorage(false);
  assert.equal(h.registry.has('feed-switcher-root'), false);

  await h.simulateDomMutation();
  assert.equal(h.registry.has('feed-switcher-root'), false);
});

test('FS UI appears immediately when re-enabled via storage without page refresh', async () => {
  const h = makeHarness(false);
  await h.flush();
  assert.equal(h.registry.has('feed-switcher-root'), false);

  await h.setEnabledViaStorage(true);
  assert.equal(h.registry.has('feed-switcher-root'), true);
});

test('direct message disables FS immediately and acknowledges the popup', async () => {
  const h = makeHarness(true);
  await h.flush();
  const response = await h.setEnabledViaMessage(false);
  assert.equal(h.registry.has('feed-switcher-root'), false);
  assert.equal(response.ok, true);
  assert.equal(response.enabled, false);
  assert.equal(response.version, 'FS-006');
});

test('direct message enables FS immediately and acknowledges the popup', async () => {
  const h = makeHarness(false);
  await h.flush();
  const response = await h.setEnabledViaMessage(true);
  assert.equal(h.registry.has('feed-switcher-root'), true);
  assert.equal(response.ok, true);
  assert.equal(response.enabled, true);
});

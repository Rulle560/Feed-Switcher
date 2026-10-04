const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const SOURCE = path.resolve(__dirname, '../../src/extension');
class Element {
  constructor() { this.listeners = {}; this.dataset = {}; this.disabled = false; this.checked = false; this.textContent = ''; this.hidden = false; this.value = ''; }
  addEventListener(event, callback) { this.listeners[event] = callback; }
  focus() { this.focused = true; }
  click() { return this.listeners.click?.(); }
}

function makeHarness({ initial = {}, fetchImpl, messageImpl, confirm = () => true, getHook } = {}) {
  const state = structuredClone(initial);
  const elements = new Map();
  const calls = { fetch: [], messages: [], permissions: [], prompts: [], blobs: [] };
  let messageListener;
  let getCount = 0;
  let h;
  const element = (selector) => { if (!elements.has(selector)) elements.set(selector, new Element()); return elements.get(selector); };
  class BrowserURL extends URL {
    static createObjectURL(blob) { calls.blobs.push(blob); return 'blob:synthetic-export'; }
    static revokeObjectURL() {}
  }
  const chrome = {
    storage: {
      local: {
        async get(keys) {
          if (getHook) await getHook({ state, count: ++getCount });
          const wanted = Array.isArray(keys) ? keys : typeof keys === 'string' ? [keys] : Object.keys(state);
          return Object.fromEntries(wanted.filter((key) => key in state).map((key) => [key, structuredClone(state[key])]));
        },
        async set(values) { Object.assign(state, structuredClone(values)); },
        async remove(keys) { for (const key of Array.isArray(keys) ? keys : [keys]) delete state[key]; },
        async clear() { for (const key of Object.keys(state)) delete state[key]; }
      },
      onChanged: { addListener() {} }
    },
    runtime: {
      onInstalled: { addListener() {} }, onStartup: { addListener() {} },
      onMessage: { addListener(listener) { messageListener = listener; } },
      async sendMessage(message) {
        calls.messages.push(structuredClone(message));
        if (messageImpl) return messageImpl(message, h);
        return { ok: true, status: { connected: false, remoteConfig: h.context.FSCore.createDefaultRemoteConfig() } };
      }
    },
    permissions: {
      async contains(request) { calls.permissions.push(request); return true; },
      async request(request) { calls.permissions.push(request); return true; }
    },
    tabs: { async query() { return []; }, async sendMessage() { return { ok: true }; } }
  };
  const context = vm.createContext({
    chrome, console, URL: BrowserURL, URLSearchParams, Headers, Request, Response, Blob,
    Date, Promise, structuredClone, setTimeout: (fn) => { fn(); return 0; },
    document: {
      querySelector: (selector) => elements.get(selector) || null,
      querySelectorAll: (selector) => selector === '.cloud-card button'
        ? [...elements].filter(([key]) => key.startsWith('[data-cloud-')).map(([, value]) => value)
        : selector.includes('[data-cloud-create-account]')
          ? ['[data-cloud-create-account]', '[data-cloud-connect]', '[data-cloud-push]', '[data-cloud-pull]'].map(element) : [],
      createElement: () => new Element()
    },
    confirm: (text) => { calls.prompts.push(text); return confirm(text); },
    fetch: async (url, init = {}) => {
      calls.fetch.push({ url, init });
      if (!fetchImpl) throw new Error('Unexpected network request in an offline test.');
      return fetchImpl(url, init, h);
    }
  });
  function load(name) { vm.runInContext(fs.readFileSync(path.join(SOURCE, name), 'utf8'), context, { filename: name }); }
  context.importScripts = (...names) => names.forEach(load);
  h = { context, state, calls, element, load, async flush() { await new Promise((resolve) => setImmediate(resolve)); },
    message(action) { return new Promise((resolve, reject) => {
      const handled = messageListener?.({ type: 'FS_BACKEND_COMMAND', action }, {}, resolve);
      if (!handled) reject(new Error('Background did not handle message.'));
    }); }
  };
  return h;
}

function syntheticAccount() {
  return { schemaVersion: 1, accountId: 'fixture_account', syncKey: 'fs1.fixture_account.synthetic_test_value_only', revision: 2, connectedAt: '2026-10-04T00:00:00Z', lastSyncAt: null };
}
module.exports = { makeHarness, syntheticAccount };

const test = require('node:test');
const assert = require('node:assert/strict');
require('../src/extension/core.js');

const FSCore = globalThis.FSCore;
const NOW = new Date('2026-09-19T08:00:00Z');

function discovery(overrides = {}) {
  return FSCore.normalizeDiscoverySettings({
    active: false,
    topic: 'technology',
    customTopic: '',
    language: 'en',
    region: 'US',
    timeRange: '7D',
    sort: 'RELEVANCE',
    ...overrides
  });
}

test('profile store defaults are empty and versioned', () => {
  const store = FSCore.createDefaultProfileStore();
  assert.equal(store.schemaVersion, 1);
  assert.deepEqual(store.favorites, []);
  assert.deepEqual(store.recent, []);
});

test('favorite profile is normalized, named, and deduplicated by discovery fingerprint', () => {
  let store = FSCore.addFavoriteProfile({}, discovery(), '  US Tech  ', NOW, 'profile-one');
  assert.equal(store.favorites.length, 1);
  assert.equal(store.favorites[0].name, 'US Tech');
  assert.equal(store.favorites[0].id, 'profile-one');
  assert.equal(store.favorites[0].discovery.active, false);

  store = FSCore.addFavoriteProfile(store, discovery(), 'Tech Updated', new Date('2026-09-19T09:00:00Z'), 'different-id');
  assert.equal(store.favorites.length, 1);
  assert.equal(store.favorites[0].name, 'Tech Updated');
  assert.equal(store.favorites[0].id, 'profile-one');
});

test('recent channels are deduplicated and newest-first', () => {
  let store = FSCore.recordRecentChannel({}, discovery(), NOW);
  store = FSCore.recordRecentChannel(store, discovery({ topic: 'finance' }), new Date('2026-09-19T09:00:00Z'));
  store = FSCore.recordRecentChannel(store, discovery(), new Date('2026-09-19T10:00:00Z'));
  assert.equal(store.recent.length, 2);
  assert.equal(store.recent[0].discovery.topic, 'technology');
  assert.equal(store.recent[1].discovery.topic, 'finance');
});

test('profile store enforces favorite and recent limits', () => {
  let store = FSCore.createDefaultProfileStore();
  for (let i = 0; i < 30; i += 1) {
    store = FSCore.addFavoriteProfile(store, discovery({ topic: 'custom', customTopic: `topic-${i}` }), `P${i}`, new Date(NOW.getTime() + i * 1000), `id-${i}`);
  }
  assert.equal(store.favorites.length, FSCore.MAX_FAVORITES);

  for (let i = 0; i < 12; i += 1) {
    store = FSCore.recordRecentChannel(store, discovery({ topic: 'custom', customTopic: `recent-${i}` }), new Date(NOW.getTime() + i * 1000));
  }
  assert.equal(store.recent.length, FSCore.MAX_RECENTS);
});

test('portable export round-trips through validation', () => {
  const settings = FSCore.normalizeSettings({ discovery: discovery({ topic: 'science', language: 'zh-Hans', region: 'SG' }) });
  const profiles = FSCore.addFavoriteProfile({}, settings.discovery, '科学观察', NOW, 'science-profile');
  const exported = FSCore.buildPortableExport(settings, profiles, NOW);
  const parsed = FSCore.parsePortableExport(JSON.parse(JSON.stringify(exported)), new Date('2026-09-19T11:00:00Z'));

  assert.ok(parsed);
  assert.equal(parsed.format, 'feed-switcher-local-profiles');
  assert.equal(parsed.version, 1);
  assert.equal(parsed.settings.schemaVersion, 4);
  assert.equal(parsed.profiles.favorites.length, 1);
  assert.equal(parsed.profiles.favorites[0].name, '科学观察');
});

test('portable import rejects unrelated JSON', () => {
  assert.equal(FSCore.parsePortableExport({ hello: 'world' }, NOW), null);
});

test('suggested profile name is concise and human-readable', () => {
  assert.equal(FSCore.suggestedProfileName(discovery({ topic: 'military', language: 'zh-Hant', region: 'TW' })), '军事 · 中文（繁體） · 台湾');
});


test('portable import rejects spoofed format without required settings/profiles payload', () => {
  assert.equal(FSCore.parsePortableExport({ format: 'feed-switcher-local-profiles', version: 1 }, NOW), null);
});

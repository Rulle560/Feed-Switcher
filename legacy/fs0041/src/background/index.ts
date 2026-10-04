/// <reference path="../shared/core.ts" />

chrome.runtime.onInstalled.addListener(() => {
  void (async () => {
    const settingsExisting = await chrome.storage.local.get(FSCore.STORAGE_KEY);
    const profileExisting = await chrome.storage.local.get(FSCore.PROFILE_STORE_KEY);
    const settings = FSCore.normalizeSettings(settingsExisting[FSCore.STORAGE_KEY]);
    const profiles = FSCore.normalizeProfileStore(profileExisting[FSCore.PROFILE_STORE_KEY]);

    await chrome.storage.local.set({
      [FSCore.STORAGE_KEY]: settings,
      [FSCore.PROFILE_STORE_KEY]: profiles
    });
  })();
});

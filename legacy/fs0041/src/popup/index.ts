/// <reference path="../shared/core.ts" />

async function notifyActiveTab(settings: FSCore.Settings): Promise<boolean> {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tabId = tabs[0]?.id;
    if (typeof tabId !== 'number') return false;

    const response = await chrome.tabs.sendMessage(tabId, {
      type: FSCore.MESSAGE_APPLY_SETTINGS,
      settings
    } satisfies FSCore.ApplySettingsMessage) as { ok?: boolean } | undefined;

    return response?.ok === true;
  } catch {
    return false;
  }
}

async function load(): Promise<void> {
  const [settingsData, profileData] = await Promise.all([
    chrome.storage.local.get(FSCore.STORAGE_KEY),
    chrome.storage.local.get(FSCore.PROFILE_STORE_KEY)
  ]);
  let settings = FSCore.normalizeSettings(settingsData[FSCore.STORAGE_KEY]);
  const profiles = FSCore.normalizeProfileStore(profileData[FSCore.PROFILE_STORE_KEY]);

  const gate = document.querySelector<HTMLElement>('[data-gate]');
  const toggle = document.querySelector<HTMLInputElement>('[data-enabled]');
  const flags = document.querySelector<HTMLElement>('[data-flags]');
  const syncStatus = document.querySelector<HTMLElement>('[data-sync-status]');
  const channel = document.querySelector<HTMLElement>('[data-channel]');
  const favoritesCount = document.querySelector<HTMLElement>('[data-favorites-count]');
  const recentsCount = document.querySelector<HTMLElement>('[data-recents-count]');

  if (gate) gate.textContent = settings.gate;
  if (favoritesCount) favoritesCount.textContent = String(profiles.favorites.length);
  if (recentsCount) recentsCount.textContent = String(profiles.recent.length);
  if (channel) {
    channel.textContent = settings.discovery.active
      ? FSCore.discoverySummary(settings.discovery)
      : '普通 YouTube 模式';
  }

  if (toggle) {
    toggle.checked = settings.enabled;
    toggle.addEventListener('change', async () => {
      toggle.disabled = true;
      const next = FSCore.normalizeSettings({ ...settings, enabled: toggle.checked });

      try {
        await chrome.storage.local.set({ [FSCore.STORAGE_KEY]: next });
        const synced = await notifyActiveTab(next);
        settings = next;

        if (syncStatus) {
          syncStatus.textContent = synced
            ? `页面已实时同步：${next.enabled ? '启用' : '关闭'}`
            : '当前标签页未检测到 Feed Switcher 页面脚本。';
          syncStatus.dataset.ok = synced ? 'true' : 'false';
        }
      } finally {
        toggle.disabled = false;
      }
    });
  }

  if (flags) {
    flags.textContent = Object.entries(settings.flags)
      .map(([key, value]) => `${value ? 'ON ' : 'OFF'} ${key}`)
      .join('\n');
  }
}

void load();

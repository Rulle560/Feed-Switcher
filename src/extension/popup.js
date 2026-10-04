async function notifyActiveTab(settings) {
    try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const tabId = tabs[0]?.id;
        if (typeof tabId !== 'number')
            return false;
        const response = await chrome.tabs.sendMessage(tabId, {
            type: FSCore.MESSAGE_APPLY_SETTINGS,
            settings
        });
        return response?.ok === true;
    }
    catch {
        return false;
    }
}
async function ensureBackendPermission() {
    const origins = [FSCore.BACKEND_ORIGIN_PATTERN];
    if (await chrome.permissions.contains({ origins }))
        return true;
    return chrome.permissions.request({ origins });
}
async function backendCommand(action, syncKey) {
    return chrome.runtime.sendMessage({
        type: FSCore.MESSAGE_BACKEND_COMMAND,
        action,
        ...(syncKey ? { syncKey } : {})
    });
}
function shortAccount(id) {
    if (!id)
        return '—';
    return id.length <= 12 ? id : `${id.slice(0, 6)}…${id.slice(-4)}`;
}
function fmtTime(value) {
    if (!value)
        return '尚未同步';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '尚未同步' : date.toLocaleString('zh-CN', { hour12: false });
}
function setCloudMessage(text, kind = 'info') {
    const el = document.querySelector('[data-cloud-status]');
    if (!el)
        return;
    el.textContent = text;
    el.dataset.kind = kind;
}
async function readPrivacyConsent() {
    const data = await chrome.storage.local.get(FSCore.PRIVACY_CONSENT_KEY);
    return FSCore.normalizePrivacyConsent(data[FSCore.PRIVACY_CONSENT_KEY]);
}
async function hasPrivacyConsent() {
    return FSCore.hasCurrentPrivacyConsent(await readPrivacyConsent());
}
let privacyConsentActive = false;
function setConsentGatedControlsEnabled(enabled) {
    privacyConsentActive = enabled;
    document.querySelectorAll('[data-cloud-create-account], [data-cloud-connect], [data-cloud-push], [data-cloud-pull]')
        .forEach((button) => { button.disabled = !enabled; });
}
function renderPrivacyConsent(consent) {
    const checkbox = document.querySelector('[data-privacy-consent]');
    const active = FSCore.hasCurrentPrivacyConsent(consent);
    if (checkbox)
        checkbox.checked = active;
    setConsentGatedControlsEnabled(active);
}
async function bindPrivacyConsent() {
    const checkbox = document.querySelector('[data-privacy-consent]');
    if (!checkbox)
        return;
    renderPrivacyConsent(await readPrivacyConsent());
    checkbox.addEventListener('change', async () => {
        checkbox.disabled = true;
        const requested = checkbox.checked;
        // Apply the consent gate synchronously before touching storage so a fast click
        // cannot race an in-flight chrome.storage update.
        setConsentGatedControlsEnabled(requested);
        try {
            if (requested) {
                const consent = FSCore.createPrivacyConsent();
                await chrome.storage.local.set({ [FSCore.PRIVACY_CONSENT_KEY]: consent });
                setCloudMessage(`已记录云同步数据同意（政策版本 ${FSCore.PRIVACY_POLICY_VERSION}）。`, 'success');
            }
            else {
                await chrome.storage.local.remove(FSCore.PRIVACY_CONSENT_KEY);
                setCloudMessage('已撤回云同步数据同意。上传、下载和新建/连接账号已暂停；你仍可断开或删除云端账号。', 'info');
            }
        }
        catch {
            const actual = await hasPrivacyConsent();
            renderPrivacyConsent(actual ? await readPrivacyConsent() : null);
            setCloudMessage('隐私同意状态保存失败，请重试。', 'error');
        }
        finally {
            checkbox.disabled = false;
        }
    });
}
function renderRemoteConfig(config) {
    const el = document.querySelector('[data-remote-config]');
    if (!el)
        return;
    const enabled = Object.entries(config.flags).filter(([, value]) => value).map(([key]) => key);
    el.textContent = `Server Gate: ${config.gateCeiling}\nRemote Flags ON: ${enabled.length ? enabled.join(', ') : 'none'}${config.message ? `\n${config.message}` : ''}`;
}
function renderCloud(status) {
    const badge = document.querySelector('[data-cloud-state]');
    const meta = document.querySelector('[data-cloud-meta]');
    const create = document.querySelector('[data-cloud-create]');
    const connected = document.querySelector('[data-cloud-connected]');
    const disconnectShort = document.querySelector('[data-cloud-disconnect-short]');
    if (badge) {
        badge.textContent = status.connected ? '已连接' : '未连接';
        badge.dataset.connected = status.connected ? 'true' : 'false';
    }
    if (meta) {
        meta.textContent = status.connected
            ? `账号 ${shortAccount(status.accountId)} · 云端 r${status.revision} · ${fmtTime(status.lastSyncAt)}`
            : '本地模式 · 云同步未启用';
    }
    if (create)
        create.hidden = status.connected;
    if (connected)
        connected.hidden = !status.connected;
    if (disconnectShort)
        disconnectShort.hidden = !status.connected;
    renderRemoteConfig(status.remoteConfig);
}
async function refreshCloudStatus() {
    try {
        const response = await backendCommand('STATUS');
        if (response.status)
            renderCloud(response.status);
    }
    catch {
        setCloudMessage('无法读取 Backend Lite 状态。', 'error');
    }
}
async function refreshLocalSummary() {
    const [settingsData, profileData] = await Promise.all([
        chrome.storage.local.get(FSCore.STORAGE_KEY),
        chrome.storage.local.get(FSCore.PROFILE_STORE_KEY)
    ]);
    const settings = FSCore.normalizeSettings(settingsData[FSCore.STORAGE_KEY]);
    const profiles = FSCore.normalizeProfileStore(profileData[FSCore.PROFILE_STORE_KEY]);
    const channel = document.querySelector('[data-channel]');
    const favoritesCount = document.querySelector('[data-favorites-count]');
    const recentsCount = document.querySelector('[data-recents-count]');
    if (favoritesCount)
        favoritesCount.textContent = String(profiles.favorites.length);
    if (recentsCount)
        recentsCount.textContent = String(profiles.recent.length);
    if (channel)
        channel.textContent = settings.discovery.active ? FSCore.discoverySummary(settings.discovery) : '普通 YouTube 模式';
}
function setCloudBusy(busy) {
    document.querySelectorAll('.cloud-card button').forEach((button) => { button.disabled = busy; });
    if (!busy)
        setConsentGatedControlsEnabled(privacyConsentActive);
}
async function runBackendAction(action, opts = {}) {
    if (opts.requiresConsent === true) {
        // Two checks by design: immediate UI state closes the race window, while the
        // storage read is the authoritative persisted consent used by the service worker.
        const persistedConsent = await hasPrivacyConsent();
        if (!privacyConsentActive || !persistedConsent) {
            setConsentGatedControlsEnabled(false);
            setCloudMessage('请先勾选并同意“云同步数据说明”，再执行该操作。', 'error');
            document.querySelector('[data-privacy-consent]')?.focus();
            return null;
        }
    }
    if (opts.needsPermission !== false) {
        const granted = await ensureBackendPermission();
        if (!granted) {
            setCloudMessage('未授予 Backend Lite 网络权限，操作已取消。', 'error');
            return null;
        }
    }
    setCloudBusy(true);
    setCloudMessage('处理中…', 'info');
    try {
        const response = await backendCommand(action, opts.key);
        if (response.status)
            renderCloud(response.status);
        if (response.ok) {
            await refreshLocalSummary();
            setCloudMessage(response.message || '操作完成。', opts.successKind || 'success');
        }
        else
            setCloudMessage(response.message || response.error || '操作失败。', 'error');
        return response;
    }
    catch {
        setCloudMessage(`无法连接 ${FSCore.BACKEND_ORIGIN}。请先启动 FS-006 Backend Lite。`, 'error');
        return null;
    }
    finally {
        setCloudBusy(false);
    }
}
function bindCloudControls() {
    document.querySelector('[data-cloud-create-account]')?.addEventListener('click', async () => {
        const response = await runBackendAction('CREATE_ACCOUNT', { requiresConsent: true });
        const key = response?.status?.syncKey;
        if (response?.ok && key) {
            try {
                await navigator.clipboard.writeText(key);
                setCloudMessage('账号已创建，同步密钥已复制。请妥善保存，遗失后无法找回。', 'success');
            }
            catch {
                setCloudMessage(`账号已创建。请点击“复制同步密钥”并妥善保存。`, 'success');
            }
        }
    });
    document.querySelector('[data-cloud-connect]')?.addEventListener('click', async () => {
        const input = document.querySelector('[data-cloud-key-input]');
        const key = input?.value.trim() || '';
        if (!key) {
            setCloudMessage('请输入已有同步密钥。', 'error');
            input?.focus();
            return;
        }
        const response = await runBackendAction('CONNECT_ACCOUNT', { key, requiresConsent: true });
        if (response?.ok && input)
            input.value = '';
    });
    document.querySelector('[data-cloud-push]')?.addEventListener('click', () => void runBackendAction('PUSH', { requiresConsent: true }));
    document.querySelector('[data-cloud-pull]')?.addEventListener('click', () => void runBackendAction('PULL', { requiresConsent: true }));
    document.querySelector('[data-cloud-refresh]')?.addEventListener('click', () => void runBackendAction('REFRESH_CONFIG'));
    document.querySelector('[data-cloud-copy]')?.addEventListener('click', async () => {
        const response = await runBackendAction('COPY_KEY', { needsPermission: false, successKind: 'info' });
        const key = response?.status?.syncKey;
        if (!key)
            return;
        try {
            await navigator.clipboard.writeText(key);
            setCloudMessage('同步密钥已复制。任何拿到密钥的人都可访问你的同步数据，请勿公开。', 'success');
        }
        catch {
            setCloudMessage('浏览器未允许复制，请稍后重试。', 'error');
        }
    });
    const disconnect = async () => {
        if (!confirm('断开本设备会移除本机保存的同步密钥。若你尚未另行保存该密钥，将无法重新连接这个云端账号。确认已保存并继续断开？'))
            return;
        await runBackendAction('DISCONNECT', { needsPermission: false });
    };
    document.querySelectorAll('[data-cloud-disconnect], [data-cloud-disconnect-short]')
        .forEach((button) => button.addEventListener('click', () => void disconnect()));
    document.querySelector('[data-cloud-delete]')?.addEventListener('click', async () => {
        if (!confirm('确认删除云端同步账号和云端备份？本机收藏不会删除。此操作不可撤销。'))
            return;
        await runBackendAction('DELETE_ACCOUNT');
    });
}
async function load() {
    const [settingsData, profileData, remoteData] = await Promise.all([
        chrome.storage.local.get(FSCore.STORAGE_KEY),
        chrome.storage.local.get(FSCore.PROFILE_STORE_KEY),
        chrome.storage.local.get(FSCore.REMOTE_CONFIG_KEY)
    ]);
    let settings = FSCore.normalizeSettings(settingsData[FSCore.STORAGE_KEY]);
    const profiles = FSCore.normalizeProfileStore(profileData[FSCore.PROFILE_STORE_KEY]);
    const remoteConfig = FSCore.normalizeRemoteConfig(remoteData[FSCore.REMOTE_CONFIG_KEY]);
    const gate = document.querySelector('[data-gate]');
    const toggle = document.querySelector('[data-enabled]');
    const flags = document.querySelector('[data-flags]');
    const syncStatus = document.querySelector('[data-sync-status]');
    const channel = document.querySelector('[data-channel]');
    const favoritesCount = document.querySelector('[data-favorites-count]');
    const recentsCount = document.querySelector('[data-recents-count]');
    if (gate)
        gate.textContent = FSCore.effectiveGate(settings.gate, remoteConfig.gateCeiling);
    if (favoritesCount)
        favoritesCount.textContent = String(profiles.favorites.length);
    if (recentsCount)
        recentsCount.textContent = String(profiles.recent.length);
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
            }
            finally {
                toggle.disabled = false;
            }
        });
    }
    if (flags) {
        const effective = FSCore.effectiveFeatureFlags(settings.flags, remoteConfig.flags);
        flags.textContent = Object.entries(effective)
            .map(([key, value]) => `${value ? 'ON ' : 'OFF'} ${key}`)
            .join('\n');
    }
    renderRemoteConfig(remoteConfig);
    await bindPrivacyConsent();
    bindCloudControls();
    await refreshCloudStatus();
}
void load();

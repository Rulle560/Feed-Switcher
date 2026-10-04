function setStatus(text, kind = 'info') {
    const el = document.querySelector('[data-privacy-status]');
    if (!el)
        return;
    el.textContent = text;
    el.dataset.kind = kind;
}
async function backendCommand(action) {
    return chrome.runtime.sendMessage({
        type: FSCore.MESSAGE_BACKEND_COMMAND,
        action
    });
}
async function ensureBackendPermission() {
    const origins = [FSCore.BACKEND_ORIGIN_PATTERN];
    if (await chrome.permissions.contains({ origins }))
        return true;
    return chrome.permissions.request({ origins });
}
function safeAccountMeta(account) {
    if (!account)
        return null;
    return {
        accountId: account.accountId,
        revision: account.revision,
        connectedAt: account.connectedAt,
        lastSyncAt: account.lastSyncAt,
        syncKeyStoredLocally: true
    };
}
async function readLocalState() {
    const data = await chrome.storage.local.get([
        FSCore.STORAGE_KEY,
        FSCore.PROFILE_STORE_KEY,
        FSCore.BACKEND_ACCOUNT_KEY,
        FSCore.PRIVACY_CONSENT_KEY,
        FSCore.REMOTE_CONFIG_KEY
    ]);
    return {
        settings: FSCore.normalizeSettings(data[FSCore.STORAGE_KEY]),
        profiles: FSCore.normalizeProfileStore(data[FSCore.PROFILE_STORE_KEY]),
        account: FSCore.normalizeBackendAccount(data[FSCore.BACKEND_ACCOUNT_KEY]),
        consent: FSCore.normalizePrivacyConsent(data[FSCore.PRIVACY_CONSENT_KEY]),
        remoteConfig: FSCore.normalizeRemoteConfig(data[FSCore.REMOTE_CONFIG_KEY])
    };
}
async function renderState() {
    const state = await readLocalState();
    const local = document.querySelector('[data-local-summary]');
    const cloud = document.querySelector('[data-cloud-summary]');
    const consent = document.querySelector('[data-consent-summary]');
    if (local) {
        local.textContent = [
            `当前频道：${state.settings.discovery.active ? FSCore.discoverySummary(state.settings.discovery) : '普通 YouTube 模式'}`,
            `收藏频道：${state.profiles.favorites.length}`,
            `最近使用：${state.profiles.recent.length}`,
            `本机启用状态：${state.settings.enabled ? '开启' : '关闭'}`
        ].join('\n');
    }
    if (cloud) {
        cloud.textContent = state.account
            ? `已连接匿名同步账号 ${state.account.accountId.slice(0, 6)}… · 云端 r${state.account.revision}\n同步密钥仅保存在本机扩展存储；服务端仅保存 secret 哈希。`
            : '未连接云同步账号。';
    }
    if (consent) {
        consent.textContent = state.consent
            ? `已同意云同步数据说明 · ${state.consent.cloudSyncAcceptedAt}\n政策版本：${state.consent.policyVersion}`
            : `尚未同意云同步数据说明 · 当前政策版本 ${FSCore.PRIVACY_POLICY_VERSION}`;
    }
}
function downloadJson(filename, value) {
    const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
}
async function exportLocalData() {
    const state = await readLocalState();
    const exported = {
        format: 'feed-switcher-privacy-export',
        version: 1,
        exportedAt: new Date().toISOString(),
        policyVersion: FSCore.PRIVACY_POLICY_VERSION,
        local: {
            settings: state.settings,
            profiles: state.profiles,
            privacyConsent: state.consent,
            cloudConnection: safeAccountMeta(state.account),
            remoteConfig: state.remoteConfig
        },
        excludedSecrets: ['syncKey']
    };
    downloadJson(`feed-switcher-privacy-export-${new Date().toISOString().slice(0, 10)}.json`, exported);
    setStatus('本机数据摘要已导出。出于安全原因，导出文件不包含同步密钥。', 'success');
}
async function disconnectDevice() {
    const state = await readLocalState();
    if (!state.account) {
        setStatus('当前设备没有连接云同步账号。', 'info');
        return;
    }
    if (!confirm('断开本设备会移除本机保存的同步密钥，但不会删除本地收藏、最近使用或云端账号。若你未另行保存同步密钥，之后将无法重新连接该云端账号。确认继续？'))
        return;
    try {
        const response = await backendCommand('DISCONNECT');
        if (!response.ok)
            throw new Error(response.message || response.error || '断开失败');
        setStatus('本设备已断开云同步；本地频道数据与云端账号均保留。', 'success');
        await renderState();
    }
    catch (error) {
        const text = error instanceof Error ? error.message : '断开失败';
        setStatus(`断开失败：${text}`, 'error');
    }
}
async function deleteCloudAccount() {
    const state = await readLocalState();
    if (!state.account) {
        setStatus('当前设备没有连接云同步账号。', 'info');
        return;
    }
    if (!confirm('这会永久删除云端同步账号及云端频道备份，并移除本机保存的同步密钥。本地收藏与最近使用不会删除。确认继续？'))
        return;
    if (!(await ensureBackendPermission())) {
        setStatus('未授予 Backend Lite 网络权限，无法提交云端删除请求。', 'error');
        return;
    }
    try {
        const response = await backendCommand('DELETE_ACCOUNT');
        if (!response.ok)
            throw new Error(response.message || response.error || '删除失败');
        setStatus('云端同步账号及云端备份已删除；本地频道数据保留。', 'success');
        await renderState();
    }
    catch (error) {
        const text = error instanceof Error ? error.message : '删除失败';
        setStatus(`云端删除失败：${text}`, 'error');
    }
}
async function clearLocalData() {
    const state = await readLocalState();
    const cloudWarning = state.account
        ? '\n\n注意：当前设备仍连接一个云端账号。只清除本机数据不会删除云端备份；如需彻底删除，请先执行“删除云端账号”。'
        : '';
    if (!confirm(`这会清除本机 Feed Switcher 的设置、收藏、最近使用、同步密钥、缓存 Gate 和隐私同意记录。${cloudWarning}\n\n确认清除本机数据？`))
        return;
    await chrome.storage.local.clear();
    await chrome.storage.local.set({
        [FSCore.STORAGE_KEY]: FSCore.createDefaultSettings(),
        [FSCore.PROFILE_STORE_KEY]: FSCore.createDefaultProfileStore(),
        [FSCore.REMOTE_CONFIG_KEY]: FSCore.createDefaultRemoteConfig()
    });
    setStatus('本机 Feed Switcher 数据已清除并恢复默认设置。', 'success');
    await renderState();
}
async function init() {
    const version = document.querySelector('[data-policy-version]');
    if (version)
        version.textContent = FSCore.PRIVACY_POLICY_VERSION;
    document.querySelector('[data-export-local]')?.addEventListener('click', () => void exportLocalData());
    document.querySelector('[data-disconnect-device]')?.addEventListener('click', () => void disconnectDevice());
    document.querySelector('[data-delete-cloud]')?.addEventListener('click', () => void deleteCloudAccount());
    document.querySelector('[data-clear-local]')?.addEventListener('click', () => void clearLocalData());
    await renderState();
}
void init();

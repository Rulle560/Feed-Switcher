'use strict';
importScripts('core.js');
async function readState() {
    const data = await chrome.storage.local.get([
        FSCore.STORAGE_KEY,
        FSCore.PROFILE_STORE_KEY,
        FSCore.BACKEND_ACCOUNT_KEY,
        FSCore.REMOTE_CONFIG_KEY,
        FSCore.PRIVACY_CONSENT_KEY
    ]);
    return {
        settings: FSCore.normalizeSettings(data[FSCore.STORAGE_KEY]),
        profiles: FSCore.normalizeProfileStore(data[FSCore.PROFILE_STORE_KEY]),
        account: FSCore.normalizeBackendAccount(data[FSCore.BACKEND_ACCOUNT_KEY]),
        remoteConfig: FSCore.normalizeRemoteConfig(data[FSCore.REMOTE_CONFIG_KEY]),
        privacyConsent: FSCore.normalizePrivacyConsent(data[FSCore.PRIVACY_CONSENT_KEY])
    };
}
function apiUrl(path) {
    return `${FSCore.BACKEND_ORIGIN}${path}`;
}
async function apiRequest(path, init = {}, syncKey) {
    const headers = new Headers(init.headers || {});
    headers.set('accept', 'application/json');
    headers.set('x-fs-client-version', FSCore.CLIENT_VERSION);
    if (init.body && !headers.has('content-type'))
        headers.set('content-type', 'application/json');
    if (syncKey)
        headers.set('authorization', `Bearer ${syncKey}`);
    const response = await fetch(apiUrl(path), { ...init, headers });
    let data = {};
    try {
        data = await response.json();
    }
    catch {
        data = {};
    }
    return { response, data };
}
async function refreshRemoteConfig() {
    const { response, data } = await apiRequest('/v1/config');
    if (!response.ok || !data.config)
        throw new Error('远程配置读取失败');
    const config = FSCore.normalizeRemoteConfig({ ...data.config, fetchedAt: new Date().toISOString() });
    await chrome.storage.local.set({ [FSCore.REMOTE_CONFIG_KEY]: config });
    return config;
}
async function saveAccount(account) {
    if (account)
        await chrome.storage.local.set({ [FSCore.BACKEND_ACCOUNT_KEY]: account });
    else
        await chrome.storage.local.remove(FSCore.BACKEND_ACCOUNT_KEY);
}
async function getBackendStatus(includeKey = false) {
    const state = await readState();
    return {
        connected: !!state.account,
        accountId: state.account?.accountId || null,
        revision: state.account?.revision || 0,
        lastSyncAt: state.account?.lastSyncAt || null,
        remoteConfig: state.remoteConfig,
        ...(includeKey && state.account ? { syncKey: state.account.syncKey } : {})
    };
}
async function hasFreshPrivacyConsent() {
    const data = await chrome.storage.local.get(FSCore.PRIVACY_CONSENT_KEY);
    return FSCore.hasCurrentPrivacyConsent(data[FSCore.PRIVACY_CONSENT_KEY]);
}
function privacyConsentRequiredResponse() {
    return { ok: false, error: 'privacy_consent_required', message: '请先同意当前版本的云同步数据说明。' };
}
async function handleBackendCommand(message) {
    const action = message.action;
    const requiresConsent = action === 'CREATE_ACCOUNT' || action === 'CONNECT_ACCOUNT' || action === 'PUSH' || action === 'PULL';
    if (requiresConsent && !(await hasFreshPrivacyConsent()))
        return privacyConsentRequiredResponse();
    if (action === 'STATUS')
        return { ok: true, status: await getBackendStatus(false) };
    if (action === 'COPY_KEY')
        return { ok: true, status: await getBackendStatus(true) };
    if (action === 'DISCONNECT') {
        await saveAccount(null);
        return { ok: true, status: await getBackendStatus(false), message: '本设备已断开云同步。' };
    }
    if (action === 'REFRESH_CONFIG') {
        const remoteConfig = await refreshRemoteConfig();
        return { ok: true, remoteConfig, status: await getBackendStatus(false), message: '远程 Gate / Feature Flag 已刷新。' };
    }
    if (action === 'CREATE_ACCOUNT') {
        if (!(await hasFreshPrivacyConsent()))
            return privacyConsentRequiredResponse();
        const { response, data } = await apiRequest('/v1/accounts', { method: 'POST' });
        if (!response.ok || typeof data.accountId !== 'string' || typeof data.syncKey !== 'string') {
            throw new Error('创建同步账号失败');
        }
        const now = new Date().toISOString();
        const account = FSCore.normalizeBackendAccount({
            schemaVersion: 1,
            accountId: data.accountId,
            syncKey: data.syncKey,
            revision: typeof data.revision === 'number' ? data.revision : 0,
            connectedAt: now,
            lastSyncAt: null
        });
        if (!account)
            throw new Error('服务端返回了无效账号');
        await saveAccount(account);
        const remoteConfig = await refreshRemoteConfig();
        return { ok: true, created: true, remoteConfig, status: await getBackendStatus(true), message: '同步账号已创建，请保存同步密钥。' };
    }
    if (action === 'CONNECT_ACCOUNT') {
        if (!(await hasFreshPrivacyConsent()))
            return privacyConsentRequiredResponse();
        const syncKey = typeof message.syncKey === 'string' ? message.syncKey.trim() : '';
        const parsed = FSCore.normalizeBackendAccount({
            schemaVersion: 1,
            accountId: syncKey.split('.')[1] || '',
            syncKey,
            revision: 0,
            connectedAt: new Date().toISOString(),
            lastSyncAt: null
        });
        if (!parsed)
            throw new Error('同步密钥格式不正确');
        const { response, data } = await apiRequest('/v1/me', { method: 'GET' }, syncKey);
        if (response.status === 401)
            throw new Error('同步密钥无效或账号已删除');
        if (!response.ok || typeof data.accountId !== 'string')
            throw new Error('验证同步账号失败');
        const account = FSCore.normalizeBackendAccount({
            ...parsed,
            accountId: data.accountId,
            revision: typeof data.revision === 'number' ? data.revision : 0
        });
        if (!account)
            throw new Error('服务端账号信息异常');
        await saveAccount(account);
        await refreshRemoteConfig();
        return { ok: true, status: await getBackendStatus(false), message: '同步账号连接成功。' };
    }
    const state = await readState();
    if (!state.account)
        throw new Error('请先创建或连接同步账号');
    if (action === 'PUSH') {
        if (!(await hasFreshPrivacyConsent()))
            return privacyConsentRequiredResponse();
        const payload = FSCore.buildSyncPayload(state.settings, state.profiles);
        const { response, data } = await apiRequest('/v1/sync', {
            method: 'PUT',
            body: JSON.stringify({ baseRevision: state.account.revision, data: payload })
        }, state.account.syncKey);
        if (response.status === 409) {
            const currentRevision = typeof data.currentRevision === 'number' ? data.currentRevision : state.account.revision;
            return { ok: false, conflict: true, currentRevision, status: await getBackendStatus(false), message: `云端版本较新（r${currentRevision}）。为避免覆盖，请先“下载云端”。` };
        }
        if (!response.ok || typeof data.revision !== 'number')
            throw new Error('上传云端失败');
        const account = {
            ...state.account,
            revision: data.revision,
            lastSyncAt: new Date().toISOString()
        };
        await saveAccount(account);
        return { ok: true, status: await getBackendStatus(false), message: `上传成功 · 云端版本 r${account.revision}` };
    }
    if (action === 'PULL') {
        if (!(await hasFreshPrivacyConsent()))
            return privacyConsentRequiredResponse();
        const { response, data } = await apiRequest('/v1/sync', { method: 'GET' }, state.account.syncKey);
        if (response.status === 401)
            throw new Error('同步账号已失效，请重新连接');
        if (!response.ok)
            throw new Error('下载云端失败');
        const revision = typeof data.revision === 'number' ? data.revision : 0;
        if (!data.data) {
            const account = { ...state.account, revision, lastSyncAt: new Date().toISOString() };
            await saveAccount(account);
            return { ok: true, empty: true, status: await getBackendStatus(false), message: '云端尚无备份，请先上传本机。' };
        }
        const applied = FSCore.applySyncPayload(state.settings, data.data);
        if (!applied)
            throw new Error('云端数据格式无效，未覆盖本机');
        const account = { ...state.account, revision, lastSyncAt: new Date().toISOString() };
        await chrome.storage.local.set({
            [FSCore.STORAGE_KEY]: applied.settings,
            [FSCore.PROFILE_STORE_KEY]: applied.profiles,
            [FSCore.BACKEND_ACCOUNT_KEY]: account
        });
        return { ok: true, status: await getBackendStatus(false), message: `下载成功 · 已恢复云端版本 r${revision}` };
    }
    if (action === 'DELETE_ACCOUNT') {
        const { response } = await apiRequest('/v1/account', { method: 'DELETE' }, state.account.syncKey);
        if (!response.ok && response.status !== 401)
            throw new Error('删除云端账号失败');
        await saveAccount(null);
        return { ok: true, status: await getBackendStatus(false), message: '云端账号与同步数据已删除。' };
    }
    throw new Error('不支持的后台操作');
}
chrome.runtime.onInstalled.addListener(() => {
    void (async () => {
        const state = await readState();
        await chrome.storage.local.set({
            [FSCore.STORAGE_KEY]: state.settings,
            [FSCore.PROFILE_STORE_KEY]: state.profiles,
            [FSCore.REMOTE_CONFIG_KEY]: state.remoteConfig
        });
    })();
});
chrome.runtime.onStartup.addListener(() => {
    void (async () => {
        const state = await readState();
        if (!state.account)
            return;
        try {
            await refreshRemoteConfig();
        }
        catch { /* offline-first: keep cached safe config */ }
    })();
});
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!FSCore.isBackendCommandMessage(message))
        return;
    void handleBackendCommand(message)
        .then((result) => sendResponse(result))
        .catch((error) => {
        const text = error instanceof Error ? error.message : '后台操作失败';
        sendResponse({ ok: false, error: text, message: text });
    });
    return true;
});
